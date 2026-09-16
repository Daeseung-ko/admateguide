/* ══════════════════════════════════════════════
   X 캠페인 셋팅 시뮬레이터 — 공용 코어
   AdMate Help · standalone (simulator/)

   페이지 구조
     /simulator/            허브(캠페인: 이름 + 목표 선택)
     /simulator/<목표>/     목표별 페이지(광고그룹 → 광고 → 검토 및 시작)
   각 목표 폴더의 adgroup.js / ad.js 가 CAMPAIGN_MODULES[목표]에
   광고그룹·광고 단계 렌더러를 등록한다.

   페이지 설정: 각 index.html 이 core.js 보다 먼저
     window.SIM_PAGE = { mode:'hub' } 또는 { mode:'objective', objective:'reach' }
   를 선언한다.
══════════════════════════════════════════════ */

const PAGE = window.SIM_PAGE || { mode: 'hub' };

const X_LOGO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';

/* ─── 캠페인 목표 (6가지) ─── */
const OBJECTIVES = [
  { id: 'reach',      icon: '📣', name: '도달',
    desc: '최대한 많은 사람에게 광고를 표시합니다.',
    how:  '예산 내에서 최대한 많은 고유 사용자에게 도달하도록 광고가 최적화됩니다.',
    uses: ['브랜드 인지도', '노출 수'],
    goal: '노출 수', pay: '노출수 (CPM)',
    cpm: 4000, ctr: 0.010, result: '도달' },
  { id: 'engagement', icon: '❤️', name: '참여수',
    desc: '사람들이 게시물에 참여하도록 유도합니다.',
    how:  '내 콘텐츠에 마음에 들어요, 답글 또는 재게시할 가능성이 가장 높은 사용자에게 광고가 표시됩니다.',
    uses: ['마음에 들어요', '답글', '재게시'],
    goal: '참여수', pay: '참여수 (CPE)',
    cpm: 6000, ctr: 0.020, result: '참여' },
  { id: 'traffic',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:1em;height:1em"><path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59"/></svg>',
    name: '웹사이트 트래픽',
    desc: '사용자를 웹사이트 또는 랜딩 페이지로 유도합니다.',
    how:  '사이트를 클릭하여 행동을 취할 가능성이 가장 높은 사용자에게 광고를 표시합니다.',
    uses: ['링크 클릭수', '랜딩 페이지 조회수'],
    goal: '링크 클릭수', pay: '클릭당 (CPC)',
    cpm: 7000, ctr: 0.018, result: '클릭' },
  { id: 'video',      icon: '▶️', name: '동영상 조회 수',
    desc: '동영상을 시청할 가능성이 높은 사용자에게 동영상을 홍보합니다.',
    how:  '동영상을 시청할 가능성이 가장 높은 사용자에게 제공되어 완료된 조회수를 극대화합니다.',
    uses: ['동영상 조회 수', '브랜드 인지도'],
    goal: '동영상 조회 수', pay: '조회당 (CPV)',
    cpm: 3500, ctr: 0.045, result: '조회' },
  { id: 'app',        icon: '📱', name: '앱 설치수',
    desc: '모바일 앱 다운로드를 유도합니다.',
    how:  '광고가 앱 스토어 목록에 직접 연결되며 다운로드 가능성이 높은 사용자를 타겟팅합니다.',
    uses: ['앱 설치수', '앱 클릭수'],
    goal: '앱 설치수', pay: '설치당',
    cpm: 11000, ctr: 0.012, result: '설치' },
  { id: 'sales',      icon: '🛍️', name: '판매',
    desc: '웹사이트에서 구매, 가입 또는 기타 전환을 유도합니다.',
    how:  '사이트에서 구매 또는 기타 전환 이벤트를 완료할 가능성이 가장 높은 사용자에게 최적화하여 게재합니다.',
    uses: ['전환', '웹사이트 구매'],
    goal: '전환', pay: '노출수 (CPM)',
    cpm: 12000, ctr: 0.008, result: '전환' },
];

/* ─── 위치 (국내는 도 단위 + 대표 국가 30개) · size = 추정 도달 가능 사용자(백만) ─── */
const ALL_LOCATIONS = [
  /* 국내 — 도 단위 */
  { v: '대한민국 전체', size: 20 },
  { v: '경기도', size: 7 }, { v: '강원도', size: 0.8 },
  { v: '충청북도', size: 0.8 }, { v: '충청남도', size: 1.1 },
  { v: '전라북도', size: 0.9 }, { v: '전라남도', size: 0.9 },
  { v: '경상북도', size: 1.3 }, { v: '경상남도', size: 1.7 },
  { v: '제주도', size: 0.4 },
  /* 해외 국가 */
  { v: '미국', size: 95 }, { v: '일본', size: 68 }, { v: '인도', size: 27 },
  { v: '인도네시아', size: 24 }, { v: '영국', size: 23 }, { v: '브라질', size: 22 },
  { v: '터키', size: 16 }, { v: '멕시코', size: 14 }, { v: '사우디아라비아', size: 14 },
  { v: '프랑스', size: 12 }, { v: '독일', size: 11 }, { v: '태국', size: 11 },
  { v: '스페인', size: 10 }, { v: '캐나다', size: 10 }, { v: '필리핀', size: 10 },
  { v: '이탈리아', size: 9 }, { v: '호주', size: 8 }, { v: '아르헨티나', size: 7 },
  { v: '이집트', size: 6 }, { v: '콜롬비아', size: 5 }, { v: '말레이시아', size: 5 },
  { v: '베트남', size: 4 }, { v: '네덜란드', size: 4 }, { v: '폴란드', size: 4 },
  { v: '파키스탄', size: 4 }, { v: '나이지리아', size: 4 }, { v: '아랍에미리트', size: 3 },
  { v: '싱가포르', size: 3 }, { v: '대만', size: 3 }, { v: '홍콩', size: 2 },
];

const LANGS = ['한국어', '영어', '일본어', '중국어', '스페인어', '프랑스어'];
const INTERESTS = [
  'Anime', 'Art', 'Art / Design', 'Art / Photography', 'Beauty',
  'Business & finance', 'Business & finance / Cryptocurrency', 'Business & finance / Entrepreneurship',
  'Business & finance / Investing', 'Business & finance / Marketing',
  'Career', 'Cars', 'Celebrity', 'Dance', 'Education', 'Fashion',
  'Food', 'Food / Baking', 'Food / Cooking', 'Food / Drinks', 'Food / Restaurants',
  'Gaming',
  'Health & fitness', 'Health & fitness / Exercise', 'Health & fitness / Nutrition',
  'Home & Garden', 'Memes', 'Motorcycles', 'Movies & TV',
  'Music', 'Music / Classical', 'Music / Country', 'Music / Electronic', 'Music / Hip hop',
  'Music / Jazz', 'Music / Pop', 'Music / Rock',
  'News / Crime', 'News / Elections', 'News / National', 'News / Politics',
  'Pets', 'Pets / Cats', 'Pets / Dogs', 'Podcasts',
  'Relationships', 'Relationships / Dating', 'Relationships / Family',
  'Relationships / Friendship', 'Relationships / Marriage',
  'Science', 'Shopping', 'Sports',
  'Sports / Athletics', 'Sports / Baseball', 'Sports / Basketball', 'Sports / Boxing',
  'Sports / Cricket', 'Sports / Cycling', 'Sports / Esports', 'Sports / Golf',
  'Sports / Ice hockey', 'Sports / MMA', 'Sports / Motorsports',
  'Sports / NBA', 'Sports / NFL', 'Sports / NHL', 'Sports / NASCAR',
  'Sports / Olympics', 'Sports / Racing', 'Sports / Rugby', 'Sports / Skiing',
  'Sports / Soccer', 'Sports / Tennis',
  'Streaming',
  'Technology', 'Technology / AI', 'Technology / Computers', 'Technology / Gadgets', 'Technology / Mobile',
  'Travel',
];
/* 게재 위치 — 홈 타임라인은 항상 포함(잠금) */
const PLACEMENTS = [
  { v: '홈 타임라인', desc: '사용자의 홈 피드에 광고를 표시합니다.', locked: true },
  { v: '검색 결과',   desc: '검색 결과와 함께 광고를 표시합니다.' },
  { v: '프로필',      desc: '사용자 프로필에 광고를 표시합니다.' },
  { v: '답글',        desc: '답글 스레드에 광고를 표시합니다.' },
];
/* 기기 OS 버전 옵션 */
const IOS_VERSIONS     = ['All versions', 'iOS 18 이상', 'iOS 17 이상', 'iOS 16 이상', 'iOS 15 이상'];
const ANDROID_VERSIONS = ['All versions', 'Android 15 이상', 'Android 14 이상', 'Android 13 이상', 'Android 12 이상'];
/* 연령 범위 옵션 */
const AGE_MIN_OPTS = ['18', '21', '25', '35', '50'];
const AGE_MAX_OPTS = ['and up', '24', '34', '49', '54'];
/* 업종 */
const INDUSTRIES = [
  { v: '게임',      icon: '🎮' }, { v: '금융',      icon: '💰' }, { v: '가전',      icon: '📺' },
  { v: '방송/통신', icon: '📡' }, { v: '앱/사이트', icon: '🌐' }, { v: '패션',      icon: '👗' },
  { v: '화장품',    icon: '💄' }, { v: '수송',      icon: '🚚' }, { v: '식음료',    icon: '🍔' },
  { v: '단체',      icon: '🤝' }, { v: '쇼핑몰',    icon: '🛒' }, { v: '교육',      icon: '🎓' },
  { v: '관광/레저', icon: '✈️' }, { v: '컴퓨터',    icon: '💻' }, { v: '의료/건강', icon: '💊' },
  { v: '문화/예술', icon: '🎨' }, { v: '생활/잡화', icon: '🧺' }, { v: '주택/가구', icon: '🛋️' },
  { v: '기타',      icon: '✨' },
];

const SOURCES = {
  langs: LANGS,
  interests: INTERESTS,
};

