/* ═══════════════════════════════════════
   AdMate Help Center — app.js
═══════════════════════════════════════ */

const ADMIN = { id: 'admin', pw: 'admate2025' };

const CATS = [
  { id: 'facebook',  label: 'Facebook',    icon: '📘', color: '#1877F2', bg: '#E7F0FD', desc: '캠페인 설정, 픽셀, 맞춤 타겟 관리' },
  { id: 'instagram', label: 'Instagram',   icon: '📸', color: '#E1306C', bg: '#FDE8EF', desc: '쇼핑 태그, 스토리 광고, 인사이트' },
  { id: 'twitter',   label: 'X (Twitter)', icon: '🐦', color: '#14171A', bg: '#E7E8E8', desc: '프로모션, 트위터 카드, 타겟팅' },
  { id: 'google',    label: 'Google Ads',  icon: '🔍', color: '#4285F4', bg: '#E8F0FE', desc: '검색광고, 디스플레이, 전환 추적' },
];

/* ─── 튜토리얼 모드 문서 ───
   단계별 가이드(steps)가 있는 모든 문서는 문서 페이지에서
     · Video Guide(요약/요약 미디어)를 표시하지 않고
     · steps로부터 자동 생성된 튜토리얼을 노출한다.
     · 단계별 가이드 원본은 관리자에게만 보인다.
   steps를 수정하면 튜토리얼도 자동으로 갱신된다.
   steps가 없는 문서(예정/준비 중 문서)는 기존 방식 그대로 표시된다. */

/* ─── 튜토리얼 스포트라이트 수동 좌표 (선택) ───
   스포트라이트는 기본적으로 각 step에 저장된 spots(관리자 "자동 생성" 버튼으로 OCR 생성)를 사용한다.
   자동 인식이 어긋나는 문서만 여기에 제목별로 수동 좌표를 넣으면 데이터보다 우선 적용된다.
   형식: '문서 제목': [ { card:'below|above|right|left', rects:[{x,y,w,h,label,labelPos?}] }, ... ] (steps 순서, % 좌표) */
const TUTORIAL_SPOTS = {};

function isTutorialArticle(art) {
  return !!art && (art.steps || []).some(s => (s.text && s.text.trim()) || (s.media || []).length > 0);
}

/* ─── 상태 ─── */
let articles         = {};
let isAdmin          = false;
let currentPage      = 'home';
let currentCat       = null;
let currentArticleId = null;
let isEditMode       = false;
let pendingDeleteId  = null;
let toastTimer       = null;
let wSteps           = [{ text: '', media: [] }];
let wMedia           = [];
let wExcerptMedia    = [];
let tutIdx           = 0;      /* 문서 튜토리얼 현재 단계 */
let tutSeenId        = null;   /* 자동 시작을 이미 한 문서 id (재렌더 시 중복 시작 방지) */
let tutZoom          = 1;      /* 스포트라이트 줌 배율 (스텝 이동 시 100%로 초기화) */
const TUT_ZOOM_MAX   = 2.6;    /* 최대 확대 */
const TUT_ZOOM_STEP  = 0.4;    /* 버튼/키 1회 확대·축소 폭 */

/* ─── 유틸 ─── */
function nl2br(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

function escHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildMediaPreviewEl(m, pw, ph) {
  if (m.type === 'image') return `<img src="${m.url}" alt="" style="width:${pw};height:${ph}">`;
  if (m.type === 'video') return `<video src="${m.url}" muted style="width:${pw};height:${ph}"></video>`;
  return `<div class="file-attachment-preview"><span class="file-icon">📎</span><span class="file-name">${escHtml(m.name || '첨부파일')}</span></div>`;
}

function buildArticleMediaEl(m, style) {
  if (m.type === 'image') return `<img src="${m.url}" alt="" style="${style || ''}">`;
  if (m.type === 'video') return `<video src="${m.url}" controls style="${style || ''}"></video>`;
  return `<a class="file-attachment-link" href="${m.url}" download="${escHtml(m.name || '')}" target="_blank" rel="noopener">
    <span class="file-icon">📎</span>
    <span class="file-name">${escHtml(m.name || '첨부파일')}</span>
  </a>`;
}

/* ─── API ─── */
async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('업로드 실패');
  return res.json();
}

