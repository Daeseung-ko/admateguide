/* ══════════════════════════════════════════════
   X 광고 대시보드 튜토리얼
   AdMate Help · standalone (x-tutorial/)
   게임 튜토리얼 방식의 스포트라이트 코치마크 —
   TUT_STEPS 배열에 단계를 추가/수정하면 된다.
══════════════════════════════════════════════ */

/* ─── 튜토리얼 단계 정의 ───
   target: 하이라이트할 요소의 CSS 선택자 (null이면 중앙 카드)
   title / text: 말풍선 내용                              */
const TUT_STEPS = [
  {
    target: null,
    title: 'X 광고 대시보드 튜토리얼 👋',
    text: 'X Ads 관리자 화면의 핵심 기능을 하나씩 살펴봅니다. 실제 데이터가 아닌 학습용 화면이므로 자유롭게 둘러보세요.',
  },
  {
    target: '#tut-sidebar',
    title: '탐색 메뉴',
    text: '캠페인 분석, 크리에이티브 작성 도구, 오디언스·이벤트 관리자 등 모든 기능은 왼쪽 메뉴에서 이동합니다.',
  },
  {
    target: '#tut-campaign-form',
    title: '캠페인 생성',
    text: '새 캠페인을 생성할 수 있습니다. 목표 선택 → 광고그룹 → 광고 순서로 진행되며, 시뮬레이터에서 미리 연습할 수 있습니다.',
    place: 'right',   /* 말풍선을 대상 오른쪽에 표시 */
  },
  {
    target: '#tut-compose',
    title: '작성 도구',
    text: "트윗(소재) 생성을 할 수 있습니다. <b style='color:#e0245e'>소재 생성은 꼭 '작성 도구'를 통해서 먼저 트윗 발행 후 캠페인 세팅 하십시오.</b> (오가닉 트윗은 별도 문의)",
    place: 'right',
  },
  {
    target: '#tut-posts',
    title: '게시물',
    text: '오가닉 트윗/프로모션 트윗 게시물과 ID 확인이 가능하며, 게시물에 날짜 부분을 클릭하면 트윗 URL 확인이 가능합니다.',
    place: 'right',
  },
  {
    target: '#tut-bulk',
    title: '일괄 편집기',
    text: '캠페인 정보를 엑셀 파일로 내보내거나 벌크 세팅이 가능합니다.',
    place: 'right',
  },
  {
    target: '#tut-audience-menu',
    title: '오디언스',
    text: 'Pixel 또는 SDK 이벤트에서 발생한 유저를 타겟팅 모수로 수집합니다.',
    place: 'right',
  },
  {
    target: '#tut-app-manager',
    title: '앱 관리자',
    text: '앱 캠페인에 사용하는 앱을 추가할 수 있습니다.',
    place: 'right',
  },
  {
    target: '#tut-event-manager',
    title: '이벤트 관리자',
    text: 'Web, App에 발생하는 이벤트를 체크하고, Pixel 발급 및 MMP 연동이 가능합니다. (MMP 연동은 Adjust, AppsFlyer, Branch, Kochava, Singular만 가능)',
    place: 'right',
  },
  {
    target: '#tut-filter',
    title: '필터',
    text: '캠페인 상태/목표에 따라 확인할 수 있고, 테이크오버 캠페인 확인이 가능합니다.',
    openEl: '#filter-menu',      /* 스텝 진입 시 열어둘 요소 */
    extras: ['#filter-menu'],    /* 스포트라이트 영역에 함께 포함할 요소 */
  },
  {
    target: '#tut-table-card',
    title: 'Funding instruments',
    text: "'Funding instruments' 탭에서 광고 계정에 연결된 결제 수단(IO·신용/체크카드)별로 시작·종료일, 예산, 잔여 예산, 지출 내역을 확인할 수 있습니다.",
    openTab: 'funding',          /* 스텝 진입 시 테이블 탭 전환 */
  },
  {
    target: '#tut-table-card',
    title: 'Campaigns',
    text: '생성된 캠페인, 광고그룹, 광고를 확인 할 수 있고, 운영했던 데이터를 한눈에 볼 수 있습니다.',
    openTab: 'campaigns',
  },
  {
    target: '#tut-daterange',
    title: '기간 설정',
    text: '날짜를 설정하여 해당 기간에 운영했던 캠페인 데이터를 확인 할 수 있습니다.',
    openEl: '#date-menu',        /* 스텝 진입 시 캘린더 열기 */
    extras: ['#date-menu'],      /* 스포트라이트 영역에 캘린더 포함 */
  },
  {
    target: null,
    title: '튜토리얼 완료! 🎉',
    text: '이제 대시보드 구조를 이해했습니다. 시뮬레이터에서 직접 캠페인을 셋팅해 보세요!',
    done: true,
  },
];