/* ─── 상태 ─── */
/* 자금 소스(IO) 목록 — 검토 및 시작 상단 드롭다운에서 선택 */
const FUNDING_SOURCES = [
  '@nas_tw_PTw_2026Q2 (T3282869)',
  '@nas_tw_PTw_2026Q1 (T3199041)',
  '@nas_tw_PTw_2026Q3 (T3341257)',
];
function pad(n) { return String(n).padStart(2, '0'); }
function today(o = 0) { const d = new Date(); d.setDate(d.getDate() + o); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function nowTime() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function defaultCampaignName() {
  const d = new Date();
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `Campaign — ${date} — ${time}`;
}
function initialState() {
  return {
    step: 0, finished: false,
    /* 1 캠페인 */
    name: defaultCampaignName(),
    industries: [],
    objective: 'reach',
    fundingSource: FUNDING_SOURCES[0], // 자금 소스 (IO 설정) — 검토 및 시작 상단에서 선택
    /* 2 광고그룹 · 세부 정보 */
    adGroupName: 'Ad group 1',
    budget: 30000, spendCap: '',
    start: today(0), startTime: nowTime(),
    end: '', endTime: '',
    cal: { open: null, y: 0, m: 0 },
    /* 2 광고그룹 · 인구통계 */
    locIncluded: ['대한민국 전체'], locExcluded: [], locMode: 'include',
    langs: ['한국어'], gender: '전체',
    ageMode: 'all', ageMin: '18', ageMax: 'and up',
    osMode: 'all',
    devIos: true, devAndroid: true, devWeb: true,
    iosVer: 'All versions', androidVer: 'All versions',
    deviceModel: '', carrier: '', customAudience: '',
    /* 2 광고그룹 · 전달 및 게재 위치 */
    bid: 'auto', maxBid: '', payMethod: 'cpm', optGoal: 'install', placementMode: 'all',
    convEvent: '', convOpen: false, mmpOpen: false,
    adNoticeSeen: false, // 광고 만들기 진입 안내 팝업 확인 여부 (세션 내 1회)
    introSeen: false, // 시뮬레이터 시작 안내 팝업 확인 여부 (세션 내 1회, 새로고침 시 다시 표시)
    placements: ['홈 타임라인', '검색 결과', '프로필', '답글'],
    advOpen: false, pacing: 'standard', freqMode: 'auto', freqCap: '2', freqPeriod: '7일', gcmImp: '', gcmClick: '',
    /* 2 광고그룹 · 고급 타겟팅 */
    targetingOpt: true, interests: [], keywords: [], lookalikes: [],
    retargetPast: false,
    retargetType: 'People who saw your posts',
    postType: 'Organic posts',
    promoApp: '',
    /* 3 광고 */
    adName: 'Ad 1', adText: '', adUrl: '', adAI: false,
    linkTarget: '', adTitle: '', // 링크 대상 선택(website/app)과 제목
    appCta: 'Install', appStore: 'South Korea', // 링크 대상 '앱' — 클릭 유도문안/기본 앱 스토어
    appIos: false, appAndroid: false, // 플랫폼 체크 (기본 해제)
    appIosApp: '', appIosDeep: '', appAndApp: '', appAndDeep: '',
    adMedia: '', adMediaOpen: false, // 업로드 이미지(dataURL)와 안내 팝업 — persist 제외(새로고침 시 삭제)
  };
}
const state = initialState();
const collapsed = {}; // 광고그룹 섹션 접힘 상태

const STEPS = ['캠페인', '광고그룹', '광고', '검토 및 시작'];
/* 단계별 URL 해시 — 캠페인은 허브(#campaign), 나머지는 목표 페이지(#adgroup/#ad/#review) */
const STEP_HASHES = ['campaign', 'adgroup', 'ad', 'review'];
function syncHash() {
  if (PAGE.mode !== 'objective') return;
  const h = '#' + STEP_HASHES[state.step];
  if (location.hash !== h) location.hash = h; // 단계 이동마다 히스토리 항목 생성 (뒤로가기 지원)
}

/* ─── 페이지 간 상태 유지 (sessionStorage) ─── */
const STORE_KEY = 'xsim-state';
function persist() {
  try {
    const { cal, convOpen, mmpOpen, adMedia, adMediaOpen, ...rest } = state;
    sessionStorage.setItem(STORE_KEY, JSON.stringify(rest));
  } catch (e) { /* ignore */ }
}
function restore() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY));
    if (saved) Object.assign(state, saved);
  } catch (e) { /* ignore */ }
  state.cal = { open: null, y: 0, m: 0 };
}