async function deleteFile(url) {
  await fetch('/api/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }).catch(() => {});
}

/* ─── 로딩 ─── */
function showLoading(on) {
  let el = document.getElementById('global-loading');
  if (on) {
    if (!el) { el = document.createElement('div'); el.id = 'global-loading'; el.innerHTML = '<div class="loading-spinner"></div>'; document.body.appendChild(el); }
    el.style.display = 'flex';
  } else {
    if (el) el.style.display = 'none';
  }
}

/* ─── 데이터 로드 ─── */
async function loadArticles() {
  showLoading(true);
  try {
    articles = await api('GET', '/api/articles');
  } catch (e) {
    showToast('⚠️ 서버 연결 실패. npm start를 확인하세요.');
    articles = {};
  } finally {
    showLoading(false);
  }
}

/* ─── HASH ROUTING ─── */
function buildHash(page, catId, artId) {
  if (page === 'home')     return '#/';
  if (page === 'category') return '#/category/' + catId;
  if (page === 'article')  return '#/article/' + catId + '/' + artId;
  return '#/';
}

function pushHash(page, catId, artId) {
  const h = buildHash(page, catId, artId);
  if (location.hash !== h) history.pushState(null, '', h);
}

function parseHash() {
  const parts = (location.hash || '#/').replace('#/', '').split('/').filter(Boolean);
  if (!parts.length) return { page: 'home' };
  if (parts[0] === 'category' && parts[1]) return { page: 'category', catId: parts[1] };
  if (parts[0] === 'article' && parts[1] && parts[2]) return { page: 'article', catId: parts[1], artId: parseInt(parts[2]) };
  return { page: 'home' };
}

function getArticleUrl(catId, artId) {
  return location.origin + location.pathname + buildHash('article', catId, artId);
}

/* ─── NAV ─── */
function updateNav() {
  document.getElementById('admin-badge').style.display      = isAdmin ? 'inline-flex' : 'none';
  document.getElementById('btn-admin-login').style.display  = isAdmin ? 'none' : 'inline-flex';
  document.getElementById('btn-admin-pw').style.display     = isAdmin ? 'inline-flex' : 'none';
  document.getElementById('btn-admin-logout').style.display = isAdmin ? 'inline-flex' : 'none';
  document.querySelectorAll('.nav-link[data-cat]').forEach(el =>
    el.classList.toggle('active', el.dataset.cat === currentCat && currentPage === 'category')
  );
  const bw = document.getElementById('btn-write-new');
  if (bw) bw.style.display = isAdmin ? 'flex' : 'none';
}

/* ─── NAVIGATE ─── */
function navigate(page, catId, skipHash) {
  if (page !== 'article' && typeof isArtTutOpen === 'function' && isArtTutOpen()) closeArtTut();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  currentPage = page;
  if (catId) currentCat = catId;
  if (!skipHash) pushHash(page, catId, currentArticleId);

  if (page === 'home') {
    document.getElementById('page-home').classList.add('active');
    renderHome();
  } else if (page === 'category') {
    document.getElementById('page-category').classList.add('active');
    document.getElementById('cat-search-input').value = '';
    renderCategoryPage();
  } else if (page === 'article') {
    document.getElementById('page-article').classList.add('active');
    renderArticlePage();
  } else if (page === 'write') {
    if (!isAdmin) { openLoginModal(); return; }
    document.getElementById('page-write').classList.add('active');
    initWriteForm();
  } else if (page === 'edit') {
    if (!isAdmin) return;
    document.getElementById('page-write').classList.add('active');
    initEditForm();
  }
  updateNav();
}

/* ─── HOME ─── */
/* 숨김 문서는 관리자에게만 보인다 */
function isArticleVisible(a) { return isAdmin || !a.hidden; }
function visibleArticles(catId) { return (articles[catId] || []).filter(isArticleVisible); }

function renderHome() {
  renderHomeCats();
  renderHomeArticles();
  const total = CATS.reduce((s, cat) => s + visibleArticles(cat.id).length, 0);
  document.getElementById('total-count').textContent = '총 ' + total + '개 문서';
}

function renderHomeCats() {
  document.getElementById('home-cat-grid').innerHTML = CATS.map(cat => {
    const cnt = visibleArticles(cat.id).length;
    return `<div class="cat-card" style="--cat-color:${cat.color}" onclick="navigate('category','${cat.id}')">
      <div class="cat-icon-wrap" style="background:${cat.bg}">${cat.icon}</div>
      <div class="cat-title">${cat.label}</div>
      <div class="cat-desc">${cat.desc}</div>
      <div class="cat-foot">
        <div class="cat-count">${cnt}개 문서</div>
        <div class="cat-arrow">→</div>
      </div>
    </div>`;
  }).join('');
}

function renderHomeArticles() {
  const all = CATS.flatMap(cat => visibleArticles(cat.id).map(a => ({ ...a, cat })));
  all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  document.getElementById('home-art-grid').innerHTML = all.slice(0, 6).map(a => artCardHTML(a, a.cat)).join('');
}

/* ─── CATEGORY ─── */
function renderCategoryPage() {
  const cat = CATS.find(c => c.id === currentCat);
  if (!cat) return;
  document.getElementById('cat-bc-current').textContent  = cat.label;
  document.getElementById('cat-page-icon').textContent   = cat.icon;
  document.getElementById('cat-page-title').textContent  = cat.label;
  document.getElementById('btn-write-new').style.display = isAdmin ? 'flex' : 'none';
  renderCategorySimulator();
  renderCategoryArticles();
}

const X_LOGO_SVG = '<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';

/* twitter 카테고리에만 X 캠페인 셋팅 시뮬레이터 배너 노출 */
function renderCategorySimulator() {
  const wrap = document.getElementById('cat-simulator');
  if (!wrap) return;
  if (currentCat !== 'twitter') { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div class="sim-banner">
      <div class="sim-banner-glow"></div>
      <div class="sim-banner-main">
        <div class="sim-banner-logo">${X_LOGO_SVG}</div>
        <div class="sim-banner-copy">
          <div class="sim-banner-badge">CAMPAIGN SIMULATOR</div>
          <div class="sim-banner-title">X 캠페인 셋팅 시뮬레이터</div>
          <div class="sim-banner-desc">실제 X&nbsp;Ads 캠페인 생성 과정을 단계별로 체험해 보세요. 목표 · 예산 · 타겟팅 설정을 미리 연습하고 예상 도달을 확인할 수 있습니다.</div>
        </div>
      </div>
      <div class="sim-banner-btns">
        <a class="sim-banner-btn tut" href="/x-tutorial/">튜토리얼 시작하기 <span class="sim-banner-arrow">→</span></a>
        <a class="sim-banner-btn" href="/simulator/">시뮬레이터 시작하기 <span class="sim-banner-arrow">→</span></a>
      </div>
    </div>`;
}

function renderCategoryArticles() {
  const cat = CATS.find(c => c.id === currentCat);
  const q   = (document.getElementById('cat-search-input').value || '').toLowerCase();
  const list = visibleArticles(currentCat).filter(a => !q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q));
  document.getElementById('cat-page-sub').textContent = visibleArticles(currentCat).length + '개 문서 · 도움말 아티클';
  const grid = document.getElementById('cat-art-grid');
  const empty = document.getElementById('cat-empty');
  if (!list.length) { grid.innerHTML = ''; empty.style.display = 'block'; }
  else { empty.style.display = 'none'; grid.innerHTML = list.map(a => artCardHTML(a, cat)).join(''); }
}

function artCardHTML(a, cat) {
  const hiddenBadge = (isAdmin && a.hidden) ? '<span class="art-hidden-badge">🙈 숨김</span>' : '';
  const hideBtn = isAdmin
    ? `<div class="art-admin-row">
        <button class="art-hide-btn" onclick="event.stopPropagation();toggleHidden('${cat.id}',${a.id})">${a.hidden ? '👁 숨김 해제' : '🙈 숨김'}</button>
      </div>` : '';
  return `<div class="art-card${a.hidden ? ' art-card-hidden' : ''}" style="--cat-color:${cat.color}" onclick="openArticle('${cat.id}',${a.id})">
    <div class="art-card-top">
      <span class="art-tag" style="background:${cat.bg};color:${cat.color}">${cat.label}</span>
      ${hiddenBadge}
      <span class="art-date">${a.date}</span>
    </div>
    <div class="art-title">${a.title}</div>
    <div class="art-excerpt">${a.excerpt}</div>
    <div class="art-footer">
      <span class="art-read">읽어보기</span>
      <span class="art-read-arrow">→</span>
    </div>
    ${hideBtn}
  </div>`;
}

/* ─── ARTICLE ─── */
function openArticle(catId, artId) {
  currentCat = catId;
  currentArticleId = artId;
  navigate('article', catId);
}

function renderArticlePage() {
  const cat = CATS.find(c => c.id === currentCat);
  const art = (articles[currentCat] || []).find(a => a.id === currentArticleId);
  if (!art || !cat) return;

  /* 숨김 문서는 관리자만 열람 가능 */
  if (art.hidden && !isAdmin) { showToast('접근할 수 없는 문서입니다.'); navigate('home'); return; }

  document.getElementById('art-bc-cat').textContent   = cat.label;
  document.getElementById('art-bc-title').textContent = art.title.length > 30 ? art.title.slice(0, 30) + '…' : art.title;

  /* 요약 미디어 */
  let excerptMediaHTML = '';
  if (art.excerptMedia && art.excerptMedia.length > 0) {
    excerptMediaHTML = `<div class="media-gallery" style="margin-bottom:20px">
      ${art.excerptMedia.map(m => {
        const hasW = !!m.width, hasH = !!m.height;
        const ws = hasW ? `width:${m.width}px;` : 'max-width:100%;';
        const hs = hasH ? `height:${m.height}px;` : 'height:auto;';
        const fit = (hasW && hasH) ? 'object-fit:contain;' : '';
        const style = `display:block;${ws}${hs}${fit}border-radius:8px;border:1px solid #e8e6e1;`;
        return `<div class="media-gallery-item">
          ${buildArticleMediaEl(m, style)}
        </div>`;
      }).join('')}
    </div>`;
  }

  /* 문서 전체 첨부 미디어 */
  let mediaHTML = '';
  if (art.media && art.media.length > 0) {
    mediaHTML = `<div style="margin-bottom:28px">
      <div class="media-section-title">첨부 미디어</div>
      <div class="media-gallery">
        ${art.media.map(m => `<div class="media-gallery-item">
          ${buildArticleMediaEl(m)}
        </div>`).join('')}
      </div>
    </div>`;
  }

  /* 단계별 가이드 */
  let stepsHTML = buildStepsGuideHTML(art);

  /* ── 튜토리얼 모드 문서 ──
     Video Guide(요약/요약 미디어)는 표시하지 않고 자동 생성 튜토리얼을 노출.
     단계별 가이드 원본은 관리자에게만 보인다. */
  if (isTutorialArticle(art)) {
    excerptMediaHTML = '';
    mediaHTML        = '';
    stepsHTML        = isAdmin && stepsHTML
      ? `<div class="steps-admin-wrap">
          <div class="steps-admin-note">🔒 관리자 전용 — 단계별 가이드 원본입니다. 일반 사용자에게는 위 튜토리얼만 노출되며, 이 내용을 수정하면 튜토리얼이 자동으로 갱신됩니다.
            <button id="btn-auto-spots" class="btn-auto-spots" onclick="autoGenerateSpots()">✨ 스포트라이트 자동 생성</button>
          </div>
          ${stepsHTML}
        </div>`
      : '';
  }

  const adminActions = isAdmin ? `<div class="admin-actions">
    <button class="btn-edit" onclick="navigate('edit','${currentCat}')">✏️ 수정</button>
    <button class="btn-hide" onclick="toggleHidden('${currentCat}',${art.id})">${art.hidden ? '👁 숨김 해제' : '🙈 숨김'}</button>
    <button class="btn-delete" onclick="openConfirmDelete(${art.id})">🗑 삭제</button>
  </div>` : '';
  const hiddenNotice = (isAdmin && art.hidden)
    ? '<div class="article-hidden-notice">🙈 이 문서는 <b>숨김</b> 상태입니다. 관리자에게만 표시됩니다.</div>' : '';

  document.getElementById('article-content').innerHTML = `
    <button class="btn-back" onclick="navigate('category','${currentCat}')">← 목록으로</button>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <span class="article-cat-tag" style="background:${cat.bg};color:${cat.color}">${cat.label}</span>
      <span class="article-meta-date">${art.date}</span>
    </div>
    <div class="article-title-row">
      <div class="article-h1">${art.title}</div>
      <button class="btn-copy-link" onclick="copyArticleLink()">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5.5 8.5L8.5 5.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M6.5 10.5L5.207 11.793A3 3 0 0 1 1 11a3 3 0 0 1 .793-2.207L3.5 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M7.5 3.5L8.793 2.207A3 3 0 0 1 13 3a3 3 0 0 1-.793 2.207L10.5 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        링크 복사
      </button>
    </div>
    <div class="article-meta">${adminActions}</div>
    ${hiddenNotice}
    ${isTutorialArticle(art) ? '<div id="art-tutorial"></div>' : `<p class="article-body">${nl2br(art.excerpt)}</p>`}
    ${excerptMediaHTML}
    ${mediaHTML}
    ${stepsHTML}
  `;

  if (isTutorialArticle(art)) {
    tutIdx = 0;
    renderArticleTutorial();
  }
}

function buildStepsGuideHTML(art) {
  if (!art.steps || art.steps.length === 0) return '';
  const inner = art.steps.map((s, i) => {
    const stepMedia = (s.media || []).map(m => {
      const hasW = !!m.width, hasH = !!m.height;
      const ws  = hasW ? `width:${m.width}px;`   : 'max-width:100%;';
      const hs  = hasH ? `height:${m.height}px;` : 'height:auto;';
      const fit = (hasW && hasH) ? 'object-fit:contain;' : '';
      const style = `display:block;${ws}${hs}${fit}border-radius:8px;border:1px solid #e8e6e1;`;
      return `<div style="display:inline-block;margin-top:14px;margin-right:12px;">
        ${buildArticleMediaEl(m, style)}
      </div>`;
    }).join('');
    return `<div class="step-item">
      <div class="step-circle ${i === 0 ? 'red' : ''}">${i + 1}</div>
      <div class="step-body">
        <div class="step-label">Step ${String(i + 1).padStart(2, '0')}</div>
        <div class="step-text">${nl2br(s.text)}</div>
        ${stepMedia}
      </div>
    </div>`;
  }).join('');
  return `<div class="steps-title">단계별 가이드</div><div class="steps-list">${inner}</div>`;
}

/* ═══════════════════════════════════════
   문서 튜토리얼 — 단계별 가이드(steps)에서 자동 생성
   x-tutorial 방식: 전체 화면 오버레이 + 스크린샷 위 스포트라이트 + 말풍선
═══════════════════════════════════════ */
function tutSlides(art) {
  return (art.steps || [])
    .map((s, i) => ({ ...s, _i: i }))   /* _i: steps 원본 인덱스 (스포트라이트 좌표 매칭용) */
    .filter(s => (s.text && s.text.trim()) || (s.media || []).length > 0);
}

/* ─── 튜토리얼 PPTX 다운로드 ───
   각 스텝 이미지를 캔버스에 그려 스포트라이트(딤+테두리+라벨)까지 합성한 뒤
   PptxGenJS(CDN, 최초 클릭 시 로드)로 슬라이드를 만들어 저장한다. */
let pptxLoading = null;
function loadPptxGen() {
  if (window.PptxGenJS) return Promise.resolve();
  if (!pptxLoading) {
    pptxLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
      s.onload = resolve;
      s.onerror = () => { pptxLoading = null; reject(new Error('PptxGenJS 로드 실패 (네트워크 확인)')); };
      document.head.appendChild(s);
    });
  }
  return pptxLoading;
}