/* ─── 튜토리얼 엔진 ─── */
const TUT = {
  i: 0,

  start(idx = 0) {
    this.i = idx;
    document.getElementById('tut-overlay').style.display = 'block';
    document.getElementById('tut-restart').style.display = 'none';
    this.show();
  },

  end() {
    if (this._openEl) { const p = document.querySelector(this._openEl); if (p) p.style.display = 'none'; this._openEl = null; }
    if (this._openTab) { selectTableTab('campaigns'); this._openTab = null; }
    document.getElementById('tut-overlay').style.display = 'none';
    document.getElementById('tut-restart').style.display = 'flex';
  },

  next() { if (this.i < TUT_STEPS.length - 1) { this.i++; this.show(); } else this.end(); },
  prev() { if (this.i > 0) { this.i--; this.show(); } },

  show() {
    const step = TUT_STEPS[this.i];
    const spot = document.getElementById('tut-spot');
    const card = document.getElementById('tut-card');

    /* 스텝 연동 요소 열기/닫기 (예: 필터 드롭다운) */
    if (this._openEl && this._openEl !== step.openEl) {
      const prev = document.querySelector(this._openEl);
      if (prev) prev.style.display = 'none';
    }
    if (step.openEl) {
      const cur = document.querySelector(step.openEl);
      if (cur) cur.style.display = 'block';
    }
    this._openEl = step.openEl || null;

    /* 스텝 연동 테이블 탭 전환 (예: Funding instruments) */
    if (this._openTab && this._openTab !== step.openTab) selectTableTab('campaigns');
    if (step.openTab) selectTableTab(step.openTab);
    this._openTab = step.openTab || null;

    /* 스포트라이트 */
    const el = step.target ? document.querySelector(step.target) : null;
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const place = () => {
        let r = el.getBoundingClientRect();
        /* extras: 열린 드롭다운 등 추가 요소를 스포트라이트 영역에 합치기 */
        if (step.extras) {
          let L = r.left, T = r.top, R = r.right, B = r.bottom;
          for (const sel of step.extras) {
            const ex = document.querySelector(sel);
            if (ex && ex.offsetParent !== null) {
              const er = ex.getBoundingClientRect();
              L = Math.min(L, er.left); T = Math.min(T, er.top);
              R = Math.max(R, er.right); B = Math.max(B, er.bottom);
            }
          }
          r = { left: L, top: T, right: R, bottom: B, width: R - L, height: B - T };
        }
        spot.classList.remove('hidden');
        spot.style.left   = (r.left - 6) + 'px';
        spot.style.top    = (r.top - 6) + 'px';
        spot.style.width  = (r.width + 12) + 'px';
        spot.style.height = (r.height + 12) + 'px';
        this.placeCard(card, r, step.place);
      };
      /* 스크롤 이동 후 위치 계산 */
      setTimeout(place, 250);
      place();
    } else {
      spot.classList.add('hidden');
      card.classList.add('center');
      card.style.left = ''; card.style.top = '';
    }

    /* 말풍선 */
    const last = this.i === TUT_STEPS.length - 1;
    card.innerHTML = `
      <div class="tut-step-badge">STEP ${this.i + 1} / ${TUT_STEPS.length}</div>
      <div class="tut-title">${step.title}</div>
      <div class="tut-text">${step.text}</div>
      <div class="tut-actions">
        <button class="tut-skip" onclick="TUT.end()">건너뛰기</button>
        <button class="tut-prev" onclick="TUT.prev()" ${this.i === 0 ? 'disabled' : ''}>이전</button>
        ${step.done
          ? `<a class="tut-next" href="/simulator/" style="text-decoration:none">시뮬레이터 가기 →</a>`
          : `<button class="tut-next" onclick="TUT.next()">다음 →</button>`}
      </div>
      <div class="tut-dots">${TUT_STEPS.map((_, d) => `<span class="tut-dot ${d === this.i ? 'on' : ''}"></span>`).join('')}</div>`;
  },

  /* 말풍선을 대상 요소 주변에 배치
     place 지정 시 해당 방향 우선('right' 등), 기본은 아래 → 위 → 옆 순 */
  placeCard(card, r, place) {
    card.classList.remove('center');
    const W = 340, H = card.offsetHeight || 220, PAD = 14;
    let left, top;
    if (place === 'right' && r.right + PAD + W < innerWidth) {               // 오른쪽
      left = r.right + PAD;
      top  = Math.max(16, Math.min(r.top + r.height / 2 - H / 2, innerHeight - H - 16));
    } else {
      left = r.left + r.width / 2 - W / 2;
      left = Math.max(16, Math.min(left, innerWidth - W - 16));
      if (r.bottom + H + PAD < innerHeight) top = r.bottom + PAD;            // 아래
      else if (r.top - H - PAD > 0)         top = r.top - H - PAD;           // 위
      else { top = Math.max(16, innerHeight / 2 - H / 2); left = Math.min(r.right + PAD, innerWidth - W - 16); } // 옆
    }
    card.style.left = left + 'px';
    card.style.top  = top + 'px';
  },
};