/* ─── 유틸 ─── */
function compact(n) {
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '억';
  if (n >= 1e4) return Math.round(n / 1e4).toLocaleString() + '만';
  return Math.round(n).toLocaleString();
}
function won(n) { return '₩' + Math.round(n).toLocaleString(); }
function days() {
  if (!state.end) return 7; // 무기한 운영 → 7일 기준
  const d = (new Date(state.end) - new Date(state.start)) / 864e5;
  return Math.max(1, Math.round(d) || 1);
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

const MONTHS_EN    = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDT(d, t) {
  if (!d) return '';
  const [y, m, dd] = d.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${dd}, ${y}, ${t || '00:00'} GMT+9`;
}

/* ─── 예상치 계산 (검토 요약의 총 예산 등에 사용) ─── */
function locSize(v) { return ALL_LOCATIONS.find(x => x.v === v)?.size || 0; }
function estimate() {
  const obj = OBJECTIVES.find(o => o.id === state.objective) || OBJECTIVES[0];
  const D = days();
  const totalBudget = state.budget * D;
  return { obj, D, totalBudget };
}
function refreshEstimate() { /* 예상 성과 위젯 제거됨 — 호환용 no-op */ }

/* ══════════════════════════════════════════════
   렌더링
══════════════════════════════════════════════ */
function renderSteps() {
  document.getElementById('sim-steps').innerHTML = STEPS.map((label, i) => {
    const cls = [
      i < state.step || state.finished ? 'done' : i === state.step ? 'active' : '',
      !state.finished && canJumpTo(i) ? 'clickable' : '',
    ].join(' ');
    const line = i < STEPS.length - 1 ? `<div class="sim-step-line"></div>` : '';
    const inner = (i < state.step || state.finished) ? '✓' : (i + 1);
    return `<div class="sim-step ${cls}">
      <div class="sim-step-dot" onclick="SIM.goto(${i})">${inner}<div class="sim-step-label">${label}</div></div>${line}</div>`;
  }).join('');
}

/* i단계로 바로 이동 가능한지 — 뒤로는 항상, 앞으로는 중간 단계가 모두 유효할 때만 */
function canJumpTo(i) {
  if (i === state.step) return false;
  if (i < state.step) return true;
  for (let s = state.step; s < i; s++) if (!canProceedAt(s)) return false;
  return true;
}

function renderStage(animate) {
  const stage = document.getElementById('sim-stage');
  let html = '';
  if (state.finished)        html = panelDone();
  else if (state.step === 0) html = panelCampaign();
  else if (state.step === 1) html = panelAdGroup();
  else if (state.step === 2) html = panelAdStep();
  else if (state.step === 3) html = panelReview();
  /* 안내 팝업들은 패널(진입 애니메이션 transform) 밖에 둬야 fixed 가 뷰포트 기준으로 잡힌다 */
  let notice = '';
  if (!state.finished && state.step === 2 && !state.adNoticeSeen) notice = adNoticeModal();
  else if (PAGE.mode === 'hub' && !state.finished && state.step === 0 && !state.introSeen) notice = introModal();
  stage.innerHTML = `<div class="sim-panel"${animate ? '' : ' style="animation:none"'}>${html}</div>${notice}`;
  renderFooter();
  persist();
  syncHash();
}

/* 목표별 모듈 (각 목표 폴더의 adgroup.js / ad.js 가 등록) */
function modOf() {
  const mods = window.CAMPAIGN_MODULES || {};
  return mods[state.objective] || mods[PAGE.objective] || Object.values(mods)[0] || null;
}
function panelAdGroup() {
  const mod = modOf();
  return (mod && mod.adGroup) ? mod.adGroup() : '<div class="sim-card">이 목표의 광고그룹 모듈(adgroup.js)을 불러오지 못했습니다.</div>';
}
function panelAdStep() {
  const mod = modOf();
  return (mod && mod.ad) ? mod.ad() : '<div class="sim-card">이 목표의 광고 모듈(ad.js)을 불러오지 못했습니다.</div>';
}

/* ─── 공통 UI 조각 ─── */
function sectionCard(id, icon, title, bodyHTML) {
  const c = collapsed[id];
  return `<div class="sim-card sim-sec">
    <button class="sim-sec-head" onclick="SIM.toggleCard('${id}')">
      <span class="sim-sec-ic">${icon}</span>
      <span class="sim-sec-title">${title}</span>
      <span class="sim-sec-chev ${c ? '' : 'open'}">▾</span>
    </button>
    ${c ? '' : `<div class="sim-sec-body">${bodyHTML}</div>`}
  </div>`;
}

function flabel(title, desc, optional) {
  return `<div class="sim-flabel">${title}${optional ? ' <span class="sim-optional">(선택 사항)</span>' : ''}</div>
    ${desc ? `<div class="sim-fdesc">${desc}</div>` : ''}`;
}

/* 검색형 다중 선택 (언어 등) */
function searchPicker(field, placeholder, tagIcon, includedLabel) {
  const included = state[field];
  return `
    <div class="sim-search-wrap">
      <span class="sim-search-ic">🔍</span>
      <input class="sim-input sim-search" placeholder="${placeholder}"
             oninput="SIM.suggest('${field}', this.value)"
             onfocus="SIM.suggest('${field}', this.value)"
             onblur="SIM.hideSuggest()">
      <div class="sim-suggest" id="suggest-${field}"></div>
    </div>
    ${included.length ? `
      <div class="sim-included-label">${includedLabel || '포함됨'}</div>
      <div class="sim-tags">${included.map(v => `
        <span class="sim-tag">${tagIcon || ''}${v}<button class="sim-tag-x" onclick="SIM.removeTag('${field}','${v}')">×</button></span>`).join('')}
      </div>` : ''}`;
}

/* 포함됨 태그 목록 */
function includedTags(field, label) {
  const included = state[field];
  return included.length ? `
    <div class="sim-included-label">${label || '포함됨'}</div>
    <div class="sim-tags">${included.map(v => `
      <span class="sim-tag">${v}<button class="sim-tag-x" onclick="SIM.removeTag('${field}','${v}')">×</button></span>`).join('')}
    </div>` : '';
}

/* 체크박스형 검색 선택 (관심사) — 드롭다운이 닫히지 않아 한 번에 여러 개 체크 가능 */
function checkSearchPicker(field, placeholder) {
  return `
    <div class="sim-search-wrap">
      <span class="sim-search-ic">🔍</span>
      <input class="sim-input sim-search" id="search-${field}" placeholder="${placeholder}"
             oninput="SIM.suggestCheck('${field}', this.value)"
             onfocus="SIM.suggestCheck('${field}', this.value)"
             onblur="SIM.hideSuggest()">
      <div class="sim-suggest" id="suggest-${field}"></div>
    </div>
    <div id="tagswrap-${field}">${includedTags(field)}</div>`;
}

/* 위치 선택 — 포함/제외 모드 + 다중 선택 */
function locationPicker() {
  return `
    <div class="sim-search-wrap">
      <span class="sim-search-ic">🔍</span>
      <input class="sim-input sim-search sim-search-mode" placeholder="국가, 지역, 도시 검색..."
             oninput="SIM.suggest('loc', this.value)"
             onfocus="SIM.suggest('loc', this.value)"
             onblur="SIM.hideSuggest()">
      <select class="sim-mode-sel" onchange="SIM.setLocMode(this.value)">
        <option value="include" ${state.locMode === 'include' ? 'selected' : ''}>포함</option>
        <option value="exclude" ${state.locMode === 'exclude' ? 'selected' : ''}>제외</option>
      </select>
      <div class="sim-suggest" id="suggest-loc"></div>
    </div>
    ${state.locIncluded.length ? `
      <div class="sim-included-label">포함됨</div>
      <div class="sim-tags">${state.locIncluded.map(v => `
        <span class="sim-tag">📍 ${v}<button class="sim-tag-x" onclick="SIM.removeLoc('locIncluded','${v}')">×</button></span>`).join('')}
      </div>` : ''}
    ${state.locExcluded.length ? `
      <div class="sim-included-label excluded">제외됨</div>
      <div class="sim-tags">${state.locExcluded.map(v => `
        <span class="sim-tag excluded">📍 ${v}<button class="sim-tag-x" onclick="SIM.removeLoc('locExcluded','${v}')">×</button></span>`).join('')}
      </div>` : ''}`;
}

/* Enter 로 추가하는 자유 입력 (키워드·팔로워 유사) */
function enterPicker(field, placeholder, tagIcon) {
  const items = state[field];
  return `
    <div class="sim-search-wrap">
      <span class="sim-search-ic">🔍</span>
      <input class="sim-input sim-search" placeholder="${placeholder}"
             onkeydown="SIM.addOnEnter(event,'${field}')">
    </div>
    ${items.length ? `<div class="sim-tags" style="margin-top:10px">${items.map((v, i) => `
      <span class="sim-tag">${tagIcon || ''}${esc(v)}<button class="sim-tag-x" onclick="SIM.removeAt('${field}',${i})">×</button></span>`).join('')}
    </div>` : ''}`;
}

/* 홍보할 앱 — 모바일 앱 선택 셀렉트 (앱 설치수는 전용 섹션, 그 외 목표는 고급 타겟팅 하단)
   withGap: 위 요소와의 간격 필요 시 true (섹션 단독 배치면 생략) */
const PROMO_APPS = ['내 앱 (App Store)', '내 앱 (Google Play)'];
function promoAppField(withGap) {
  return `
    <div class="sim-field${withGap ? ' sim-gap-top' : ''}">
      <div class="sim-label-row">
        <div>${flabel('홍보할 앱', '프로모션할 모바일 앱을 선택하세요. 정확한 측정을 위해 전환 추적이 설정되어 있는지 확인하세요.')}</div>
        <span class="sim-applink">앱 관리 ⧉</span>
      </div>
      <select class="sim-input sim-select" style="width:100%;color:${state.promoApp ? '#1e1e1e' : '#8c8880'}"
              onchange="SIM.setPromoApp(this.value === '앱 선택...' ? '' : this.value)">
        ${['앱 선택...', ...PROMO_APPS].map(v => `<option ${(state.promoApp || '앱 선택...') === v ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
      ${state.promoApp ? `
      <div class="sim-mmp-note">
        <span class="sim-mmp-note-ic">ⓘ</span>
        <span>이 앱에서 app installs 목표를 사용하려면 다음을 통해 an install event을(를) 추가해야 합니다: <span class="sim-mmp-link" onclick="SIM.setBool('mmpOpen', true)">모바일 측정 파트너</span>.</span>
      </div>` : ''}
      ${state.mmpOpen ? mmpModal() : ''}
    </div>`;
}

/* 모바일 측정 파트너(MMP) 관리 모달 — 홍보할 앱 선택 시 안내 문구의 링크로 연다 */
const MMP_PARTNERS = [
  { name: 'Adjust',    logo: '<svg viewBox="0 0 136 32" style="width:36px;height:auto;display:block"><path d="M29 26 L17 5 L10 20 C10 20 7.5 26 3.5 25.5 C0 25 0.5 20.5 3 19 C6 17.2 9 18.5 10 20" fill="none" stroke="#0a0a0a" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/><text x="33" y="26" font-family="Pretendard,Arial,sans-serif" font-weight="800" font-size="25" letter-spacing=".5" fill="#0a0a0a">DJUST</text></svg>', url: 'https://help.adjust.com/ko/article/twitter-integration-details' },
  { name: 'AppsFlyer', logo: '<svg viewBox="0 0 152 32" style="width:38px;height:auto;display:block"><path d="M1 11 L12 5 L13 16 L4 18 Z" fill="#8dc63f"/><path d="M4 21 L12 19 L10 29 Z" fill="#8dc63f"/><path d="M15 4 L25 9 L17 16 Z" fill="#4a90d9"/><path d="M14 19 L22 18 L16 27 Z" fill="#4a90d9"/><text x="29" y="24" font-family="Pretendard,Arial,sans-serif" font-weight="700" font-size="21"><tspan fill="#8dc63f">Apps</tspan><tspan fill="#4a90d9">Flyer</tspan></text></svg>', url: 'https://support.appsflyer.com/hc/ko/articles/4410472471825-X-Ads-%EC%9D%B4%EC%A0%84%EC%9D%98-Twitter-Ads-%EC%97%B0%EB%8F%99-%EC%84%A4%EC%A0%95' },
  { name: 'Branch',    logo: '<svg viewBox="0 0 106 40" style="width:34px;height:auto;display:block"><text x="0" y="35" font-family="Pretendard,Arial,sans-serif" font-weight="500" font-size="29" fill="#3b4351">branc</text><path d="M81 35 V8 M81 14 C81 9 89 9 89 14 V35 M81 12 L72 6 M81 8 L91 4 M81 17 L88 20" fill="none" stroke="#3b4351" stroke-width="2.6" stroke-linecap="round"/><circle cx="70" cy="5" r="3.4" fill="#2ea3e8" stroke="#3b4351" stroke-width="1.6"/><circle cx="93" cy="3.4" r="3.4" fill="#2ea3e8" stroke="#3b4351" stroke-width="1.6"/><circle cx="90" cy="21" r="3.4" fill="#2ea3e8" stroke="#3b4351" stroke-width="1.6"/></svg>', url: 'https://help.branch.io/marketer-hub/docs/twitter-ads' },
  { name: 'Kochava',   logo: '<svg viewBox="0 0 148 30" style="width:38px;height:auto;display:block"><text x="0" y="23" font-family="Pretendard,Arial,sans-serif" font-weight="800" font-size="22" letter-spacing=".5" fill="#0a0a0a">KOCHAVA</text><path d="M137 5 L139.4 11.6 L146.4 11.6 L140.9 16 L143 22.8 L137 18.6 L131 22.8 L133.1 16 L127.6 11.6 L134.6 11.6 Z" fill="#c62031"/></svg>', url: 'https://support.kochava.com/articles/campaign-management/583-create-a-twitter-campaign/#authenticating-an-x-account' },
  { name: 'Singular',  logo: '<svg viewBox="0 0 158 36" style="width:38px;height:auto;display:block"><circle cx="15" cy="18" r="10.5" fill="none" stroke="#3f7fdd" stroke-width="6.5" stroke-dasharray="8 3"/><text x="31" y="27" font-family="Pretendard,Arial,sans-serif" font-weight="700" font-size="25" fill="#3f7fdd">singular</text></svg>', url: 'https://support.singular.net/hc/ko/articles/360003123352-X-%ED%8A%B8%EC%9C%84%ED%84%B0-%EA%B4%91%EA%B3%A0-%EC%96%B4%ED%8A%B8%EB%A6%AC%EB%B7%B0%EC%85%98-%ED%86%B5%ED%95%A9' },
];
function mmpModal() {
  return `
    <div class="sim-mmp-overlay" onclick="if(event.target===this)SIM.setBool('mmpOpen',false)">
      <div class="sim-mmp-modal">
        <button class="sim-mmp-x" onclick="SIM.setBool('mmpOpen',false)">×</button>
        <div class="sim-mmp-title">모바일 측정 파트너 관리</div>
        <div class="sim-mmp-sub">모바일 측정 파트너를 연결하여 앱 내 이벤트를 추적하세요. 아래 5개 MMP사만 지원합니다.</div>
        ${MMP_PARTNERS.map(p => `
        <div class="sim-mmp-row">
          <span class="sim-mmp-logo">${p.logo}</span>
          <span class="sim-mmp-txt">
            <span class="sim-mmp-name">${p.name}</span>
            <span class="sim-mmp-status">연결되지 않음</span>
          </span>
          <a class="sim-mmp-connect" href="${p.url}" target="_blank" rel="noopener">연결 →</a>
        </div>`).join('')}
        <div class="sim-mmp-foot">
          <button class="sim-btn-ghost" onclick="SIM.setBool('mmpOpen',false)">닫기</button>
        </div>
      </div>
    </div>`;
}

/* 시뮬레이터 시작 안내 팝업 — 허브 첫 진입 시 1회 표시 (확인 시 state.introSeen) */
function introModal() {
  return `
    <div class="sim-mmp-overlay">
      <div class="sim-mmp-modal" style="width:440px">
        <div class="sim-mmp-title">X 캠페인 셋팅 시뮬레이터</div>
        <div class="sim-mmp-sub" style="margin-bottom:24px">캠페인 셋팅을 미리 체험하고, 벤치마크 데이터를 확인 할 수 있습니다</div>
        <div class="sim-mmp-foot" style="margin-top:0">
          <button class="sim-btn-primary" onclick="SIM.setBool('introSeen', true)">시작하기</button>
        </div>
      </div>
    </div>`;
}

/* 광고 만들기 진입 안내 팝업 — 세션 내 1회 표시 (확인 시 state.adNoticeSeen) */
function adNoticeModal() {
  return `
    <div class="sim-mmp-overlay">
      <div class="sim-mmp-modal" style="width:460px">
        <div class="sim-mmp-title">광고 만들기 안내</div>
        <div class="sim-mmp-sub" style="margin-bottom:24px;line-height:1.7">
          <b style="color:#1e1e1e">[필수 참고]</b><br>
          실제 트윗 생성은 작성 도구를 통해 생성 후 불러오기로 셋팅하시고,<br>
          <b style="color:#e0245e">본문에 #해시태그/URL/체크 표시 이모지는 사용 불가능합니다 (오가닉 포함)</b><br>
          <b style="color:#1e1e1e">[중요]</b><br>
          <b style="color:#e0245e">오가닉 트윗을 끌어와서 셋팅시에 트윗 수정 불가능합니다.(랜딩URL 삽입 불가)</b>
        </div>
        <div class="sim-mmp-foot" style="margin-top:0">
          <button class="sim-btn-primary" onclick="SIM.setBool('adNoticeSeen', true)">확인</button>
        </div>
      </div>
    </div>`;
}

/* ─── 광고 만들기 공용 컴포저 (X 광고 세부 정보 + 아이폰 미리보기) ───
   6개 목표 ad.js 가 모두 이 함수를 호출한다. 수정 시 전 목표에 반영됨. */
const ADX_ICONS = {
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M16.9 4.1a2.1 2.1 0 0 1 3 3L8.4 18.6l-4 1 1-4L16.9 4.1z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:15px;height:15px"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/></svg>',
  reply: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M8.5 19H8c-3.3 0-6-2.7-6-6v-.5C2 9.5 4.5 7 7.5 7h9c3 0 5.5 2.5 5.5 5.5S19.5 18 16.5 18H13l-4.5 4v-3z" transform="translate(0,-2)"/></svg>',
  rt:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 9V8a3 3 0 0 1 3-3H16M13.5 2l3 3-3 3M19.5 15v1a3 3 0 0 1-3 3H8M10.5 22l-3-3 3-3"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20.5C7.5 16.3 3.5 13.2 3.5 9.4 3.5 6.7 5.6 5 7.9 5c1.6 0 3.1.8 4.1 2.2C13 5.8 14.5 5 16.1 5c2.3 0 4.4 1.7 4.4 4.4 0 3.8-4 6.9-8.5 11.1z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15V3M7.5 7.5 12 3l4.5 4.5M4.5 13v6a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6"/></svg>',
  signal:'<svg viewBox="0 0 18 12" fill="currentColor" style="width:15px;height:11px"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>',
  wifi:  '<svg viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:11px"><path stroke-linecap="round" d="M1.5 4.5a10 10 0 0 1 13 0M4 7.3a6.3 6.3 0 0 1 8 0M6.6 10a2.6 2.6 0 0 1 2.8 0"/></svg>',
  batt:  '<svg viewBox="0 0 25 12" style="width:22px;height:11px"><rect x=".5" y=".5" width="20" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4"/><rect x="2.5" y="2.5" width="16" height="7" rx="1.5" fill="currentColor"/><path d="M22.5 4v4a2.2 2.2 0 0 0 0-4z" fill="currentColor" opacity=".4"/></svg>',
};
function adxAvatar(cls) {
  return `<span class="sim-adx-avatar ${cls || ''}"><b>kt</b> nasmedia</span>`;
}
function adxSkel(half) {
  return `
    <div class="sim-skel-row${half ? ' half' : ''}">
      <span class="sim-skel-av"></span>
      <span class="sim-skel-col">
        <span class="sim-skel-bar" style="width:52%"></span>
        <span class="sim-skel-bar" style="width:88%"></span>
        <span class="sim-skel-dots"><i></i><i></i><i></i><i></i></span>
      </span>
    </div>`;
}
/* 아이폰 광고 미리보기 (광고 만들기 우측 + 검토 및 시작 우측 공용) */
function adPhonePreview() {
  const txt = state.adText;
  /* 미리보기 이미지 — 업로드 전에는 1:1 빈 플레이스홀더 표시 */
  const prevImg = state.adMedia
    ? `<img class="sim-tw-img plain" src="${state.adMedia}" alt="광고 이미지">`
    : `<div class="sim-tw-imgph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path stroke-linecap="round" stroke-linejoin="round" d="M4 18l5-5 3.5 3.5L16 13l4 4"/></svg></div>`;
  return `
      <div class="sim-adx-right">
        <div class="sim-phone">
          <div class="sim-phone-screen">
            <div class="sim-phone-status">
              <span class="sim-phone-time">9:41</span>
              <span class="sim-phone-island"></span>
              <span class="sim-phone-sig">${ADX_ICONS.signal}${ADX_ICONS.wifi}${ADX_ICONS.batt}</span>
            </div>
            ${adxSkel(true)}
            <div class="sim-tw">
              ${adxAvatar('sm')}
              <div class="sim-tw-body">
                <div class="sim-tw-head">
                  <span class="sim-tw-name">KT 나스미디어</span>
                  <span class="sim-adx-badge sm">✓</span>
                  <span class="sim-tw-handle">@nas_tw</span>
                  <span class="sim-tw-ad">Ad</span>
                </div>
                <div class="sim-tw-text ${txt.trim() ? '' : 'empty'}" id="xp-text">${txt.trim() ? esc(txt) : ''}</div>
                ${state.linkTarget === 'app' ? `
                <div class="sim-tw-appcard">
                  ${prevImg}
                  <div class="sim-tw-appbar">
                    <span class="sim-tw-appname">${esc(state.appIosApp || state.appAndApp || '앱 이름')}</span>
                    <span class="sim-tw-appcta">${esc(state.appCta)}</span>
                  </div>
                </div>` : `
                <div class="sim-tw-imgwrap">
                  ${prevImg}
                  <span class="sim-tw-imgtitle ${state.adTitle.trim() ? '' : 'empty'}" id="xp-title">${esc(state.adTitle)}</span>
                </div>`}
                ${state.linkTarget === 'app' ? '' : `<div class="sim-tw-from ${state.adUrl.trim() ? '' : 'empty'}" id="xp-url">From ${esc(state.adUrl.trim().replace(/^https?:\/\//, '').split('/')[0])}</div>`}
                <div class="sim-tw-actions">
                  <span>${ADX_ICONS.reply}</span><span>${ADX_ICONS.rt}</span><span>${ADX_ICONS.heart}</span><span>${ADX_ICONS.share}</span>
                </div>
              </div>
            </div>
            ${adxSkel()}
            <div class="sim-phone-homebar"></div>
          </div>
        </div>
        <div class="sim-adx-caption">게시된 게시물은 운영 체제 및 화면 크기에 따라 미리보기와 다르게 표시될 수 있습니다.</div>
      </div>`;
}
function adComposer() {
  const txt = state.adText;
  /* 앱 설치수 목표: 링크 대상은 '앱' 고정 (웹사이트 박스 미노출) */
  const isAppObj = state.objective === 'app';
  if (isAppObj) state.linkTarget = 'app';
  return `
    <div class="sim-adx-grid">
      <div class="sim-card sim-adx-card">
        <div class="sim-adx-head">
          <span class="sim-adx-head-ic">${ADX_ICONS.pencil}</span>
          <span class="sim-adx-head-title">광고 세부 정보</span>
          <span class="sim-adx-usepost">+ 기존 게시물 사용</span>
        </div>
        <div class="sim-adx-body">
          <div class="sim-adx-namerow">
            <span class="sim-flabel">이름</span>
            <span class="sim-adx-count" id="adx-name-count">${state.adName.length}/255</span>
          </div>
          <input class="sim-input" maxlength="255" value="${esc(state.adName)}" oninput="SIM.onAdName(this)">
          <div class="sim-adx-account">
            ${adxAvatar()}
            <span class="sim-adx-acc-name">KT 나스미디어</span>
            <span class="sim-adx-badge">✓</span>
            <span class="sim-adx-handle">@nas_tw</span>
          </div>
          <textarea class="sim-adx-textarea" rows="5" maxlength="280" placeholder="무슨 일이 있나요? (최대 한글 140자 (공백 없을 경우), 280byte 이내)"
                    oninput="SIM.onAdText(this.value)">${esc(txt)}</textarea>
          <div class="sim-adx-textmeta">
            <span class="sim-adx-reply">${ADX_ICONS.globe} Everyone can reply <span class="sim-adx-chev">⌄</span></span>
          </div>
          ${isAppObj ? '' : '<div class="sim-flabel" style="margin:20px 0 8px">링크 대상</div>'}
          <div class="sim-adx-links" ${isAppObj ? 'style="margin-top:20px"' : ''}>
            ${isAppObj ? '' : `
            <button class="sim-adx-linkbox ${state.linkTarget === 'website' ? 'sel' : ''}"
                    onclick="SIM.setSeg('linkTarget', '${state.linkTarget === 'website' ? '' : 'website'}')">
              <span class="sim-adx-link-title">웹사이트</span>
              <span class="sim-adx-link-desc">Include a call to action to your website.</span>
              ${state.linkTarget === 'website' ? '<span class="sim-adx-link-check">✓</span>' : ''}
            </button>`}
            <button class="sim-adx-linkbox ${state.linkTarget === 'app' ? 'sel' : ''}"
                    ${isAppObj ? '' : `onclick="SIM.setSeg('linkTarget', '${state.linkTarget === 'app' ? '' : 'app'}')"`}>
              <span class="sim-adx-link-title">앱</span>
              <span class="sim-adx-link-desc">Include a call to action to your app.</span>
              ${state.linkTarget === 'app' ? '<span class="sim-adx-link-check">✓</span>' : ''}
            </button>
          </div>
          ${state.linkTarget === 'website' ? `
          <div class="sim-flabel" style="margin:20px 0 7px">웹사이트 URL <b class="sim-req">*</b></div>
          <div class="sim-adx-url">
            <span class="sim-adx-url-pre">https://</span>
            <input placeholder="example.com" value="${esc(state.adUrl)}" oninput="SIM.onAdUrl(this.value)">
          </div>
          <div class="sim-flabel" style="margin:16px 0 7px">제목 <b class="sim-req">*</b></div>
          <input class="sim-input" placeholder="제목 입력 (공백 포함 70자 이내)" maxlength="70" value="${esc(state.adTitle)}" oninput="SIM.onAdTitle(this.value)">` : ''}
          ${state.linkTarget === 'app' ? `
          <div class="sim-row" style="margin-top:20px">
            <div class="sim-field">
              <div class="sim-flabel" style="margin-bottom:7px">클릭 유도문안</div>
              <select class="sim-input sim-select" onchange="SIM.setSeg('appCta', this.value)">
                ${['Install', 'Play', 'Shop', 'Book', 'Connect', 'Order', 'Open'].map(v => `<option ${state.appCta === v ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
            <div class="sim-field">
              <div class="sim-flabel" style="margin-bottom:7px">기본 앱 스토어</div>
              <select class="sim-input sim-select" onchange="SIM.set('appStore', this.value)">
                ${['South Korea', 'United States', 'Japan', 'United Kingdom', 'Germany', 'France', 'India', 'Brazil'].map(v => `<option ${state.appStore === v ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="sim-flabel" style="margin:18px 0 8px">플랫폼</div>
          <label class="sim-check">
            <input type="checkbox" ${state.appIos ? 'checked' : ''} ${state.promoApp ? 'disabled' : ''} onchange="SIM.setBool('appIos', this.checked)">
            <span class="sim-check-label">iOS</span>
          </label>
          ${state.appIos ? `
          <div class="sim-adx-plat">
            <div class="sim-sublabel">앱</div>
            <select class="sim-input sim-select" style="color:${state.appIosApp ? '#1e1e1e' : '#8c8880'}"
                    onchange="SIM.setSeg('appIosApp', this.value === '하나 선택' ? '' : this.value)">
              ${['하나 선택', '내 앱 (App Store)'].map(v => `<option ${(state.appIosApp || '하나 선택') === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
            <div class="sim-sublabel" style="margin-top:12px">딥링크 (선택 사항)</div>
            <input class="sim-input" placeholder="myapp://" value="${esc(state.appIosDeep)}" oninput="SIM.set('appIosDeep', this.value)">
          </div>` : ''}
          <label class="sim-check" style="margin-top:8px">
            <input type="checkbox" ${state.appAndroid ? 'checked' : ''} ${state.promoApp ? 'disabled' : ''} onchange="SIM.setBool('appAndroid', this.checked)">
            <span class="sim-check-label">Android</span>
          </label>
          ${state.appAndroid ? `
          <div class="sim-adx-plat">
            <div class="sim-sublabel">앱</div>
            <select class="sim-input sim-select" style="color:${state.appAndApp ? '#1e1e1e' : '#8c8880'}"
                    onchange="SIM.setSeg('appAndApp', this.value === '하나 선택' ? '' : this.value)">
              ${['하나 선택', '내 앱 (Google Play)'].map(v => `<option ${(state.appAndApp || '하나 선택') === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
            <div class="sim-sublabel" style="margin-top:12px">딥링크 (선택 사항)</div>
            <input class="sim-input" placeholder="myapp://" value="${esc(state.appAndDeep)}" oninput="SIM.set('appAndDeep', this.value)">
          </div>` : ''}` : ''}
          <button class="sim-adx-media" onclick="SIM.setBool('adMediaOpen', true)">+ 미디어 추가</button>
          <input type="file" id="adx-file" accept="image/*" style="display:none" onchange="SIM.onMediaFile(this)">
          ${state.adMedia ? `
          <div class="sim-adx-mediarow">
            <div class="sim-adx-thumb">
              <img src="${state.adMedia}" alt="업로드 이미지">
              <button class="sim-adx-thumb-x" title="이미지 제거" onclick="SIM.removeMedia()">×</button>
            </div>
            <div class="sim-adx-mediaguide">
              <div class="sim-adx-mg-item">
                <b>이미지 크기</b>
                <span>800 x 418 픽셀 (1.91:1 비율/가로형),<br>800 x 800 픽셀 (1:1 비율/세로형)<br>최대 3MB</span>
              </div>
              <div class="sim-adx-mg-item">
                <b>이미지 비율</b>
                <span>1.91:1 혹은 1:1</span>
              </div>
              <div class="sim-adx-mg-item">
                <b>파일 크기</b>
                <span>최대 20MB</span>
              </div>
              <div class="sim-adx-mg-item">
                <b>File types</b>
                <span>PNG, JPEG 권장<br>BMP, TIFF 지원 불가</span>
              </div>
            </div>
          </div>` : ''}
          ${state.adMediaOpen ? `
          <div class="sim-mmp-overlay">
            <div class="sim-mmp-modal" style="width:420px">
              <div class="sim-mmp-title">미디어 추가</div>
              <div class="sim-mmp-sub" style="margin-bottom:24px">현재는 이미지 소재만 테스트 가능합니다</div>
              <div class="sim-mmp-foot" style="margin-top:0;gap:10px">
                <button class="sim-btn-ghost" onclick="SIM.setBool('adMediaOpen', false)">취소</button>
                <button class="sim-btn-primary" onclick="SIM.pickMedia()">이미지 선택</button>
              </div>
            </div>
          </div>` : ''}
          <label class="sim-check" style="margin-top:16px">
            <input type="checkbox" ${state.adAI ? 'checked' : ''} onchange="SIM.setBool('adAI', this.checked)">
            <span class="sim-check-label">AI로 제작됨</span>
          </label>
        </div>
      </div>
      ${adPhonePreview()}
    </div>`;
}

/* 전환 이벤트 — 판매 목표 전용 커스텀 드롭다운 (이름+부제 2줄 행 + Inactive 상태 표시) */
const CONV_EVENTS = [
  { name: 'Landing page views',  sub: 'Landing page view' },
  { name: 'Site visits',         sub: 'SESSION' },
  { name: 'Download',            sub: 'Download' },
  { name: 'Sign up',             sub: 'Lead / Sign-up' },
  { name: 'Purchase',            sub: 'Purchase' },
  { name: 'Added payment info',  sub: 'Payment info added' },
  { name: 'Checkout initiated',  sub: 'Checkout started' },
  { name: 'Add to wishlist',     sub: 'Add to wishlist' },
  { name: 'Add to cart',         sub: 'Add to cart' },
  { name: 'Search',              sub: 'Search' },
];
function convEventField() {
  return `
    <div class="sim-field">
      <div class="sim-label-row">
        <div>${flabel('전환 이벤트')}</div>
        <span class="sim-applink">이벤트 관리 ⧉</span>
      </div>
      <div class="sim-conv-wrap">
        <button class="sim-conv-btn ${state.convEvent ? 'has-val' : ''}" onclick="SIM.toggleConvMenu()">
          <span>${esc(state.convEvent || '전환 이벤트 선택')}</span>
          <span class="sim-conv-chev">⌄</span>
        </button>
        ${state.convOpen ? `
        <div class="sim-conv-menu">
          ${CONV_EVENTS.map(e => `
            <button class="sim-conv-row ${state.convEvent === e.name ? 'sel' : ''}" onclick="SIM.setConvEvent('${e.name}')">
              <span class="sim-conv-txt">
                <span class="sim-conv-name">${e.name}</span>
                <span class="sim-conv-sub">${e.sub}</span>
              </span>
              <span class="sim-conv-state"><span class="sim-conv-dot"></span>Inactive</span>
            </button>`).join('')}
        </div>` : ''}
      </div>
      <div class="sim-fdesc" style="margin:7px 0 0">픽셀을 사용하여 웹사이트에서 전환을 추적하세요.</div>
    </div>`;
}

/* 세로 라디오 그룹 */
function radios(field, opts) {
  return `<div class="sim-radios">${opts.map(o => `
    <label class="sim-radio-row ${state[field] === o.v ? 'sel' : ''}" onclick="SIM.setSeg('${field}','${o.v}')">
      <span class="sim-radio-dot"></span>
      <span class="sim-radio-body">
        <span class="sim-radio-label">${o.label}${o.badge ? ` <span class="sim-badge">${o.badge}</span>` : ''}</span>
        ${o.desc ? `<span class="sim-radio-desc">${o.desc}</span>` : ''}
      </span>
    </label>`).join('')}</div>`;
}

/* 가로 라디오 (성별) */
function radiosInline(field, opts) {
  return `<div class="sim-radios inline">${opts.map(v => `
    <label class="sim-radio-row ${state[field] === v ? 'sel' : ''}" onclick="SIM.setSeg('${field}','${v}')">
      <span class="sim-radio-dot"></span><span class="sim-radio-label">${v}</span>
    </label>`).join('')}</div>`;
}

function chips(field, items) {
  return `<div class="sim-chips">` + items.map(v => {
    const sel = state[field].includes(v) ? 'sel' : '';
    return `<button class="sim-chip ${sel}" onclick="SIM.toggle('${field}','${v}')">${v}</button>`;
  }).join('') + `</div>`;
}

/* 금액 입력 — 천 단위 쉼표 자동 포맷 */
function krwInput(placeholder, value, field, cur) {
  const shown = (value === '' || value === null || value === undefined) ? '' : (+value).toLocaleString();
  return `<div class="sim-krw">
    <span class="sim-krw-cur">${cur || 'KRW'}</span>
    <input type="text" inputmode="numeric" placeholder="${placeholder}" value="${shown}" oninput="SIM.onMoney('${field}', this)">
  </div>`;
}

/* ─── 날짜+시간 피커 ─── */
function dtField(field, placeholder) {
  const label = state[field] ? fmtDT(state[field], state[field + 'Time']) : '';
  return `<div class="sim-dt-wrap">
    <input class="sim-input sim-dt-input" readonly placeholder="${placeholder || ''}"
           value="${label}" onclick="SIM.openCal('${field}')">
    ${state.cal.open === field ? calendarHTML(field) : ''}
  </div>`;
}

function calendarHTML(field) {
  const { y, m } = state.cal;
  const first   = new Date(y, m, 1).getDay();
  const dim     = new Date(y, m + 1, 0).getDate();
  const dimPrev = new Date(y, m, 0).getDate();
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const dayNum = i - first + 1;
    if (dayNum < 1)        cells += `<span class="sim-cal-day out">${dimPrev + dayNum}</span>`;
    else if (dayNum > dim) cells += `<span class="sim-cal-day out">${dayNum - dim}</span>`;
    else {
      const iso = `${y}-${pad(m + 1)}-${pad(dayNum)}`;
      const sel = state[field] === iso;
      cells += `<button class="sim-cal-day${sel ? ' sel' : ''}" onclick="SIM.calPick('${field}','${iso}')">${dayNum}</button>`;
    }
  }
  const t = (state[field + 'Time'] || '00:00').split(':');
  return `
    <div class="sim-cal-backdrop" onclick="SIM.closeCal()"></div>
    <div class="sim-cal">
      <div class="sim-cal-head">
        <button class="sim-cal-nav" onclick="SIM.calNav(-1)">‹</button>
        <div class="sim-cal-title">${MONTHS_EN[m]} ${y}</div>
        <button class="sim-cal-nav" onclick="SIM.calNav(1)">›</button>
      </div>
      <div class="sim-cal-grid">
        ${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => `<span class="sim-cal-wd">${w}</span>`).join('')}
        ${cells}
      </div>
      <div class="sim-cal-time">
        <span class="sim-cal-time-label">시간(24시간 형식) · GMT+9</span>
        <input type="text" inputmode="numeric" maxlength="2" value="${t[0]}" onchange="SIM.calTime('${field}',0,this.value)">
        <span class="sim-cal-colon">:</span>
        <input type="text" inputmode="numeric" maxlength="2" value="${t[1]}" onchange="SIM.calTime('${field}',1,this.value)">
      </div>
      <div class="sim-cal-actions">
        ${field === 'end' ? `<button class="sim-cal-clear" onclick="SIM.clearEnd()">지우기 (무기한 운영)</button>` : '<span></span>'}
        <button class="sim-cal-ok" onclick="SIM.closeCal()">확인</button>
      </div>
    </div>`;
}

/* ─── 1단계: 캠페인 (허브 페이지) ─── */
function panelCampaign() {
  const sel = OBJECTIVES.find(o => o.id === state.objective);
  return `
    <div class="sim-card">
      <div class="sim-card-title">세부 정보</div>
      <div class="sim-card-sub">나중에 찾을 수 있도록 캠페인에 이름을 지정하세요.</div>
      <div class="sim-field">
        <label class="sim-label">이름</label>
        <input class="sim-input" value="${esc(state.name)}" oninput="SIM.set('name', this.value)">
      </div>
      <div class="sim-field" style="margin-bottom:0">
        <label class="sim-label">업종 <span style="color:#d93025">*</span></label>
        <div class="sim-ind-grid">
          ${INDUSTRIES.map(it => `
            <label class="sim-ind-item ${state.industries.includes(it.v) ? 'sel' : ''}">
              <input type="radio" name="sim-industry" ${state.industries.includes(it.v) ? 'checked' : ''}
                     onchange="SIM.setIndustry('${it.v}')">
              <span class="sim-ind-icon">${it.icon}</span>
              <span class="sim-ind-label">${it.v}</span>
            </label>`).join('')}
        </div>
      </div>
    </div>
    <div class="sim-card">
      <div class="sim-card-title">목표</div>
      <div class="sim-card-sub">달성하고자 하는 목표에 가장 적합한 목표를 선택하세요.</div>
      <div class="sim-obj-wrap">
        <div class="sim-obj-list">
          ${OBJECTIVES.map(o => `
            <button class="sim-obj-row ${state.objective === o.id ? 'sel' : ''}" onclick="SIM.setObjective('${o.id}')">
              <div class="sim-obj-radio"></div>
              <div class="sim-obj-ic">${o.icon}</div>
              <div>
                <div class="sim-obj-name">${o.name}</div>
                <div class="sim-obj-desc">${o.desc}</div>
              </div>
            </button>`).join('')}
        </div>
        <div class="sim-obj-detail">
          ${sel ? `
            <div class="sim-obj-detail-ic">${sel.icon}</div>
            <div class="sim-obj-detail-name">${sel.name}</div>
            <div class="sim-obj-detail-desc">${sel.desc}</div>
            <div class="sim-obj-how">
              <div class="sim-obj-how-label">작동 방식</div>
              <div class="sim-obj-how-text">${sel.how}</div>
            </div>
            <div class="sim-obj-uses">
              <div class="sim-obj-uses-label">적합한 용도</div>
              ${sel.uses.map(u => `<div class="sim-obj-use">${u}</div>`).join('')}
            </div>` : `<div style="color:#a8a49d;font-size:13px;margin:auto">왼쪽에서 목표를 선택하세요</div>`}
        </div>
      </div>
    </div>`;
}

/* ─── 4단계: 검토 및 시작 ─── */
function panelReview() {
  const e = estimate();
  const row = (k, v) => `<div class="sim-sum-row"><div class="sim-sum-key">${k}</div><div class="sim-sum-val">${v}</div></div>`;
  const ageTxt = state.ageMode === 'range'
    ? (state.ageMax === 'and up' ? `${state.ageMin}세 이상` : `${state.ageMin}–${state.ageMax}세`)
    : '모든 연령';
  const devs = [
    state.devIos     && `iOS (${state.iosVer})`,
    state.devAndroid && `Android (${state.androidVer})`,
    state.devWeb     && 'Web',
  ].filter(Boolean);
  const osTxt = state.osMode === 'specific' ? ` · ${devs.join(', ') || '기기 미선택'}` : '';
  const locTxt = `포함: ${state.locIncluded.join(', ') || '대한민국 전체'}${state.locExcluded.length ? ` · 제외: ${state.locExcluded.join(', ')}` : ''}`;
  const advBits = [
    `타겟팅 최적화 ${state.targetingOpt ? '켜짐' : '꺼짐'}`,
    state.keywords.length   ? `키워드 ${state.keywords.length}개`   : '',
    state.lookalikes.length ? `팔로워 유사 ${state.lookalikes.length}개` : '',
    state.retargetPast      ? '과거 게시물 리타겟팅'                : '',
    state.promoApp          ? `홍보할 앱: ${state.promoApp}`        : '',
  ].filter(Boolean).join(' · ');
  return `
    <div class="sim-review-wide">
    <div class="sim-review-grid">
      <div>
    <div class="sim-card">
      <div class="sim-card-title">자금 소스 <span class="sim-fund-tag">(IO 설정)</span></div>
      <div class="sim-card-sub">이 캠페인의 자금 소스를 선택하세요.</div>
      <label class="sim-label">자금 소스</label>
      <select class="sim-input sim-select" onchange="SIM.setFunding(this.value)">
        ${FUNDING_SOURCES.map(f => `<option ${state.fundingSource === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}
      </select>
    </div>
    <div class="sim-card">
      <div class="sim-card-title">검토 및 시작</div>
      <div class="sim-card-sub">설정을 확인한 뒤 캠페인을 시작하세요.</div>
      <div class="sim-summary">
        ${row('자금 소스 (IO 설정)', esc(state.fundingSource))}
        ${row('캠페인', esc(state.name))}
        ${row('업종', state.industries.join(', ') || '미선택')}
        ${row('목표', e.obj.name)}
        ${row('광고그룹', esc(state.adGroupName))}
        ${row('예산', `${won(state.budget)} / 일${state.spendCap ? ` · 총 한도 ${won(+state.spendCap)}` : ''} · ${e.D}일 기준 총 ${won(e.totalBudget)}`)}
        ${row('기간', `${fmtDT(state.start, state.startTime)} → ${state.end ? fmtDT(state.end, state.endTime) : '무기한 운영'}`)}
        ${row('입찰 전략', state.bid === 'auto' ? '자동 입찰' : `최대 입찰가${state.maxBid ? ` (${won(+state.maxBid)})` : ''}`)}
        ${row('게재 위치', state.placementMode === 'all' ? '모든 게재 위치에서 전달 최적화' : (state.placements.join(', ') || '자동'))}
        ${row('위치', locTxt)}
        ${row('인구통계', `${state.gender} · ${ageTxt}${osTxt}`)}
        ${row('언어', state.langs.join(', ') || '전체')}
        ${row('관심사', state.interests.length ? state.interests.join(', ') : '전체')}
        ${row('고급 타겟팅', advBits)}
        ${row('광고', `${esc(state.adName)} — “${esc(state.adText)}”`)}
        ${state.adUrl ? row('URL', esc(state.adUrl)) : ''}
      </div>
    </div>
      </div>
      ${adPhonePreview()}
    </div>
    </div>`;
}

/* ─── 업종 × 목표 벤치마크 데이터 (완료 화면) ───
   키: '업종|목표id'. 데이터가 있는 조합만 완료 화면에 카드가 표시된다. */
const BENCHMARKS = {
  '게임|reach': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '455~500원' },
      { k: 'CPC(링크)', v: '340~380원' },
      { k: 'CTR(링크)', v: '0.13~0.16%' },
      { k: 'CPV', v: '4~6원' },
      { k: 'VTR', v: '10~13%' },
    ],
  },
  '방송/통신|reach': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '284원' },
      { k: 'CPC(링크)', v: '180원' },
      { k: 'CTR(링크)', v: '0.16%' },
      { k: 'CPV', v: '0원' },
      { k: 'VTR', v: '0%' },
    ],
  },
  '식음료|reach': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '261원' },
      { k: 'CPC(링크)', v: '189원' },
      { k: 'CTR(링크)', v: '0.14%' },
      { k: 'CPV', v: '0원' },
      { k: 'VTR', v: '0%' },
    ],
  },
  '생활/잡화|reach': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '160원' },
      { k: 'CPC(링크)', v: '193원' },
      { k: 'CTR(링크)', v: '0.07%' },
      { k: 'CPV', v: '0원' },
      { k: 'VTR', v: '0%' },
    ],
  },
  '게임|traffic': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '461~547원' },
      { k: 'CPC(링크)', v: '168~416원' },
      { k: 'CTR(링크)', v: '0.13~0.27%' },
      { k: 'CPV', v: '2~10원' },
      { k: 'VTR', v: '18~30%' },
    ],
  },
  '앱/사이트|traffic': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '800~1,100원' },
      { k: 'CPC(링크)', v: '400~560원' },
      { k: 'CTR(링크)', v: '0.15~0.25%' },
      { k: 'CPV', v: '0원' },
      { k: 'VTR', v: '0%' },
    ],
  },
  '화장품|traffic': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '234~720원' },
      { k: 'CPC(링크)', v: '100~344원' },
      { k: 'CTR(링크)', v: '0.19~0.27%' },
      { k: 'CPV', v: '6~10원' },
      { k: 'VTR', v: '9~12%' },
    ],
  },
  '수송|traffic': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '150~700원' },
      { k: 'CPC(링크)', v: '100~344원' },
      { k: 'CTR(링크)', v: '0.17~0.4%' },
      { k: 'CPV', v: '0원' },
      { k: 'VTR', v: '0%' },
    ],
  },
  '교육|traffic': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '295~400원' },
      { k: 'CPC(링크)', v: '100~344원' },
      { k: 'CTR(링크)', v: '0.17~0.4%' },
      { k: 'CPV', v: '0원' },
      { k: 'VTR', v: '0%' },
    ],
  },
  '컴퓨터|traffic': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '252~490원' },
      { k: 'CPC(링크)', v: '200~320원' },
      { k: 'CTR(링크)', v: '0.11~0.21%' },
      { k: 'CPV', v: '0원' },
      { k: 'VTR', v: '0%' },
    ],
  },
  '문화/예술|traffic': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '495~1,700원' },
      { k: 'CPC(링크)', v: '210~660원' },
      { k: 'CTR(링크)', v: '0.24~0.4%' },
      { k: 'CPV', v: '2~9원' },
      { k: 'VTR', v: '21~30%' },
    ],
  },
  '생활/잡화|traffic': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '130~300원' },
      { k: 'CPC(링크)', v: '210~660원' },
      { k: 'CTR(링크)', v: '0.24~0.4%' },
      { k: 'CPV', v: '0원' },
      { k: 'VTR', v: '0%' },
    ],
  },
  '게임|video': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '350~430원' },
      { k: 'CPC(링크)', v: '380~680원' },
      { k: 'CTR(링크)', v: '0.07~0.09%' },
      { k: 'CPV', v: '1~3원' },
      { k: 'VTR', v: '21~24%' },
    ],
  },
  '문화/예술|video': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '270~1,200원' },
      { k: 'CPC(링크)', v: '200~1,000원' },
      { k: 'CTR(링크)', v: '0.13~0.16%' },
      { k: 'CPV', v: '1~4원' },
      { k: 'VTR', v: '20~32%' },
    ],
  },
  '문화/예술|app': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '880원' },
      { k: 'CPC(링크)', v: '260원' },
      { k: 'CTR(링크)', v: '0.34%' },
      { k: 'CPV', v: '3원' },
      { k: 'VTR', v: '28%' },
      { k: 'CPI', v: '2,000원' },
    ],
  },
  '수송|engagement': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '149원' },
      { k: 'CPC(링크)', v: '86원' },
      { k: 'CTR(링크)', v: '0.18%' },
      { k: 'CPV', v: '0원' },
      { k: 'VTR', v: '0%' },
    ],
  },
  '문화/예술|engagement': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '869원' },
      { k: 'CPC(링크)', v: '439원' },
      { k: 'CTR(링크)', v: '0.2%' },
      { k: 'CPV', v: '0원' },
      { k: 'VTR', v: '0%' },
    ],
  },
  '생활/잡화|engagement': {
    period: '최근 3개월간 평균 데이터',
    metrics: [
      { k: 'CPM', v: '84원' },
      { k: 'CPC(링크)', v: '95원' },
      { k: 'CTR(링크)', v: '0.1%' },
      { k: 'CPV', v: '0원' },
      { k: 'VTR', v: '0%' },
    ],
  },
};
/* 도달 목표 · 전체 업종 기준 공통 벤치마크 — 내부 사례가 없는 업종에 동일 적용 */
const BENCH_REACH_ALL = {
  period: '내부 사례가 없어 전체 업종 기준으로 제공',
  metrics: [
    { k: 'CPM', v: '280~600원' },
    { k: 'CPC(링크)', v: '180~1,100원' },
    { k: 'CTR(링크)', v: '0.06~0.16%' },
    { k: 'CPV', v: '4~19원' },
    { k: 'VTR', v: '6~12%' },
  ],
};
['금융', '가전', '앱/사이트', '패션', '화장품', '수송', '단체', '쇼핑몰', '교육', '관광/레저', '컴퓨터', '의료/건강', '문화/예술', '주택/가구', '기타']
  .forEach(ind => { BENCHMARKS[`${ind}|reach`] = BENCH_REACH_ALL; });