/* 스텝 이미지 + 스포트라이트를 캔버스로 합성 → { data, w, h } (이미지 없으면 null) */
function tutStepShot(step, cfg, color) {
  const media = (step.media || [])[0];
  if (!media || media.type !== 'image') return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const cx = cv.getContext('2d');
      cx.drawImage(img, 0, 0);
      const rects = (cfg && cfg.rects) || [];
      if (rects.length) {
        /* 딤 처리 후 스포트라이트 영역만 원본으로 홀펀치 */
        cx.fillStyle = 'rgba(8,8,8,0.45)';
        cx.fillRect(0, 0, W, H);
        const px = r => ({ x: r.x / 100 * W, y: r.y / 100 * H, w: r.w / 100 * W, h: r.h / 100 * H });
        rects.forEach(r => { const b = px(r); cx.drawImage(img, b.x, b.y, b.w, b.h, b.x, b.y, b.w, b.h); });
        const rr = (x, y, w, h, rad) => { /* roundRect 폴백 포함 */
          cx.beginPath();
          if (cx.roundRect) cx.roundRect(x, y, w, h, rad); else cx.rect(x, y, w, h);
        };
        rects.forEach(r => {
          const b = px(r);
          cx.lineWidth = 3; cx.strokeStyle = color;
          rr(b.x, b.y, b.w, b.h, 10); cx.stroke();
          if (r.label) { /* 라벨 칩: 기본 위, labelPos:left 는 왼쪽 */
            cx.font = '700 19px "Malgun Gothic", "Pretendard", sans-serif';
            const tw = cx.measureText(r.label).width;
            const cw = tw + 24, ch = 34;
            let lx, ly;
            if (r.labelPos === 'left') {
              lx = b.x - cw - 14; ly = b.y + b.h / 2 - ch / 2;
              if (lx < 4) lx = b.x + b.w + 14; /* 왼쪽 공간 없으면 오른쪽 */
            } else {
              lx = b.x - 4; ly = b.y - ch - 12;
              if (ly < 4) ly = b.y + b.h + 12; /* 위 공간 없으면 아래 (대상을 가리지 않도록) */
            }
            lx = Math.max(4, Math.min(W - cw - 4, lx));
            ly = Math.max(4, Math.min(H - ch - 4, ly));
            cx.fillStyle = color;
            rr(lx, ly, cw, ch, 8); cx.fill();
            cx.fillStyle = '#fff';
            cx.textBaseline = 'middle';
            cx.fillText(r.label, lx + 12, ly + ch / 2 + 1);
          }
        });
      }
      resolve({ data: cv.toDataURL('image/jpeg', 0.92), w: W, h: H });
    };
    img.onerror = () => resolve(null);
    img.src = media.url;
  });
}

async function downloadTutPptx() {
  const art = (articles[currentCat] || []).find(a => a.id === currentArticleId);
  if (!art) return;
  const btn = document.querySelector('.atv-ppt');
  const restore = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = '생성 중…'; }
    await loadPptxGen();
    const slides = tutSlides(art);
    const isX    = currentCat === 'twitter';
    const color  = isX ? '#1d9bf0' : '#ff4a3d';   /* 캔버스용 */
    const hex    = isX ? '1D9BF0' : 'D93025';     /* pptx용 */
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9'; /* 10 x 5.625 in */

    /* 표지 슬라이드 */
    const cover = pptx.addSlide();
    cover.addText(art.title, { x: 0.5, y: 2.2, w: 9, h: 0.9, align: 'center', fontSize: 30, bold: true, color: '1E1E1E', fontFace: 'Malgun Gothic' });
    cover.addText('KT Nasmedia 데이터분석팀', { x: 0.5, y: 3.15, w: 9, h: 0.4, align: 'center', fontSize: 12, color: '8C8880', fontFace: 'Malgun Gothic' });

    for (let i = 0; i < slides.length; i++) {
      const s   = slides[i];
      const cfg = (TUTORIAL_SPOTS[art.title] || [])[s._i] || s.spots || null;
      const shot = await tutStepShot(s, cfg, color);
      const sl = pptx.addSlide();
      sl.addText(`STEP ${i + 1} / ${slides.length}`, { x: 0.4, y: 0.22, w: 2.6, h: 0.35, fontSize: 13, bold: true, color: hex, fontFace: 'Malgun Gothic' });
      const bodyText = String(s.text || '').split('\n').map(l => l.replace(/^\s*-\s+/, '')).join('\n');
      sl.addText(bodyText, { x: 0.4, y: 0.55, w: 9.2, h: 0.72, fontSize: 12.5, color: '333333', valign: 'top', fontFace: 'Malgun Gothic' });
      if (shot) {
        /* 이미지 영역(0.4, 1.35, 9.2 x 4.05)에 비율 유지로 맞춤 */
        const boxW = 9.2, boxH = 4.05;
        const ratio = Math.min(boxW / shot.w, boxH / shot.h);
        const w = shot.w * ratio, h = shot.h * ratio;
        sl.addImage({ data: shot.data, x: 0.4 + (boxW - w) / 2, y: 1.35 + (boxH - h) / 2, w, h });
      }
    }
    /* 마지막 슬라이드: E.O.D */
    const eod = pptx.addSlide();
    eod.addText('E.O.D', { x: 0.5, y: 2.45, w: 9, h: 0.8, align: 'center', fontSize: 32, bold: true, color: '1E1E1E', charSpacing: 3, fontFace: 'Malgun Gothic' });
    await pptx.writeFile({ fileName: `${art.title}.pptx` });
  } catch (e) {
    alert('PPT 생성에 실패했습니다: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = restore || '⬇ PPT 다운로드'; }
  }
}

/* 튜토리얼 말풍선용 텍스트: 줄 앞의 "- " 불릿 제거 + 따옴표 단어 강조 */
function tutText(text) {
  const html = nl2br(String(text || '').split('\n').map(l => l.replace(/^\s*-\s+/, '')).join('\n'));
  return html.replace(/(^|[\s(>])'([^'\n]{1,60}?)'(?=[\s).,:;!?<]|$)/gm, '$1<span class="atv-kw">$2</span>');
}

/* 문서 페이지 안에는 시작 배너만 보여주고, 튜토리얼 본체는 전체 화면 오버레이로 연다 */
function renderArticleTutorial() {
  const wrap = document.getElementById('art-tutorial');
  const art  = (articles[currentCat] || []).find(a => a.id === currentArticleId);
  if (!wrap || !art) return;

  const slides = tutSlides(art);
  if (!slides.length) { wrap.innerHTML = ''; return; }

  wrap.innerHTML = `
    <div class="art-tut-banner">
      <div class="art-tut-banner-copy">
        <div class="art-tut-banner-badge">STEP BY STEP TUTORIAL</div>
        <div class="art-tut-banner-title">화면을 따라가는 ${slides.length}단계 튜토리얼</div>
        <div class="art-tut-banner-desc">실제 화면 캡처 위에 확인할 위치를 짚어가며 단계별로 안내합니다.</div>
      </div>
      <button class="art-tut-banner-btn" onclick="openArtTut(0)">튜토리얼 시작하기 →</button>
    </div>`;

  /* 문서 첫 진입 시 자동 시작 (로그인 등으로 재렌더될 때는 다시 열지 않음)
     ?tut=N 쿼리로 특정 단계 딥링크 가능 (예: /?tut=3#/article/instagram/123) */
  if (tutSeenId !== art.id) {
    tutSeenId = art.id;
    const t0 = parseInt(new URLSearchParams(location.search).get('tut'));
    openArtTut(isNaN(t0) ? 0 : Math.max(0, t0 - 1));
  }
}

function ensureArtTutOverlay() {
  let ov = document.getElementById('art-tut-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'art-tut-overlay';
    document.body.appendChild(ov);
  }
  return ov;
}

function openArtTut(idx) {
  tutIdx = idx || 0;
  tutZoom = 1;
  ensureArtTutOverlay().style.display = 'flex';
  document.body.style.overflow = 'hidden';
  renderArtTutStep();
}

function closeArtTut() {
  const ov = document.getElementById('art-tut-overlay');
  if (ov) ov.style.display = 'none';
  document.body.style.overflow = '';
  tutSeenId = currentArticleId;
}

function isArtTutOpen() {
  const ov = document.getElementById('art-tut-overlay');
  return !!ov && ov.style.display === 'flex';
}

/* 말풍선 배치: 대표(첫 번째) 스포트라이트 기준, card 힌트 또는 자동(위/아래).
   card:'center' 는 스포트라이트 없이도 이미지 정중앙에 말풍선을 띄운다. */
function atvCardStyle(cfg) {
  if (cfg && cfg.card === 'center') return 'left:50%;top:50%;transform:translate(-50%,-50%);';
  if (!cfg || !cfg.rects || !cfg.rects.length) return '';
  const r   = cfg.rects[0];
  const cx  = r.x + r.w / 2;
  const pos = cfg.card || ((r.y + r.h) <= 55 ? 'below' : 'above');
  const leftClamp = `left:clamp(8px, calc(${cx}% - 170px), calc(100% - 348px));`;
  /* 위쪽 배치 시 스포트라이트의 라벨 칩(박스 위 ~40px)을 가리지 않도록 간격 확보 */
  const aboveGap = r.label && r.labelPos !== 'left' ? 52 : 18;
  if (pos === 'below') return `${leftClamp}top:calc(${r.y + r.h}% + 18px);`;
  if (pos === 'above') return `${leftClamp}bottom:calc(${100 - r.y}% + ${aboveGap}px);`;
  if (pos === 'right') return `left:min(calc(${r.x + r.w}% + 20px), calc(100% - 348px));top:${r.y}%;`;
  if (pos === 'left')  return `right:calc(${100 - r.x}% + 20px);top:${r.y}%;`;
  return '';
}