/* ─── 대시보드 소소한 인터랙션 ─── */
function toggleFilterMenu() {
  const m = document.getElementById('filter-menu');
  m.style.display = m.style.display === 'none' ? 'block' : 'none';
}

function toggleDateMenu() {
  const m = document.getElementById('date-menu');
  m.style.display = m.style.display === 'none' ? 'block' : 'none';
}

function toggleAud() {
  const body = document.getElementById('aud-body');
  const chev = document.getElementById('aud-chev');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  chev.classList.toggle('open', !open);
}

document.querySelectorAll('.metric').forEach(m => m.addEventListener('click', () => {
  document.querySelectorAll('.metric').forEach(x => x.classList.remove('active'));
  m.classList.add('active');
}));

/* 테이블 탭 ↔ 패널 전환 (funding만 전용 패널, 나머지는 캠페인 테이블 표시) */
function showTablePanel(key) {
  document.getElementById('panel-funding').style.display   = key === 'funding' ? '' : 'none';
  document.getElementById('panel-campaigns').style.display = key === 'funding' ? 'none' : '';
}

function selectTableTab(key) {
  document.querySelectorAll('.ttab').forEach(x => x.classList.toggle('active', x.dataset.panel === key));
  showTablePanel(key);
}

document.querySelectorAll('.ttab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.ttab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  showTablePanel(t.dataset.panel);
}));

/* 창 크기 변경 시 스포트라이트 재배치 */
window.addEventListener('resize', () => {
  if (document.getElementById('tut-overlay').style.display === 'block') TUT.show();
});

/* ─── 시작: 페이지 진입 시 자동 실행 (?step=N 으로 특정 단계 딥링크 가능) ─── */
TUT.start(Math.max(0, (parseInt(new URLSearchParams(location.search).get('step')) - 1) || 0));