/* 참여수 목표 · 전체 업종 기준 공통 벤치마크 — 전용 데이터가 있는 업종(수송·문화/예술·생활/잡화) 외 전부 적용 */
const BENCH_ENGAGE_ALL = {
  period: '내부 사례가 없어 전체 업종 기준으로 제공',
  metrics: [
    { k: 'CPM', v: '84~869원' },
    { k: 'CPC(링크)', v: '86~439원' },
    { k: 'CTR(링크)', v: '0.09~0.2%' },
    { k: 'CPV', v: '0원' },
    { k: 'VTR', v: '0%' },
  ],
};
INDUSTRIES.map(i => i.v)
  .filter(v => !BENCHMARKS[`${v}|engagement`])
  .forEach(v => { BENCHMARKS[`${v}|engagement`] = BENCH_ENGAGE_ALL; });
/* 웹사이트 트래픽 목표 · 전체 업종 기준 공통 벤치마크 — 전용 데이터가 있는 업종 외 전부 적용 */
const BENCH_TRAFFIC_ALL = {
  period: '내부 사례가 없어 전체 업종 기준으로 제공',
  metrics: [
    { k: 'CPM', v: '400~1,200원' },
    { k: 'CPC(링크)', v: '300~700원' },
    { k: 'CTR(링크)', v: '0.1~0.25%' },
    { k: 'CPV', v: '6~12원' },
    { k: 'VTR', v: '6~23%' },
  ],
};
INDUSTRIES.map(i => i.v)
  .filter(v => !BENCHMARKS[`${v}|traffic`])
  .forEach(v => { BENCHMARKS[`${v}|traffic`] = BENCH_TRAFFIC_ALL; });