function renderArtTutStep() {
  const ov  = ensureArtTutOverlay();
  const art = (articles[currentCat] || []).find(a => a.id === currentArticleId);
  if (!art) { closeArtTut(); return; }
  ov.classList.toggle('atv-x', currentCat === 'twitter'); // X(트위터) 튜토리얼은 파란색 하이라이트

  const slides = tutSlides(art);
  const total  = slides.length;
  if (!total) { closeArtTut(); return; }

  tutIdx = Math.max(0, Math.min(tutIdx, total));   /* total === 완료 화면 */
  const done = tutIdx >= total;
  const pct  = done ? 100 : ((tutIdx + 1) / total) * 100;

  const top = `
    <div class="atv-top">
      <div class="atv-brand">
        <span class="art-tut-badge">TUTORIAL</span>
        <span class="atv-title">${escHtml(art.title)}</span>
      </div>
      <div class="atv-top-right">
        <button class="atv-ppt" onclick="downloadTutPptx()" title="스텝별 스크린샷을 PPT로 저장">⬇ PPT 다운로드</button>
        <span class="atv-count">${done ? 'DONE' : `STEP ${tutIdx + 1} / ${total}`}</span>
        <button class="atv-close" onclick="closeArtTut()" title="닫기 (Esc)">✕</button>
      </div>
    </div>
    <div class="atv-progress"><div class="atv-progress-fill" style="width:${pct}%"></div></div>`;

  if (done) {
    ov.innerHTML = `${top}
      <div class="atv-main column">
        <div class="atv-done">
          <div class="atv-done-icon">🎉</div>
          <div class="atv-done-title">튜토리얼 완료!</div>
          <div class="atv-done-text">모든 단계를 확인했습니다.</div>
          <div class="atv-done-btns">
            <button class="atv-restart" onclick="artTutJump(0)">↺ 처음부터 다시 보기</button>
            <button class="atv-finish" onclick="closeArtTut()">닫기</button>
          </div>
        </div>
      </div>`;
    return;
  }

  const s     = slides[tutIdx];
  /* 수동 좌표(TUTORIAL_SPOTS)가 있으면 우선, 없으면 step에 저장된 자동 생성 spots 사용 */
  const cfg   = (TUTORIAL_SPOTS[art.title] || [])[s._i] || s.spots || null;
  const rects = (cfg && cfg.rects) || [];
  const media = (s.media || [])[0];

  /* 스포트라이트 외 영역을 어둡게 (SVG 마스크 홀펀치) */
  const maskHTML = rects.length ? `
    <svg class="atv-mask" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs><mask id="atv-holes">
        <rect x="0" y="0" width="100" height="100" fill="#fff"/>
        ${rects.map(r => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="0.6" fill="#000"/>`).join('')}
      </mask></defs>
      <rect x="0" y="0" width="100" height="100" fill="rgba(8,8,8,0.45)" mask="url(#atv-holes)"/>
    </svg>` : '';

  const spotsHTML = rects.map(r =>
    `<div class="atv-spot" style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%">
      ${r.label ? `<div class="atv-spot-label ${r.labelPos || ''}">${escHtml(r.label)}</div>` : ''}
    </div>`
  ).join('');

  const dots = `<div class="atv-dots">${slides.map((_, d) =>
    `<span class="atv-dot ${d === tutIdx ? 'on' : ''} ${d < tutIdx ? 'seen' : ''}" onclick="artTutJump(${d})"></span>`).join('')}</div>`;

  const cardHTML = spotted => `
    <div class="atv-card ${spotted ? 'spotted' : 'flow'}${cfg && cfg.card === 'center' ? ' centered' : ''}" ${spotted ? `style="${atvCardStyle(cfg)}"` : ''}>
      <div class="atv-step-badge">STEP ${tutIdx + 1} / ${total}</div>
      <div class="atv-text">${tutText(s.text)}</div>
      <div class="atv-actions">
        <button class="atv-skip" onclick="closeArtTut()">건너뛰기</button>
        <button class="atv-prev" onclick="artTutGo(-1)" ${tutIdx === 0 ? 'disabled' : ''}>이전</button>
        <button class="atv-next" onclick="artTutGo(1)">${tutIdx === total - 1 ? '완료 🎉' : '다음 →'}</button>
      </div>
      ${dots}
    </div>`;

  let mainHTML;
  if (media && media.type === 'image') {
    const hasSpot = rects.length > 0 || (cfg && cfg.card === 'center');
    if (rects.length > 0) {
      /* 하이라이트 있는 스텝: 전체 화면은 그대로, 하이라이트 영역만 돋보기로 확대.
         각 rect 위에 이미지 동일 영역을 1:1로 보여주는 loupe를 얹고 scale 로 확대한다. */
      const loupes = rects.map(r =>
        `<div class="atv-loupe intro" data-x="${r.x}" data-y="${r.y}" style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%;background-image:url('${media.url}')"></div>`
      ).join('');
      mainHTML = `<div class="atv-main">
        <div class="atv-imgwrap">
          <img class="atv-baseimg" src="${media.url}" alt="">
          ${maskHTML}
          ${loupes}
          ${spotsHTML}
          <div class="atv-zoomctl" role="group" aria-label="하이라이트 돋보기">
            <button class="atv-zoom-out" onclick="tutZoomBy(-TUT_STEP_)" title="축소 (−)" aria-label="축소">－</button>
            <span class="atv-zoom-val">100%</span>
            <button class="atv-zoom-in" onclick="tutZoomBy(TUT_STEP_)" title="확대 (+)" aria-label="확대">＋</button>
          </div>
          ${cardHTML(true)}
        </div>
      </div>`.replace(/TUT_STEP_/g, String(TUT_ZOOM_STEP));
    } else {
      mainHTML = `<div class="atv-main ${hasSpot ? '' : 'column'}">
        <div class="atv-imgwrap">
          <img src="${media.url}" alt="">
          ${maskHTML}
          ${spotsHTML}
          ${hasSpot ? cardHTML(true) : ''}
        </div>
        ${hasSpot ? '' : cardHTML(false)}
      </div>`;
    }
  } else if (media && media.type === 'video') {
    mainHTML = `<div class="atv-main column">
      <div class="atv-imgwrap"><video src="${media.url}" controls autoplay muted></video></div>
      ${cardHTML(false)}
    </div>`;
  } else {
    mainHTML = `<div class="atv-main column">${cardHTML(false)}</div>`;
  }

  ov.innerHTML = top + mainHTML;
  const bimg = ov.querySelector('.atv-baseimg');
  if (bimg) bimg.addEventListener('load', layoutTutLoupes, { once: true });
  layoutTutLoupes();
  requestAnimationFrame(layoutTutLoupes);   /* 이미지 레이아웃 확정 후 배경 정렬 */
  applyTutZoom();
}

/* 돋보기 배경 정렬: 표시된 이미지 크기에 맞춰 각 loupe의 배경(스크린샷)을
   해당 rect가 1:1로 보이도록 background-size/position 을 픽셀로 설정. */
function layoutTutLoupes() {
  const ov = document.getElementById('art-tut-overlay');
  if (!ov) return;
  const img = ov.querySelector('.atv-baseimg');
  if (!img) return;
  const iw = img.clientWidth, ih = img.clientHeight;
  if (!iw || !ih) return;
  ov.querySelectorAll('.atv-loupe').forEach(l => {
    const rx = parseFloat(l.dataset.x) / 100 * iw;
    const ry = parseFloat(l.dataset.y) / 100 * ih;
    l.style.backgroundSize = `${iw}px ${ih}px`;
    l.style.backgroundPosition = `${-rx}px ${-ry}px`;
  });
}

/* 돋보기 확대/축소: 전체 화면은 그대로 두고 하이라이트 loupe 만 scale.
   loupe 는 rect 중심을 기준(transform-origin:center)으로 커져 해당 요소만 확대된다. */
function applyTutZoom() {
  const ov = document.getElementById('art-tut-overlay');
  if (!ov) return;
  const loupes = ov.querySelectorAll('.atv-loupe');
  if (!loupes.length) return;           /* 하이라이트 없는 스텝: 돋보기 없음 */
  const introEl   = ov.querySelector('.atv-loupe.intro');
  const introing  = !!introEl;
  const magnifying = introing || tutZoom > 1.001;
  if (introing) {
    /* 인트로 모션이 끝나면 클래스 제거 → 이후 수동 배율 반영 */
    introEl.addEventListener('animationend', () => {
      ov.querySelectorAll('.atv-loupe').forEach(l => l.classList.remove('intro'));
      applyTutZoom();
    }, { once: true });
  } else {
    loupes.forEach(l => {
      l.style.transform = `scale(${tutZoom})`;
      l.classList.toggle('on', tutZoom > 1.001);
    });
  }
  const wrap = ov.querySelector('.atv-imgwrap');
  if (wrap) wrap.classList.toggle('magnifying', magnifying);
  const val = ov.querySelector('.atv-zoom-val');
  if (val) val.textContent = Math.round(tutZoom * 100) + '%';
  const out = ov.querySelector('.atv-zoom-out');
  if (out) out.disabled = tutZoom <= 1.001;
  const inb = ov.querySelector('.atv-zoom-in');
  if (inb) inb.disabled = tutZoom >= TUT_ZOOM_MAX - 0.001;
}

function tutZoomBy(d) {
  /* 수동 조작 시 자동 인트로 모션 중단(인라인 배율이 바로 반영되도록) */
  const ov = document.getElementById('art-tut-overlay');
  if (ov) ov.querySelectorAll('.atv-loupe.intro').forEach(l => l.classList.remove('intro'));
  tutZoom = Math.min(TUT_ZOOM_MAX, Math.max(1, +(tutZoom + d).toFixed(2)));
  applyTutZoom();
}

function artTutGo(d)   { tutIdx += d; tutZoom = 1; renderArtTutStep(); }
function artTutJump(i) { tutIdx = i;  tutZoom = 1; renderArtTutStep(); }

/* 키보드: ← → 이동, Esc 닫기 */
document.addEventListener('keydown', e => {
  if (!isArtTutOpen()) return;
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.key === 'Escape')     { closeArtTut(); return; }
  if (e.key === '+' || e.key === '=') { tutZoomBy(TUT_ZOOM_STEP);  return; }
  if (e.key === '-' || e.key === '_') { tutZoomBy(-TUT_ZOOM_STEP); return; }
  if (e.key === 'ArrowRight') artTutGo(1);
  if (e.key === 'ArrowLeft' && tutIdx > 0) artTutGo(-1);
});

/* 창 크기 변경 시 돋보기 배경 재정렬 (표시 이미지 크기가 바뀌므로) */
window.addEventListener('resize', () => { if (isArtTutOpen()) layoutTutLoupes(); });

/* ═══════════════════════════════════════
   스포트라이트 자동 생성 (관리자 전용)
   스텝 설명의 '따옴표 단어'를 OCR(Tesseract.js)로 이미지에서 찾아
   step.spots에 저장한다 — 이미지 크기와 무관한 % 좌표라 어떤 이미지든 동작.
═══════════════════════════════════════ */
const TESSERACT_CDN  = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
const TESS_LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0_best';

function tutNorm(s) { return String(s || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, ''); }

function tutQuotedTerms(text) {
  const out = []; const re = /'([^'\n]{1,60}?)'/g; let m;
  while ((m = re.exec(String(text || '')))) out.push(m[1].trim());
  return out;
}

function tutLev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return dp[a.length][b.length];
}

/* OCR 라인들에서 term과 일치하는 단어열 탐색 (좌표는 W×H 기준 % 반환) */
function tutFindTermRect(lines, term, W, H, strict) {
  const tn = tutNorm(term);
  if (!tn) return null;
  const tol = strict
    ? (tn.length >= 8 ? 2 : tn.length >= 4 ? 1 : 0)
    : Math.max(1, Math.ceil(tn.length * 0.3));
  let best = null;
  /* 라인을 큰 가로 간격(>1.5%) 기준으로 분할 — 나란한 버튼들을 개별 요소로 취급 */
  const segments = [];
  for (const line of lines) {
    const ws = (line.words || []).filter(w => tutNorm(w.text));
    let seg = [];
    for (const w of ws) {
      if (seg.length && w.bbox.x0 - seg[seg.length - 1].bbox.x1 > W * 0.015) { segments.push(seg); seg = []; }
      seg.push(w);
    }
    if (seg.length) segments.push(seg);
  }
  for (const words of segments) {
    const segNormLen = tutNorm(words.map(w => w.text).join('')).length;
    for (let i = 0; i < words.length; i++) {
      let acc = '';
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let j = i; j < words.length; j++) {
        acc += tutNorm(words[j].text);
        const b = words[j].bbox;
        x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0);
        x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1);
        if (acc.length > tn.length + tol) break;
        const dist = tutLev(acc, tn, tol);
        if (dist <= tol) {
          if ((x1 - x0) / W * 100 > tn.length * 4 + 4) continue;   /* 비정상 병합 라인 제외 */
          if ((y1 - y0) / H * 100 > 8) continue;
          const whole = i === 0 && j === words.length - 1;
          /* 세그먼트 전체 일치 > 짧은 라인(제목·버튼) > 긴 라인(본문), 그다음 위쪽 우선 */
          const score = (whole ? 0 : 1e6 + Math.min(segNormLen, 99) * 1e4) + dist * 10 + (y0 / H) * 100;
          if (!best || score < best.score) best = { score, x0, y0, x1, y1 };
        }
      }
    }
  }
  if (!best) return null;
  /* 원시 단어 박스를 % 좌표로 반환 (요소 확장은 tutExpandSpotRect에서) */
  return { x0: best.x0 / W * 100, y0: best.y0 / H * 100, x1: best.x1 / W * 100, y1: best.y1 / H * 100 };
}

/* ─── 매칭된 단어 박스를 감싸는 UI 요소로 확장 ───
   A-1. 근접 테두리 박스(버튼) → A-2는 B 뒤에
   B.   라벨 아래 입력란(넓은 가로 테두리 박스)까지 포함
   A-2. 원거리 테두리 박스(섹션 카드 등)
   C.   행 블록 확장: 아래 이어지는 내용 행(실제 여백 기준) + 좌우 콘텐츠 범위.
        아무것도 안 붙으면 섹션 헤더로 보고 다음 블록 하나를 브리지. */
function tutExpandSpotRect(raw, img, modal) {
  const { width: W, height: H, data: px } = img;
  const bright = (x, y) => { const i = (y * W + x) * 4; return (px[i] + px[i+1] + px[i+2]) / 3; };
  const notBg  = (x, y) => { const i = (y * W + x) * 4; const r = px[i], g = px[i+1], b = px[i+2]; return (r + g + b) / 3 < 235 || Math.max(r, g, b) - Math.min(r, g, b) > 30; };
  const isDim  = (x, y) => { const i = (y * W + x) * 4; const r = px[i], g = px[i+1], b = px[i+2]; return (r + g + b) / 3 < 180 && Math.max(r, g, b) - Math.min(r, g, b) < 30; };
  const isContent = (x, y) => notBg(x, y) && !isDim(x, y);
  const X0 = Math.round(raw.x0 / 100 * W), X1 = Math.round(raw.x1 / 100 * W);
  const Y0 = Math.round(raw.y0 / 100 * H), Y1 = Math.round(raw.y1 / 100 * H);
  const clampX = v => Math.max(0, Math.min(W - 1, v));
  const clampY = v => Math.max(0, Math.min(H - 1, v));
  const colDark = (x, y0, y1) => { let c = 0, n = 0; for (let y = clampY(y0); y <= clampY(y1); y++) { n++; if (bright(clampX(x), y) < 228) c++; } return n ? c / n : 0; };
  const rowDark = (y, x0, x1) => { let c = 0, n = 0; for (let x = clampX(x0); x <= clampX(x1); x += 2) { n++; if (bright(x, clampY(y)) < 228) c++; } return n ? c / n : 0; };

  const borderBox = (capXf, capYf) => {
    const capX = Math.round(W * capXf), capY = Math.round(H * capYf);
    const scanL = (y0, y1, thr) => { for (let x = X0 - 2; x >= X0 - capX; x--) if (colDark(x, y0, y1) > thr) return x; return -1; };
    const scanR = (y0, y1, thr) => { for (let x = X1 + 2; x <= X1 + capX; x++) if (colDark(x, y0, y1) > thr) return x; return -1; };
    let bL = scanL(Y0, Y1, 0.65); if (bL < 0) return null;
    let bR = scanR(Y0, Y1, 0.65); if (bR < 0) return null;
    let bT = -1, bB = -1;
    for (let y = Y0 - 2; y >= Y0 - capY; y--) if (rowDark(y, bL + 3, bR - 3) > 0.65) { bT = y; break; }
    if (bT >= 0) for (let y = Y1 + 2; y <= Y1 + capY; y++) if (rowDark(y, bL + 3, bR - 3) > 0.65) { bB = y; break; }
    if (bT < 0 || bB < 0) return null;
    /* 상하 테두리 확정 후, 요소 전체 높이에 걸친 진짜 세로 테두리로 재탐색
       (버튼 안 아이콘 등 글리프 열은 전체 높이를 채우지 못해 배제됨) */
    const rL = scanL(bT + 2, bB - 2, 0.8), rR = scanR(bT + 2, bB - 2, 0.8);
    if (rL >= 0) bL = rL;
    if (rR >= 0) bR = rR;
    return { x0: bL / W * 100, y0: bT / H * 100, x1: bR / W * 100, y1: bB / H * 100 };
  };

  /* A-0. 솔리드 다크 버튼(검은 박스) — 단어 좌우가 어두운 채움이면 어두운 영역 전체로 확장.
     테두리 박스 탐지(A-1)는 채움형 버튼에서 단어 바로 옆 채움 픽셀을 테두리로 오인해
     글자 크기 박스만 반환하므로, 그보다 먼저 처리한다. */
  const darkFill    = (x, y0, y1) => { let c = 0, n = 0; for (let y = clampY(y0); y <= clampY(y1); y++) { n++; if (bright(clampX(x), y) < 110) c++; } return n ? c / n : 0; };
  const rowDarkFill = (y, x0, x1) => { let c = 0, n = 0; for (let x = clampX(x0); x <= clampX(x1); x += 2) { n++; if (bright(x, clampY(y)) < 110) c++; } return n ? c / n : 0; };
  if (darkFill(clampX(X0 - 3), Y0, Y1) > 0.7 && darkFill(clampX(X1 + 3), Y0, Y1) > 0.7) {
    const capX = Math.round(W * 0.12), capY = Math.round(H * 0.05);
    let bL = X0, bR = X1, bT = Y0, bB = Y1;
    while (bL > X0 - capX && darkFill(bL - 1, Y0, Y1) > 0.6) bL--;
    while (bR < X1 + capX && darkFill(bR + 1, Y0, Y1) > 0.6) bR++;
    /* 양쪽 모두 실제 경계(밝은 배경)를 찾은 경우에만 버튼으로 확정 — 다크 테마 패널 전체에서의 오검출 방지 */
    if (darkFill(clampX(bL - 1), Y0, Y1) <= 0.6 && darkFill(clampX(bR + 1), Y0, Y1) <= 0.6) {
      while (bT > Y0 - capY && rowDarkFill(bT - 1, bL, bR) > 0.6) bT--;
      while (bB < Y1 + capY && rowDarkFill(bB + 1, bL, bR) > 0.6) bB++;
      return { x0: bL / W * 100, y0: bT / H * 100, x1: bR / W * 100, y1: bB / H * 100 };
    }
  }

  /* A-1. 근접 테두리 박스 (버튼) */
  const small = borderBox(0.07, 0.045);
  if (small) return small;

  /* B. 라벨 아래 입력란 */
  let inTop = -1;
  for (let y = Y1 + 2; y <= Y1 + Math.round(H * 0.035); y++)
    if (rowDark(y, X0, X0 + Math.round(W * 0.3)) > 0.7) { inTop = y; break; }
  if (inTop >= 0) {
    let xL = X0, xR = X0, gap = 0;
    while (xL > 0 && gap <= 2) { if (bright(xL - 1, inTop) < 228) { xL--; gap = 0; } else { gap++; xL--; } }
    xL += gap; gap = 0;
    while (xR < W - 1 && gap <= 2) { if (bright(xR + 1, inTop) < 228) { xR++; gap = 0; } else { gap++; xR++; } }
    xR -= gap;
    if (xR - xL > W * 0.15) {
      let inBot = -1;
      for (let y = inTop + Math.round(H * 0.015); y <= inTop + Math.round(H * 0.07); y++)
        if (rowDark(y, xL + 3, xR - 3) > 0.65) { inBot = y; break; }
      if (inBot >= 0)
        return { x0: Math.min(raw.x0, xL / W * 100), y0: raw.y0, x1: Math.max(raw.x1, xR / W * 100), y1: inBot / H * 100 };
    }
  }

  /* A-2. 원거리 테두리 박스 (섹션 카드 등) */
  const large = borderBox(0.42, 0.1);
  if (large && (large.x1 - large.x0) < 70 && (large.y1 - large.y0) < 35) return large;

  /* C. 행 블록 확장 */
  const probe0 = clampX(X0 - Math.round(W * 0.02)), probe1 = clampX(X0 + Math.round(W * 0.28));
  const rowHas = y => { let c = 0; for (let x = probe0; x <= probe1; x += 2) { if (isContent(x, clampY(y))) c++; if (c >= 2) return true; } return false; };
  const gapLim = Math.max(3, Math.round(H * 0.009));
  const hCap   = Y0 + Math.round(H * 0.12);
  let uy1p = Y1, relaxed = false;
  let y = Y1 + 1, gap = 0;
  while (y <= Math.min(H - 1, hCap)) {
    if (rowHas(y)) { uy1p = y; gap = 0; } else if (++gap > gapLim) break;
    y++;
  }
  if (uy1p <= Y1 + 2) {
    let yy = Y1 + 1, seen = -1;
    while (yy <= Math.min(H - 1, Y1 + Math.round(H * 0.03))) { if (rowHas(yy)) { seen = yy; break; } yy++; }
    if (seen > 0) {
      relaxed = true;
      uy1p = seen; gap = 0; y = seen + 1;
      while (y <= Math.min(H - 1, hCap)) {
        if (rowHas(y)) { uy1p = y; gap = 0; } else if (++gap > gapLim) break;
        y++;
      }
    }
  }
  let win0, win1;
  if (relaxed)    { win0 = clampX(X0 - Math.round(W * 0.02)); win1 = Math.round(W * 0.98); }
  else if (modal) { win0 = Math.round((modal.x + 0.5) / 100 * W); win1 = Math.round((modal.x + modal.w - 0.5) / 100 * W); }
  else            { win0 = clampX(X0 - Math.round(W * 0.06)); win1 = clampX(X1 + Math.round(W * 0.35)); }
  let ux0p = X0, ux1p = X1;
  for (let yy = Y0; yy <= uy1p; yy += 2)
    for (let x = win0; x <= win1; x += 2)
      if (isContent(x, yy)) { if (x < ux0p) ux0p = x; if (x > ux1p) ux1p = x; }
  return { x0: ux0p / W * 100, y0: raw.y0, x1: ux1p / W * 100, y1: uy1p / H * 100 };
}