/* 동영상 조회 수 목표 · 전체 업종 기준 공통 벤치마크 — 전용 데이터가 있는 업종 외 전부 적용 */
const BENCH_VIDEO_ALL = {
  period: '내부 사례가 없어 전체 업종 기준으로 제공',
  metrics: [
    { k: 'CPM', v: '270~1,200원' },
    { k: 'CPC(링크)', v: '200~1,000원' },
    { k: 'CTR(링크)', v: '0.09~0.16%' },
    { k: 'CPV', v: '1~7원' },
    { k: 'VTR', v: '20~32%' },
  ],
};
INDUSTRIES.map(i => i.v)
  .filter(v => !BENCHMARKS[`${v}|video`])
  .forEach(v => { BENCHMARKS[`${v}|video`] = BENCH_VIDEO_ALL; });
/* 앱 설치수 목표 — 데이터 없는 업종은 지표 대신 문의 안내만 표시 */
const BENCH_APP_NONE = {
  period: '최근 데이터 없음',
  metrics: [],
  note: '데이터분석팀(tw@nasmedia.co.kr)로 문의 부탁드립니다.',
};
INDUSTRIES.map(i => i.v)
  .filter(v => !BENCHMARKS[`${v}|app`])
  .forEach(v => { BENCHMARKS[`${v}|app`] = BENCH_APP_NONE; });