/* % 원시 박스 → 여백 포함 최종 스팟 */
function tutFinishRect(r) {
  const p = v => Math.round(v * 10) / 10;
  return {
    x: p(Math.max(0, r.x0 - 0.5)),
    y: p(Math.max(0, r.y0 - 0.7)),
    w: p(Math.min(100, r.x1 - r.x0 + 1.0)),
    h: p(Math.min(100, r.y1 - r.y0 + 1.4)),
  };
}

/* 어두운 배경 위 중앙 팝업 경계 검출 — term 매칭 실패 시 폴백 */
function tutDetectModal(px, W, H) {
  const bright = (x, y) => { const i = (y * W + x) * 4; return (px[i] + px[i+1] + px[i+2]) / 3; };
  const corners = [bright(30, 30), bright(W-30, 30), bright(30, H-30), bright(W-30, H-30)];
  if (Math.min(...corners) > 170) return null;
  const bx0 = Math.floor(W * 0.38), bx1 = Math.floor(W * 0.62);
  const frac = [];
  for (let y = 0; y < H; y++) {
    let c = 0;
    for (let x = bx0; x < bx1; x += 2) if (bright(x, y) > 200) c++;
    frac.push(c / ((bx1 - bx0) / 2));
  }
  let range = null, s = -1;
  for (let y = 0; y <= H; y++) {
    const on = y < H && frac[y] > 0.55;
    if (on && s < 0) s = y;
    if (!on && s >= 0) { if (!range || y - s > range[1] - range[0]) range = [s, y - 1]; s = -1; }
  }
  if (!range || range[1] - range[0] < H * 0.12) return null;
  const [y0, y1] = range;
  const colFrac = x => {
    let c = 0, n = 0;
    for (let y = y0; y <= y1; y += 2) { n++; if (bright(x, y) > 200) c++; }
    return c / n;
  };
  const cx = Math.floor(W / 2);
  let xs = cx, xe = cx;
  while (xs > 0 && colFrac(xs - 1) > 0.55) xs--;
  while (xe < W - 1 && colFrac(xe + 1) > 0.55) xe++;
  const w = xe - xs, h = y1 - y0;
  if (w < W * 0.1 || w > W * 0.8 || h < H * 0.1 || h > H * 0.9) return null;
  const p = v => Math.round(v * 10) / 10;
  return { x: p(xs / W * 100), y: p(y0 / H * 100), w: p(w / W * 100), h: p(h / H * 100) };
}

function tutChooseCard(rects) {
  const bottom = Math.max(...rects.map(r => r.y + r.h));
  const height = bottom - Math.min(...rects.map(r => r.y));
  if (rects.length >= 3 || height > 25) return 'right';
  return bottom <= 55 ? 'below' : 'above';
}

function loadScriptOnce(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const el = document.createElement('script');
    el.src = src; el.onload = res; el.onerror = () => rej(new Error('스크립트 로드 실패'));
    document.head.appendChild(el);
  });
}

function tutLoadImage(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('이미지 로드 실패: ' + url));
    im.src = url;
  });
}

async function autoGenerateSpots() {
  if (!isAdmin) return;
  const art = (articles[currentCat] || []).find(a => a.id === currentArticleId);
  if (!art) return;
  const btn = document.getElementById('btn-auto-spots');
  const setBtn = t => { if (btn) btn.textContent = t; };
  try {
    if (btn) btn.disabled = true;
    setBtn('⏳ OCR 엔진 로드 중...');
    await loadScriptOnce(TESSERACT_CDN);
    const worker = await Tesseract.createWorker({ langPath: TESS_LANG_PATH, gzip: true });
    await worker.loadLanguage('kor+eng');
    await worker.initialize('kor+eng');

    const steps = art.steps.map(s => ({ ...s }));
    for (let si = 0; si < steps.length; si++) {
      const s     = steps[si];
      const media = (s.media || [])[0];
      const terms = tutQuotedTerms(s.text);
      delete s.spots;
      if (!media || media.type !== 'image' || !terms.length) continue;
      setBtn(`⏳ ${si + 1}/${steps.length} 단계 인식 중...`);

      const im = await tutLoadImage(media.url);
      const W = im.naturalWidth, H = im.naturalHeight;
      const W2 = W * 2, H2 = H * 2;   /* OCR은 2배 업스케일로 정확도 확보. % 좌표는 동일 */

      /* 2-패스 OCR: 전체 + 우하단 크롭 (전체 패스가 놓치는 영역 보완) */
      const lines = [];
      for (const pass of [null, [0.37, 0.3]]) {
        const ox = pass ? Math.floor(W * pass[0]) : 0;
        const oy = pass ? Math.floor(H * pass[1]) : 0;
        const cw = W - ox, ch = H - oy;
        const cv = document.createElement('canvas');
        cv.width = cw * 2; cv.height = ch * 2;
        cv.getContext('2d').drawImage(im, ox, oy, cw, ch, 0, 0, cw * 2, ch * 2);
        const { data: ocr } = await worker.recognize(cv);
        for (const l of ocr.lines || []) lines.push({
          words: (l.words || []).map(w => ({ text: w.text, bbox: { x0: w.bbox.x0 + ox * 2, y0: w.bbox.y0 + oy * 2, x1: w.bbox.x1 + ox * 2, y1: w.bbox.y1 + oy * 2 } })),
        });
      }

      /* 다른 term에 포함되는 짧은 term 제외 (예: 'partner' ⊂ 'Partners with partial access') */
      const useTerms = terms.filter(t => !terms.some(o => o !== t && tutNorm(o).includes(tutNorm(t))));
      /* 1배 픽셀 데이터 (요소 확장·팝업 검출용) */
      const cv1 = document.createElement('canvas');
      cv1.width = W; cv1.height = H;
      const cx1 = cv1.getContext('2d');
      cx1.drawImage(im, 0, 0);
      const img1  = { width: W, height: H, data: cx1.getImageData(0, 0, W, H).data };
      const modal = tutDetectModal(img1.data, W, H);
      const rects = [];
      for (const term of useTerms) {
        const raw = tutFindTermRect(lines, term, W2, H2, true) || tutFindTermRect(lines, term, W2, H2, false);
        if (raw) rects.push({ ...tutFinishRect(tutExpandSpotRect(raw, img1, modal)), label: term });
      }
      if (!rects.length && modal) {
        /* 팝업 폴백: 어두운 배경 위 중앙 팝업 전체를 강조 */
        rects.push({ ...modal, label: terms[0] });
      }
      if (rects.length) {
        if (rects.length >= 2) {
          rects.forEach(r => r.labelPos = 'left');
          /* 세로로 쌓인 행들의 좌우 폭 통일 */
          const minX = Math.min(...rects.map(r => r.x));
          if (rects.every(r => Math.abs(r.x - minX) < 5)) {
            const maxR = Math.max(...rects.map(r => r.x + r.w));
            rects.forEach(r => { r.x = minX; r.w = Math.round((maxR - minX) * 10) / 10; });
          }
        }
        s.spots = { auto: true, card: tutChooseCard(rects), rects };
      }
    }
    await worker.terminate();

    setBtn('⏳ 저장 중...');
    const updated = await api('PUT', `/api/articles/${currentCat}/${art.id}`, { steps });
    const idx = articles[currentCat].findIndex(a => a.id === updated.id);
    if (idx !== -1) articles[currentCat][idx] = updated;
    const found = steps.filter(s => s.spots).length;
    showToast(`✅ 스포트라이트 자동 생성 완료 (${found}/${steps.length} 단계)`);
    renderArticlePage();
  } catch (e) {
    console.error('[AUTO SPOTS]', e);
    showToast('⚠️ 자동 생성 실패: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; setBtn('✨ 스포트라이트 자동 생성'); }
  }
}

function copyArticleLink() {
  const url = getArticleUrl(currentCat, currentArticleId);
  navigator.clipboard.writeText(url).then(() => showToast('🔗 링크가 복사되었습니다.')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = url; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); showToast('🔗 링크가 복사되었습니다.');
  });
}