function benchmarkHTML() {
  const obj = OBJECTIVES.find(o => o.id === state.objective) || OBJECTIVES[0];
  for (const ind of (state.industries || [])) {
    const b = BENCHMARKS[`${ind}|${state.objective}`];
    if (!b) continue;
    return `
      <div class="sim-bench">
        <div class="sim-bench-head">
          <span class="sim-bench-badge">BENCHMARK</span>
          <span class="sim-bench-title">${esc(ind)} 업종 · ${esc(obj.name)} 목표</span>
          <span class="sim-bench-period">${esc(b.period)}</span>
        </div>
        ${b.metrics && b.metrics.length ? `
        <div class="sim-bench-grid">
          ${b.metrics.map(m => `
          <div class="sim-bench-item">
            <div class="sim-bench-k">${esc(m.k)}</div>
            <div class="sim-bench-v">${esc(m.v)}</div>
          </div>`).join('')}
        </div>` : ''}
        ${b.note ? `<div class="sim-bench-note">${esc(b.note).replace(/([\w.+-]+@[\w.-]+\.\w+)/, '<a href="mailto:$1">$1</a>')}</div>` : ''}
      </div>`;
  }
  return '';
}

/* ─── 완료 ─── */
function panelDone() {
  return `
    <div class="sim-card">
      <div class="sim-done">
        <div class="sim-done-badge">✓</div>
        <div class="sim-done-title">캠페인이 시작되었습니다!</div>
        <div class="sim-done-sub">
          <strong>${esc(state.name)}</strong> 셋팅이 완료되었습니다.<br>
          <span style="font-size:12px;color:#a8a49d">* 본 시뮬레이터는 학습용이며 실제 광고가 집행되지 않습니다.</span>
        </div>
        ${benchmarkHTML()}
        <div class="sim-done-actions">
          <button class="sim-btn-ghost" onclick="SIM.restart()">🔄 다시 시작</button>
          <a class="sim-btn-primary" href="/#/category/twitter">도움말 문서 보기 →</a>
          <a class="sim-btn-primary" href="https://note.nasmedia.co.kr:4439/benchmark/media_search/nxis" target="_blank" rel="noopener">📊 X 벤치마크 데이터 확인</a>
        </div>
      </div>
    </div>`;
}

/* ─── 하단 네비게이션 ─── */
function renderFooter() {
  const footer = document.getElementById('sim-footer');
  footer.style.display = state.finished ? 'none' : 'flex';
  if (state.finished) return;
  document.getElementById('btn-prev').disabled = PAGE.mode === 'hub' && state.step === 0;
  const next = document.getElementById('btn-next');
  const last = state.step === STEPS.length - 1;
  next.textContent = last ? '캠페인 시작 ✓' : '다음 →';
  next.disabled = !canProceed();
  document.getElementById('sim-hint').textContent = hintText();
}
function canProceed() { return canProceedAt(state.step); }
function canProceedAt(step) {
  if (step === 0) return !!state.objective && state.name.trim().length > 0 && state.industries.length > 0;
  if (step === 1) return state.adGroupName.trim().length > 0 && state.budget > 0;
  if (step === 2) return state.adText.trim().length > 0;
  return true;
}
function hintText() {
  if (state.step === 0 && !state.name.trim()) return '캠페인 이름을 입력해 주세요.';
  if (state.step === 0 && !state.industries.length) return '업종을 선택해 주세요.';
  if (state.step === 0 && !state.objective)   return '목표를 선택하면 다음 단계로 진행할 수 있습니다.';
  if (state.step === 1 && !state.adGroupName.trim()) return '광고그룹 이름을 입력해 주세요.';
  if (state.step === 1 && !(state.budget > 0)) return '일일 예산을 입력해 주세요.';
  if (state.step === 2 && !state.adText.trim()) return '광고 텍스트를 입력하면 다음 단계로 진행할 수 있습니다.';
  return `단계 ${state.step + 1} / ${STEPS.length} · ${STEPS[state.step]}`;
}