/* ═══════════════════════════════════════
   WRITE / EDIT FORM
═══════════════════════════════════════ */
function initWriteForm(existing) {
  isEditMode = !!existing;
  wSteps = existing
    ? (existing.steps || []).map(s => ({ text: s.text || '', media: (s.media || []).map(m => ({ ...m })) }))
    : [{ text: '', media: [] }];
  if (!wSteps.length) wSteps = [{ text: '', media: [] }];
  wMedia        = existing ? [...(existing.media        || [])] : [];
  wExcerptMedia = existing ? [...(existing.excerptMedia || [])] : [];

  const cat = CATS.find(c => c.id === currentCat);
  document.getElementById('write-page-title').textContent = isEditMode ? '✏️ 문서 수정' : '📝 새 문서 작성';
  document.getElementById('write-page-sub').textContent   = cat ? (isEditMode ? cat.label + ' 카테고리 문서 수정' : cat.label + ' 카테고리에 새 문서 작성') : '';
  document.getElementById('w-title').value   = existing?.title   || '';
  document.getElementById('w-excerpt').value = existing?.excerpt || '';
  document.querySelector('.btn-submit').textContent = isEditMode ? '수정 완료' : '문서 발행';

  renderStepsEditor();
  renderExcerptMediaPreview();
  renderMediaPreview();
}

function initEditForm() {
  const art = (articles[currentCat] || []).find(a => a.id === currentArticleId);
  if (art) initWriteForm(art);
}

function cancelWrite() {
  if (isEditMode) navigate('article', currentCat);
  else navigate('category', currentCat);
}

/* ─── STEPS EDITOR ─── */
function renderStepsEditor() {
  document.getElementById('steps-editor').innerHTML = wSteps.map((s, si) => buildStepBlock(s, si)).join('');
}

function buildStepBlock(s, si) {
  return `<div class="step-editor-block" id="step-block-${si}">
    <div class="step-editor-header">
      <div class="step-editor-num">${si + 1}</div>
      <span class="step-editor-label">단계 ${si + 1}</span>
      ${wSteps.length > 1 ? `<button class="btn-remove-step" onclick="removeStep(${si})">×</button>` : ''}
    </div>
    <textarea class="step-editor-input" id="step-text-${si}"
      placeholder="${si + 1}단계 내용을 입력하세요" rows="2"
      oninput="wSteps[${si}].text=this.value">${s.text}</textarea>
    <div class="step-media-list" id="step-media-list-${si}">${buildStepMediaItems(si)}</div>
    <div class="step-upload-row">
      <button class="step-upload-btn" onclick="document.getElementById('step-img-${si}').click()">🖼️ 이미지 추가</button>
      <button class="step-upload-btn" onclick="document.getElementById('step-vid-${si}').click()">🎬 동영상 추가</button>
      <button class="step-upload-btn" onclick="document.getElementById('step-file-${si}').click()">📎 첨부파일 추가</button>
      <input type="file" id="step-img-${si}" accept="image/*"  multiple hidden onchange="handleStepMedia(this.files,${si})">
      <input type="file" id="step-vid-${si}" accept="video/*" multiple hidden onchange="handleStepMedia(this.files,${si})">
      <input type="file" id="step-file-${si}" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.csv,.hwp,.hwpx" multiple hidden onchange="handleStepMedia(this.files,${si})">
    </div>
  </div>`;
}

function buildStepMediaItems(si) {
  return (wSteps[si].media || []).map((m, mi) => {
    const pw = m.width  ? m.width  + 'px' : '200px';
    const ph = m.height ? m.height + 'px' : 'auto';
    return `<div class="step-media-item" id="step-media-${si}-${mi}">
      <div class="step-media-preview">
        ${buildMediaPreviewEl(m, pw, ph)}
      </div>
      <div class="step-media-info">
        <div class="step-media-top">
          <button class="btn-remove-step-media" onclick="removeStepMedia(${si},${mi})">×</button>
        </div>
        ${m.type !== 'file' ? `<div class="step-media-size">
          <div class="size-field">
            <label class="size-label">너비 (px)</label>
            <input class="size-input" type="number" min="50" max="1200" placeholder="자동" value="${m.width || ''}"
              oninput="previewStepSize(${si},${mi},'width',this.value)"
              onchange="updateStepSize(${si},${mi},'width',this.value)">
          </div>
          <div class="size-sep">×</div>
          <div class="size-field">
            <label class="size-label">높이 (px)</label>
            <input class="size-input" type="number" min="50" max="1200" placeholder="자동" value="${m.height || ''}"
              oninput="previewStepSize(${si},${mi},'height',this.value)"
              onchange="updateStepSize(${si},${mi},'height',this.value)">
          </div>
          <button class="btn-size-reset" onclick="resetStepSize(${si},${mi})">↺</button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function handleStepMedia(files, si) {
  for (const file of Array.from(files)) {
    showToast('⏫ 업로드 중...');
    try {
      const result = await uploadFile(file);
      wSteps[si].media.push({ ...result, width: null, height: null });
      refreshStepMediaList(si);
      showToast('✅ 저장되었습니다.');
    } catch (e) { showToast('⚠️ 업로드 실패: ' + e.message); }
  }
}

function removeStepMedia(si, mi) {
  const m = wSteps[si].media[mi];
  if (m?.url) deleteFile(m.url);
  wSteps[si].media.splice(mi, 1);
  refreshStepMediaList(si);
}

function previewStepSize(si, mi, prop, val) {
  const m = wSteps[si].media[mi];
  if (m.type === 'file') return;
  const tag = m.type === 'image' ? 'img' : 'video';
  const el  = document.querySelector(`#step-media-${si}-${mi} .step-media-preview ${tag}`);
  if (!el) return;
  const num = parseInt(val);
  if (prop === 'width')  el.style.width  = num > 0 ? num + 'px' : '200px';
  if (prop === 'height') el.style.height = num > 0 ? num + 'px' : 'auto';
}

function updateStepSize(si, mi, prop, val) {
  wSteps[si].media[mi][prop] = parseInt(val) > 0 ? parseInt(val) : null;
}

function resetStepSize(si, mi) {
  wSteps[si].media[mi].width = null;
  wSteps[si].media[mi].height = null;
  refreshStepMediaList(si);
}

function refreshStepMediaList(si) {
  const el = document.getElementById('step-media-list-' + si);
  if (el) el.innerHTML = buildStepMediaItems(si);
}

function addStep() {
  wSteps.forEach((s, i) => { const el = document.getElementById('step-text-' + i); if (el) s.text = el.value; });
  wSteps.push({ text: '', media: [] });
  renderStepsEditor();
}

function removeStep(i) {
  wSteps.forEach((s, idx) => { const el = document.getElementById('step-text-' + idx); if (el) s.text = el.value; });
  wSteps.splice(i, 1)[0].media?.forEach(m => m.url && deleteFile(m.url));
  renderStepsEditor();
}

/* ─── 요약 미디어 ─── */
async function handleExcerptMedia(files) {
  for (const file of Array.from(files)) {
    showToast('⏫ 업로드 중...');
    try {
      const result = await uploadFile(file);
      wExcerptMedia.push({ ...result, width: null, height: null });
      renderExcerptMediaPreview();
      showToast('✅ 저장되었습니다.');
    } catch (e) { showToast('⚠️ 업로드 실패: ' + e.message); }
  }
}

function renderExcerptMediaPreview() {
  const list = document.getElementById('excerpt-media-list');
  if (!list) return;
  list.innerHTML = wExcerptMedia.map((m, i) => buildExcerptMediaItem(m, i)).join('');
}

function buildExcerptMediaItem(m, i) {
  const pw = m.width  ? m.width  + 'px' : '200px';
  const ph = m.height ? m.height + 'px' : 'auto';
  return `<div class="step-media-item" id="excerpt-media-${i}">
    <div class="step-media-preview">
      ${buildMediaPreviewEl(m, pw, ph)}
    </div>
    <div class="step-media-info">
      <div class="step-media-top">
        <button class="btn-remove-step-media" onclick="removeExcerptMedia(${i})">×</button>
      </div>
      ${m.type !== 'file' ? `<div class="step-media-size">
        <div class="size-field">
          <label class="size-label">너비 (px)</label>
          <input class="size-input" type="number" min="50" max="1200" placeholder="자동" value="${m.width || ''}"
            oninput="previewExcerptSize(${i},'width',this.value)"
            onchange="updateExcerptSize(${i},'width',this.value)">
        </div>
        <div class="size-sep">×</div>
        <div class="size-field">
          <label class="size-label">높이 (px)</label>
          <input class="size-input" type="number" min="50" max="1200" placeholder="자동" value="${m.height || ''}"
            oninput="previewExcerptSize(${i},'height',this.value)"
            onchange="updateExcerptSize(${i},'height',this.value)">
        </div>
        <button class="btn-size-reset" onclick="resetExcerptSize(${i})">↺</button>
      </div>` : ''}
    </div>
  </div>`;
}

function removeExcerptMedia(i) {
  const m = wExcerptMedia[i];
  if (m?.url) deleteFile(m.url);
  wExcerptMedia.splice(i, 1);
  renderExcerptMediaPreview();
}

function previewExcerptSize(i, prop, val) {
  const m = wExcerptMedia[i];
  if (m.type === 'file') return;
  const tag = m.type === 'image' ? 'img' : 'video';
  const el  = document.querySelector(`#excerpt-media-${i} .step-media-preview ${tag}`);
  if (!el) return;
  const num = parseInt(val);
  if (prop === 'width')  el.style.width  = num > 0 ? num + 'px' : '200px';
  if (prop === 'height') el.style.height = num > 0 ? num + 'px' : 'auto';
}

function updateExcerptSize(i, prop, val) {
  wExcerptMedia[i][prop] = parseInt(val) > 0 ? parseInt(val) : null;
}

function resetExcerptSize(i) {
  wExcerptMedia[i].width = null;
  wExcerptMedia[i].height = null;
  renderExcerptMediaPreview();
}

/* ─── 문서 전체 첨부 미디어 ─── */
async function handleMediaUpload(files) {
  for (const file of Array.from(files)) {
    showToast('⏫ 업로드 중...');
    try {
      const result = await uploadFile(file);
      wMedia.push(result);
      renderMediaPreview();
      showToast('✅ 저장되었습니다.');
    } catch (e) { showToast('⚠️ 업로드 실패: ' + e.message); }
  }
}

function renderMediaPreview() {
  const grid = document.getElementById('media-preview-grid');
  if (!wMedia.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = wMedia.map((m, i) => `
    <div class="media-thumb ${m.type === 'video' ? 'video-thumb' : ''} ${m.type === 'file' ? 'file-thumb' : ''}">
      ${m.type === 'image' ? `<img src="${m.url}" alt="">` : m.type === 'video' ? `<video src="${m.url}" muted></video>` : `<div class="file-thumb-inner"><span>📎</span><span>${escHtml(m.name || '파일')}</span></div>`}
      <button class="btn-remove-media" onclick="removeMedia(${i})">×</button>
    </div>`).join('');
}

function removeMedia(i) {
  const m = wMedia[i];
  if (m?.url) deleteFile(m.url);
  wMedia.splice(i, 1);
  renderMediaPreview();
}

/* ─── SAVE ─── */
async function saveArticle() {
  const title   = document.getElementById('w-title').value.trim();
  const excerpt = document.getElementById('w-excerpt').value.trim();
  if (!title)   { showToast('⚠️ 제목을 입력해 주세요.'); return; }
  if (!excerpt) { showToast('⚠️ 요약을 입력해 주세요.'); return; }

  const finalSteps = wSteps
    .map((s, i) => { const el = document.getElementById('step-text-' + i); return { text: (el ? el.value : s.text).trim(), media: s.media || [] }; })
    .filter(s => s.text || s.media.length > 0);

  const payload = { title, excerpt, excerptMedia: [...wExcerptMedia], steps: finalSteps, media: [...wMedia] };

  showLoading(true);
  try {
    if (isEditMode) {
      const updated = await api('PUT', `/api/articles/${currentCat}/${currentArticleId}`, payload);
      const idx = articles[currentCat].findIndex(a => a.id === updated.id);
      if (idx !== -1) articles[currentCat][idx] = updated;
      showToast('✅ 문서가 수정되어 저장되었습니다.');
      navigate('article', currentCat);
    } else {
      const created = await api('POST', `/api/articles/${currentCat}`, payload);
      articles[currentCat].unshift(created);
      showToast('✅ 문서가 발행되어 저장되었습니다.');
      navigate('category', currentCat);
    }
  } catch (e) {
    showToast('⚠️ 저장 실패: ' + e.message);
  } finally {
    showLoading(false);
  }
}

/* ─── HIDE / UNHIDE ─── */
async function toggleHidden(catId, artId) {
  if (!isAdmin) return;
  const art = (articles[catId] || []).find(a => String(a.id) === String(artId));
  if (!art) return;
  const next = !art.hidden;
  art.hidden = next;                              /* 메모리 즉시 반영 */

  if (currentPage === 'article')       renderArticlePage();
  else if (currentPage === 'category') renderCategoryArticles();
  else if (currentPage === 'home')     renderHome();
  showToast(next ? '🙈 문서를 숨겼습니다. (관리자만 표시)' : '👁 문서 숨김을 해제했습니다.');

  try {
    await api('PUT', `/api/articles/${catId}/${artId}`, { hidden: next });
  } catch (e) {
    console.error('[HIDE] 저장 실패:', e.message);
    showToast('⚠ 저장 실패: ' + e.message);
  }
}

/* ─── DELETE ─── */
function openConfirmDelete(artId) {
  pendingDeleteId = artId;
  document.getElementById('confirm-overlay').classList.add('show');
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('show');
}

async function confirmDelete() {
  if (!pendingDeleteId) return;

  /* ID를 먼저 저장한 뒤 모달 닫기 */
  const catToNav   = currentCat;
  const idToDelete = String(pendingDeleteId);
  pendingDeleteId  = null;
  closeConfirm();

  /* 클라이언트 메모리에서 즉시 제거 → 화면 반영 */
  articles[catToNav] = (articles[catToNav] || []).filter(a => String(a.id) !== idToDelete);
  navigate('category', catToNav);
  showToast('🗑 문서가 삭제되었습니다.');

  /* 서버에 삭제 요청 (백그라운드) */
  try {
    await api('DELETE', `/api/articles/${catToNav}/${idToDelete}`);
  } catch (e) {
    console.error('[DELETE] 서버 삭제 실패:', e.message);
  }
}

/* ─── SEARCH ─── */
function onHeroSearch(val) {
  const q  = val.trim().toLowerCase();
  const dd = document.getElementById('search-dropdown');
  if (q.length < 2) { dd.classList.remove('show'); dd.innerHTML = ''; return; }
  const results = CATS.flatMap(cat =>
    visibleArticles(cat.id).filter(a => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)).map(a => ({ ...a, cat }))
  );
  dd.innerHTML = results.length === 0
    ? '<div class="search-no-result">검색 결과가 없습니다</div>'
    : results.slice(0, 8).map(a => `
        <div class="search-result-item" onclick="openArticle('${a.cat.id}',${a.id});closeSearchDropdown()">
          <span class="search-result-tag" style="background:${a.cat.bg};color:${a.cat.color}">${a.cat.label}</span>
          <div>
            <div class="search-result-title">${a.title}</div>
            <div class="search-result-exc">${a.excerpt.slice(0, 60)}…</div>
          </div>
        </div>`).join('');
  dd.classList.add('show');
}

function closeSearchDropdown() { document.getElementById('search-dropdown').classList.remove('show'); }

function fillHeroSearch(val) {
  document.getElementById('hero-search').value = val;
  onHeroSearch(val);
}

document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) closeSearchDropdown(); });