/* ══════════════════════════════════════════════
   컨트롤러
══════════════════════════════════════════════ */
const SIM = {
  setObjective(id) { state.objective = id; renderStage(false); },
  setIndustry(v) { state.industries = [v]; renderStage(false); }, // 업종 단일 선택 (기존 배열 구조 유지)
  set(field, val) { state[field] = val; refreshEstimate(); renderFooter(); persist(); },
  setFunding(val) { state.fundingSource = val; renderStage(false); }, // 자금 소스 선택 → 요약 반영
  setBool(field, val) { state[field] = !!val; renderStage(false); },
  /* 전환 이벤트 드롭다운 (판매 목표) */
  toggleConvMenu() { state.convOpen = !state.convOpen; renderStage(false); },
  setConvEvent(v) { state.convEvent = v; state.convOpen = false; renderStage(false); },
  /* 금액 입력 — 숫자만 남기고 천 단위 쉼표로 표시 */
  onMoney(field, el) {
    const digits = el.value.replace(/\D/g, '').slice(0, 12);
    el.value = digits ? (+digits).toLocaleString() : '';
    state[field] = field === 'budget' ? (digits ? +digits : 0) : (digits ? +digits : '');
    refreshEstimate(); renderFooter(); persist();
  },
  onAdText(val) {
    state.adText = val;
    const el = document.getElementById('xp-text');
    if (el) {
      el.textContent = val.trim() ? val : '';
      el.classList.toggle('empty', !val.trim());
    }
    renderFooter(); persist();
  },
  /* 미디어 추가 — 안내 팝업 → 파일 선택 → dataURL 로 미리보기 반영 */
  pickMedia() {
    state.adMediaOpen = false;
    renderStage(false);
    const f = document.getElementById('adx-file');
    if (f) f.click();
  },
  onMediaFile(el) {
    const file = el.files && el.files[0];
    el.value = ''; // 같은 파일 재선택 가능하도록 초기화
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => { state.adMedia = reader.result; renderStage(false); };
    reader.readAsDataURL(file);
  },
  removeMedia() { state.adMedia = ''; renderStage(false); },
  onAdName(el) {
    state.adName = el.value;
    const c = document.getElementById('adx-name-count');
    if (c) c.textContent = `${el.value.length}/255`;
    persist();
  },
  onAdUrl(val) {
    state.adUrl = val;
    const el = document.getElementById('xp-url');
    if (el) {
      el.textContent = 'From ' + val.trim().replace(/^https?:\/\//, '').split('/')[0];
      el.classList.toggle('empty', !val.trim());
    }
    persist();
  },
  onAdTitle(val) {
    state.adTitle = val;
    const el = document.getElementById('xp-title'); // 이미지가 있을 때만 존재 (이미지 위 칩)
    if (el) {
      el.textContent = val;
      el.classList.toggle('empty', !val.trim());
    }
    persist();
  },

  /* ── 날짜+시간 피커 ── */
  openCal(field) {
    const base = state[field] || today(0);
    const [y, m] = base.split('-').map(Number);
    state.cal = { open: field, y, m: m - 1 };
    if (!state[field + 'Time']) state[field + 'Time'] = field === 'start' ? nowTime() : '23:59';
    renderStage(false);
  },
  closeCal() { state.cal.open = null; renderStage(false); },
  calNav(d) {
    let { y, m } = state.cal;
    m += d;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    state.cal.y = y; state.cal.m = m;
    renderStage(false);
  },
  calPick(field, iso) {
    state[field] = iso;
    if (field === 'start' && state.end && state.end < iso) { state.end = ''; state.endTime = ''; }
    if (field === 'end'   && iso < state.start) state[field] = state.start;
    renderStage(false);
  },
  calTime(field, part, val) {
    const t = (state[field + 'Time'] || '00:00').split(':').map(Number);
    t[part] = Math.max(0, Math.min(part === 0 ? 23 : 59, +val || 0));
    state[field + 'Time'] = `${pad(t[0])}:${pad(t[1])}`;
    if (!state[field]) state[field] = today(0);
    renderStage(false);
  },
  clearEnd() { state.end = ''; state.endTime = ''; state.cal.open = null; renderStage(false); },

  /* ── 검색형 다중 선택 ── */
  suggest(field, q) {
    const box = document.getElementById('suggest-' + field);
    if (!box) return;
    const ql = (q || '').trim().toLowerCase();
    let items;
    if (field === 'loc') {
      const used = new Set([...state.locIncluded, ...state.locExcluded]);
      items = ALL_LOCATIONS.map(l => l.v).filter(v => !used.has(v) && (!ql || v.toLowerCase().includes(ql)));
      box.innerHTML = items.map(v => `<button class="sim-suggest-item" onmousedown="SIM.addLoc('${v}')">${v}</button>`).join('');
    } else {
      items = (SOURCES[field] || []).filter(v => !state[field].includes(v) && (!ql || v.toLowerCase().includes(ql)));
      box.innerHTML = items.map(v => `<button class="sim-suggest-item" onmousedown="SIM.addTag('${field}','${v}')">${v}</button>`).join('');
    }
    box.style.display = items.length ? 'block' : 'none';
  },
  hideSuggest() { setTimeout(() => document.querySelectorAll('.sim-suggest').forEach(b => b.style.display = 'none'), 120); },

  /* 체크박스형 드롭다운 (관심사) — 체크 즉시 적용, 드롭다운 유지 */
  suggestCheck(field, q) {
    const box = document.getElementById('suggest-' + field);
    if (!box) return;
    const ql = (q || '').trim().toLowerCase();
    const items = (SOURCES[field] || []).filter(v => !ql || v.toLowerCase().includes(ql));
    box.innerHTML = items.map(v => {
      const on = state[field].includes(v);
      return `<div class="sim-suggest-item check${on ? ' on' : ''}"
        onmousedown="event.preventDefault();SIM.toggleCheck('${field}','${v}')">
        <span class="sim-suggest-cb">${on ? '✓' : ''}</span>${v}</div>`;
    }).join('');
    box.style.display = items.length ? 'block' : 'none';
  },
  toggleCheck(field, v) {
    const i = state[field].indexOf(v);
    if (i > -1) state[field].splice(i, 1); else state[field].push(v);
    const input = document.getElementById('search-' + field);
    this.suggestCheck(field, input ? input.value : '');
    const wrap = document.getElementById('tagswrap-' + field);
    if (wrap) wrap.innerHTML = includedTags(field);
    refreshEstimate(); persist();
  },

  addTag(field, v) {
    if (!state[field].includes(v)) state[field].push(v);
    renderStage(false);
  },
  removeTag(field, v) { state[field] = state[field].filter(x => x !== v); renderStage(false); },
  removeAt(field, i) { state[field].splice(i, 1); renderStage(false); },
  addOnEnter(e, field) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = e.target.value.trim();
    if (v && !state[field].includes(v)) { state[field].push(v); renderStage(false); }
  },

  /* ── 위치 포함/제외 ── */
  setLocMode(v) { state.locMode = v; persist(); },
  addLoc(v) {
    state.locIncluded = state.locIncluded.filter(x => x !== v);
    state.locExcluded = state.locExcluded.filter(x => x !== v);
    (state.locMode === 'exclude' ? state.locExcluded : state.locIncluded).push(v);
    renderStage(false);
  },
  removeLoc(list, v) { state[list] = state[list].filter(x => x !== v); renderStage(false); },

  toggle(field, val) {
    const arr = state[field];
    const i = arr.indexOf(val);
    if (i > -1) arr.splice(i, 1); else arr.push(val);
    renderStage(false);
  },
  setSeg(field, val) {
    state[field] = val;
    /* 최대 입찰가 선택 시 결제 방법 자동 고정 — 트래픽: 링크 클릭수(CPC), 동영상: 동영상 조회수(CPV) */
    if (field === 'bid' && val === 'max' && state.objective === 'traffic') state.payMethod = 'cpc';
    if (field === 'bid' && val === 'max' && state.objective === 'video') state.payMethod = 'cpv';
    if (field === 'ageMin' && state.ageMax !== 'and up' && +state.ageMax < +state.ageMin) state.ageMax = 'and up';
    if (field === 'ageMax' && val !== 'and up' && +val < +state.ageMin) state.ageMin = AGE_MIN_OPTS[0];
    renderStage(false);
  },
  /* 홍보할 앱 선택 — 스토어에 맞춰 운영 체제(특정 기기 선택)를 자동 설정 */
  setPromoApp(val) {
    state.promoApp = val;
    /* 스토어에 맞춰 OS 타겟팅 + 광고 단계의 링크 대상 '앱' 플랫폼 체크·앱 선택도 동기화 */
    if (val.includes('App Store'))        { state.osMode = 'specific'; state.devIos = true;  state.devAndroid = false; state.devWeb = false; state.appIos = true;  state.appIosApp = val; state.appAndroid = false; }
    else if (val.includes('Google Play')) { state.osMode = 'specific'; state.devIos = false; state.devAndroid = true;  state.devWeb = false; state.appAndroid = true; state.appAndApp = val; state.appIos = false; }
    renderStage(false);
  },
  toggleCard(id) { collapsed[id] = !collapsed[id]; renderStage(false); },
  toggleAdv() { state.advOpen = !state.advOpen; renderStage(false); },

  /* ── 페이지 간 네비게이션 ── */
  next() {
    if (!canProceed()) return;
    if (PAGE.mode === 'hub') {
      // 허브(캠페인) → 선택한 목표 페이지로 이동
      state.step = 1;
      persist();
      location.href = `./${state.objective}/#adgroup`;
      return;
    }
    if (state.step === STEPS.length - 1) { state.finished = true; state.adMedia = ''; } // 셋팅 완료 시 업로드 이미지 삭제
    else state.step++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderSteps(); renderStage(true);
  },
  prev() {
    if (PAGE.mode === 'objective' && state.step === 1) {
      state.step = 0; persist();
      location.href = '../#campaign';
      return;
    }
    if (state.step === 0) return;
    state.step--; renderSteps(); renderStage(true);
  },
  goto(i) {
    if (state.finished || !canJumpTo(i)) return;
    if (PAGE.mode === 'hub') {
      if (i > 0) { state.step = i; persist(); location.href = `./${state.objective}/#${STEP_HASHES[i]}`; }
      return;
    }
    if (i === 0) { state.step = 0; persist(); location.href = '../#campaign'; return; }
    state.step = i;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderSteps(); renderStage(true);
  },
  restart() {
    try { sessionStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    Object.assign(state, initialState());
    Object.keys(collapsed).forEach(k => delete collapsed[k]);
    if (PAGE.mode === 'objective') { location.href = '../'; return; }
    renderSteps(); renderStage(true);
  },
};

/* ─── 초기화 ─── */
/* 새로고침(reload)이면 저장 상태를 버리고 처음부터 시작.
   sessionStorage 유지는 허브 ↔ 목표 페이지 간 이동(navigate)용이다. */
const RELOAD_REDIRECT = (function resetOnReload() {
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav && nav.type === 'reload') {
      sessionStorage.removeItem(STORE_KEY);
      if (PAGE.mode === 'objective') { location.replace('../'); return true; } // 목표 페이지에서 새로고침 → 허브 첫 화면으로
    }
  } catch (e) { /* ignore */ }
  return false;
})();
if (!RELOAD_REDIRECT) {
  restore();
  if (PAGE.mode === 'hub') {
    state.step = 0;
    state.finished = false;
    try { history.replaceState(null, '', '#campaign'); } catch (e) { /* ignore */ }
  } else {
    state.objective = PAGE.objective; // URL이 곧 목표
    if (!(state.step >= 1 && state.step <= 3)) state.step = 1;
    /* URL 해시(#adgroup/#ad/#review)로 진입 단계 결정 — 앞 단계 요건을 못 채우면 가능한 단계까지만 */
    const hi = STEP_HASHES.indexOf(location.hash.slice(1));
    if (hi >= 1 && hi <= 3) {
      let t = 1;
      while (t < hi && canProceedAt(t)) t++;
      state.step = t;
    }
    try { history.replaceState(null, '', '#' + STEP_HASHES[state.step]); } catch (e) { /* ignore */ }
  }
  /* 주소창 해시 직접 변경·뒤로가기 → 단계 동기화 */
  window.addEventListener('hashchange', () => {
    if (PAGE.mode !== 'objective' || state.finished) { return; }
    const i = STEP_HASHES.indexOf(location.hash.slice(1));
    if (i === state.step) return;
    if (i < 1 || i > 3 || (i > state.step && !canJumpTo(i))) { syncHash(); return; } // 유효하지 않으면 원복
    state.step = i;
    renderSteps(); renderStage(true);
  });
  document.getElementById('nav-x-logo').innerHTML = X_LOGO;
  renderSteps();
  renderStage(true);
}