/* ─── LOGIN ─── */
function openLoginModal() {
  document.getElementById('login-id').value = '';
  document.getElementById('login-pw').value = '';
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('login-overlay').classList.add('show');
  setTimeout(() => document.getElementById('login-id').focus(), 50);
}

function closeLoginModal() { document.getElementById('login-overlay').classList.remove('show'); }

/* 현재 관리자 비밀번호: 변경 시 localStorage에 저장, 없으면 기본값(ADMIN.pw) */
function getAdminPw() {
  try { return localStorage.getItem('admate_admin_pw') || ADMIN.pw; }
  catch { return ADMIN.pw; }
}

function doLogin() {
  const id = document.getElementById('login-id').value.trim();
  const pw = document.getElementById('login-pw').value;
  if (id === ADMIN.id && pw === getAdminPw()) {
    isAdmin = true;
    localStorage.setItem('admate_admin', '1');
    closeLoginModal();
    showToast('✅ 관리자로 로그인되었습니다.');
    updateNav();
    if (currentPage === 'category') { document.getElementById('btn-write-new').style.display = 'flex'; renderCategoryArticles(); }
    if (currentPage === 'article')  renderArticlePage();
    if (currentPage === 'home')     renderHome();
  } else {
    const err = document.getElementById('login-error');
    err.textContent = '아이디 또는 비밀번호가 올바르지 않습니다.';
    err.style.display = 'block';
  }
}

function logout() {
  isAdmin = false;
  localStorage.removeItem('admate_admin');
  showToast('로그아웃 되었습니다.');
  updateNav();
  if (currentPage === 'write' || currentPage === 'edit') navigate('home');
  else if (currentPage === 'article')  renderArticlePage();
  else if (currentPage === 'category') { document.getElementById('btn-write-new').style.display = 'none'; renderCategoryArticles(); }
  else if (currentPage === 'home')     renderHome();
}

/* ─── CHANGE PASSWORD ─── */
function openPwModal() {
  if (!isAdmin) { openLoginModal(); return; }
  ['pw-current', 'pw-new', 'pw-confirm'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pw-error').style.display = 'none';
  document.getElementById('pw-overlay').classList.add('show');
  setTimeout(() => document.getElementById('pw-current').focus(), 50);
}

function closePwModal() { document.getElementById('pw-overlay').classList.remove('show'); }

function doChangePw() {
  const cur     = document.getElementById('pw-current').value;
  const next    = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;
  const err     = document.getElementById('pw-error');
  const fail = msg => { err.textContent = msg; err.style.display = 'block'; };

  if (cur !== getAdminPw())      return fail('현재 비밀번호가 올바르지 않습니다.');
  if (next.length < 4)           return fail('새 비밀번호는 4자 이상이어야 합니다.');
  if (next !== confirm)          return fail('새 비밀번호가 서로 일치하지 않습니다.');
  if (next === cur)              return fail('현재 비밀번호와 다른 비밀번호를 입력해 주세요.');

  try {
    localStorage.setItem('admate_admin_pw', next);
  } catch {
    return fail('비밀번호를 저장할 수 없습니다. 브라우저 설정을 확인해 주세요.');
  }
  closePwModal();
  showToast('🔑 비밀번호가 변경되었습니다.');
}

/* ─── TOAST ─── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ─── OVERLAY CLOSE ─── */
document.getElementById('login-overlay').addEventListener('click', function(e) { if (e.target === this) closeLoginModal(); });
document.getElementById('pw-overlay').addEventListener('click', function(e) { if (e.target === this) closePwModal(); });
document.getElementById('confirm-overlay').addEventListener('click', function(e) { if (e.target === this) closeConfirm(); });

/* ─── POPSTATE ─── */
window.addEventListener('popstate', () => {
  const { page, catId, artId } = parseHash();
  if (page === 'article' && catId && artId) { currentCat = catId; currentArticleId = artId; navigate('article', catId, true); }
  else if (page === 'category' && catId) navigate('category', catId, true);
  else navigate('home', null, true);
});

/* ─── INIT ─── */
(async () => {
  if (localStorage.getItem('admate_admin') === '1') isAdmin = true;
  await loadArticles();
  const { page, catId, artId } = parseHash();
  if (page === 'article' && catId && artId) { currentCat = catId; currentArticleId = artId; navigate('article', catId, true); }
  else if (page === 'category' && catId) navigate('category', catId, true);
  else { renderHome(); updateNav(); }
})();
