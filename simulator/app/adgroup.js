/* ══════════════════════════════════════════════
   앱 설치수(app) 캠페인 — 광고그룹 단계
   core.js 의 공용 헬퍼·상태를 사용한다.
   이 파일만 수정하면 이 목표의 광고그룹 화면이 바뀐다.
══════════════════════════════════════════════ */
(function () {
  window.CAMPAIGN_MODULES = window.CAMPAIGN_MODULES || {};
  const M = (window.CAMPAIGN_MODULES.app = window.CAMPAIGN_MODULES.app || {});

  M.adGroup = function () {
    return secPromoApp() + secDetails() + secDemographics() + secDelivery() + secAdvTargeting();
  };

  /* 2-0 홍보할 앱 — 앱 설치수 목표는 광고그룹 최상단 전용 섹션 */
  function secPromoApp() {
    return sectionCard('promoApp', '📱', '홍보할 앱', promoAppField());
  }

  /* 2-1 세부 정보 */
  function secDetails() {
    return sectionCard('details', '⚙️', '세부 정보', `
      <div class="sim-field">
        ${flabel('이름')}
        <input class="sim-input" value="${esc(state.adGroupName)}" oninput="SIM.set('adGroupName', this.value)">
      </div>
      <div class="sim-row">
        <div class="sim-field">
          ${flabel('일일 예산')}
          ${krwInput('100', state.budget, 'budget')}
        </div>
        <div class="sim-field">
          ${flabel('총 지출 한도', '', true)}
          ${krwInput('예산 한도 없음', state.spendCap, 'spendCap')}
        </div>
      </div>
      <div class="sim-row">
        <div class="sim-field">
          ${flabel('시작 시간')}
          ${dtField('start')}
        </div>
        <div class="sim-field">
          ${flabel('종료 시간', '', true)}
          ${dtField('end', '무기한 운영')}
        </div>
      </div>`);
  }

  /* 2-2 인구통계 */
  function secDemographics() {
    return sectionCard('demo', '👥', '인구통계', `
      <div class="sim-field">
        ${flabel('위치', '특정 국가, 지역 또는 도시의 사용자를 타겟팅하세요. 여러 위치를 포함하거나 제외할 수 있습니다.')}
        ${locationPicker()}
      </div>
      <div class="sim-field">
        ${flabel('언어', '특정 언어를 사용하는 사용자를 타겟팅하세요.')}
        ${searchPicker('langs', '언어 검색...', '', '포함됨')}
      </div>
      <div class="sim-field">
        ${flabel('성별')}
        ${radiosInline('gender', ['전체', '남성', '여성'])}
      </div>
      <div class="sim-field">
        ${flabel('연령')}
        ${radios('ageMode', [
          { v: 'all',   label: '모든 연령' },
          { v: 'range', label: '연령 범위' },
        ])}
        ${state.ageMode === 'range' ? `
          <div class="sim-age-range">
            <select class="sim-input sim-select" onchange="SIM.setSeg('ageMin', this.value)">
              ${AGE_MIN_OPTS.map(v => `<option ${state.ageMin === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
            <span class="sim-age-sep">–</span>
            <select class="sim-input sim-select" onchange="SIM.setSeg('ageMax', this.value)">
              ${AGE_MAX_OPTS.map(v => `<option ${state.ageMax === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>` : ''}
      </div>
      <div class="sim-field">
        ${flabel('운영 체제')}
        ${radios('osMode', [
          { v: 'all',      label: '모든 기기에서 전달 최적화' },
          { v: 'specific', label: '특정 기기 선택' },
        ])}
        ${state.osMode === 'specific' ? deviceChecklist() : ''}
      </div>
      <div class="sim-field">
        ${flabel('Device model')}
        <div class="sim-search-wrap">
          <span class="sim-search-ic">🔍</span>
          <input class="sim-input sim-search" placeholder="Search device models..." value="${esc(state.deviceModel)}" oninput="SIM.set('deviceModel', this.value)">
        </div>
      </div>
      <div class="sim-field">
        ${flabel('Carrier')}
        <div class="sim-search-wrap">
          <span class="sim-search-ic">🔍</span>
          <input class="sim-input sim-search" placeholder="Search carriers..." value="${esc(state.carrier)}" oninput="SIM.set('carrier', this.value)">
        </div>
      </div>
      <div class="sim-field">
        ${flabel('맞춤 오디언스', '업로드한 목록 및 웹사이트 방문자를 타겟팅하거나 제외하세요.')}
        <div class="sim-search-wrap">
          <span class="sim-search-ic">🔍</span>
          <input class="sim-input sim-search" placeholder="오디언스 검색..." value="${esc(state.customAudience)}" oninput="SIM.set('customAudience', this.value)">
        </div>
      </div>`);
  }

  /* 특정 기기 선택 — OS 체크박스 + 버전 셀렉트 */
  function deviceChecklist() {
    const osLock = !!state.promoApp; // 홍보할 앱을 선택하면 스토어에 맞춰 OS 고정 (변경 불가)
    const verSelect = (field, opts, current) => `
      <div class="sim-check-sub">
        <select class="sim-input sim-select" onchange="SIM.setSeg('${field}', this.value)">
          ${opts.map(v => `<option ${current === v ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>`;
    return `
      <div class="sim-checklist">
        <div>
          <label class="sim-check">
            <input type="checkbox" ${state.devIos ? 'checked' : ''} ${osLock ? 'disabled' : ''} onchange="SIM.setBool('devIos', this.checked)">
            <span class="sim-check-label">iOS</span>
          </label>
          ${state.devIos ? verSelect('iosVer', IOS_VERSIONS, state.iosVer) : ''}
        </div>
        <div>
          <label class="sim-check">
            <input type="checkbox" ${state.devAndroid ? 'checked' : ''} ${osLock ? 'disabled' : ''} onchange="SIM.setBool('devAndroid', this.checked)">
            <span class="sim-check-label">Android</span>
          </label>
          ${state.devAndroid ? verSelect('androidVer', ANDROID_VERSIONS, state.androidVer) : ''}
        </div>
        <label class="sim-check">
          <input type="checkbox" ${state.devWeb ? 'checked' : ''} ${osLock ? 'disabled' : ''} onchange="SIM.setBool('devWeb', this.checked)">
          <span class="sim-check-label">Web</span>
        </label>
      </div>`;
  }

  /* 2-3 전달 및 게재 위치 */
  function secDelivery() {
    /* 앱 설치수 목표는 자동 입찰만 지원 — 타 목표에서 넘어온 최대 입찰가 상태 방어 */
    if (state.bid === 'max') state.bid = 'auto';
    return sectionCard('delivery', '⚡', '전달 및 게재 위치', `
      <div class="sim-row">
        <div class="sim-field">
          ${flabel('최적화 목표')}
          <select class="sim-input sim-select" onchange="SIM.setSeg('optGoal', this.value)">
            <option value="install" ${state.optGoal !== 'click' ? 'selected' : ''}>앱 설치수</option>
            <option value="click" ${state.optGoal === 'click' ? 'selected' : ''}>앱 클릭수</option>
          </select>
        </div>
        <div class="sim-field">
          ${flabel('결제 방법')}
          <!-- 최적화 목표에 따라 고정 — 앱 설치수: 노출수(CPM), 앱 클릭수: 앱 클릭수 -->
          <input class="sim-input" value="${state.optGoal === 'click' ? '앱 클릭수' : '노출수 (CPM)'}" readonly style="background:#fafaf9;color:#8c8880">
        </div>
      </div>
      <div class="sim-field">
        ${flabel('입찰 전략')}
        ${radios('bid', [
          { v: 'auto', label: '자동 입찰', badge: '권장', desc: '최저 가격으로 결과를 자동으로 극대화합니다.' },
        ])}
      </div>
      <div class="sim-field">
        ${flabel('게재 위치')}
        ${radios('placementMode', [
          { v: 'all',    label: '모든 게재 위치에서 전달 최적화' },
          { v: 'custom', label: '특정 게재 위치 선택' },
        ])}
        ${state.placementMode === 'custom' ? placementChecklist() : ''}
      </div>
      <button class="sim-adv-toggle" onclick="SIM.toggleAdv()">고급 <span class="sim-sec-chev ${state.advOpen ? 'open' : ''}">▾</span></button>
      ${state.advOpen ? `
        <div class="sim-adv-body">
          <div class="sim-field">
            ${flabel('Pacing')}
            ${radios('pacing', [
              { v: 'standard',    label: 'Standard', badge: '권장', desc: '예산을 최대한 효율적으로 사용하도록 하루 동안 광고를 고르게 게재합니다.' },
              { v: 'accelerated', label: 'Accelerated', desc: '스포츠 경기처럼 시간이 제한된 캠페인에 적합하며, 매일 최대한 자주 광고를 게재합니다.' },
            ])}
          </div>
          <div class="sim-field">
            ${flabel('빈도 제한')}
            ${radios('freqMode', [
              { v: 'auto',   label: '빈도 자동 최적화', desc: '최적의 성과를 위해 광고 노출 빈도를 X가 자동으로 조정합니다.' },
              { v: 'custom', label: '사용자 지정 빈도 제한 설정' },
            ])}
            ${state.freqMode === 'custom' ? `
              <div class="sim-freq-row">
                <input class="sim-input" type="number" min="1" value="${state.freqCap}" onchange="SIM.set('freqCap', this.value)">
                <span class="sim-freq-label">회 노출 /</span>
                <select class="sim-input sim-select" onchange="SIM.setSeg('freqPeriod', this.value)">
                  ${['1일', '7일', '30일'].map(v => `<option ${state.freqPeriod === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
              </div>` : ''}
          </div>
          <div class="sim-field">
            ${flabel('Google Campaign Manager impression tag')}
            <input class="sim-input" placeholder="https://ad.doubleclick.net/ddm/trackimp" value="${esc(state.gcmImp)}" oninput="SIM.set('gcmImp', this.value)">
          </div>
          <div class="sim-field">
            ${flabel('Google Campaign Manager click tag')}
            <input class="sim-input" placeholder="https://ad.doubleclick.net/ddm/trackclk" value="${esc(state.gcmClick)}" oninput="SIM.set('gcmClick', this.value)">
          </div>
          <div class="sim-fdesc">추적 태그를 제공하면 X가 캠페인 관련 데이터를 Google Campaign Manager에 전송하는 데 동의하는 것으로 간주됩니다.</div>
        </div>` : ''}`);
  }

  /* 특정 게재 위치 선택 — 설명 있는 체크박스 (홈 타임라인은 항상 포함) */
  function placementChecklist() {
    return `
      <div class="sim-checklist">
        ${PLACEMENTS.map(p => {
          const on = state.placements.includes(p.v);
          return `
          <label class="sim-check ${p.locked ? 'locked' : ''}">
            <input type="checkbox" ${on ? 'checked' : ''} ${p.locked ? 'disabled' : ''}
                   onchange="SIM.toggle('placements','${p.v}')">
            <span>
              <span class="sim-check-label">${p.v}</span>
              <span class="sim-check-desc">${p.desc}</span>
            </span>
          </label>`;
        }).join('')}
      </div>`;
  }

  /* 2-4 고급 타겟팅 */
  function secAdvTargeting() {
    return sectionCard('advTargeting', '🎯', '고급 타겟팅', `
      <div class="sim-optrow">
        <div>
          ${flabel('타겟팅 최적화', 'X의 고급 AI 기술이 오디언스 선택을 개선하여 광고 성과를 향상시킬 수 있습니다. <a class="sim-link" href="https://business.x.com/en/help/campaign-setup/campaign-targeting/optimized-targeting" target="_blank" rel="noopener">자세히 알아보기 ↗</a>')}
        </div>
        <button class="sim-switch ${state.targetingOpt ? 'on' : ''}" onclick="SIM.setBool('targetingOpt', ${!state.targetingOpt})" aria-label="타겟팅 최적화"></button>
      </div>
      <div class="sim-field">
        ${flabel('관심사', '관심사, 취미, 팔로우하는 주제를 기반으로 사용자에게 도달하세요. 여러 항목을 한 번에 체크할 수 있습니다.')}
        ${checkSearchPicker('interests', '관심사 검색...')}
      </div>
      <div class="sim-field">
        ${flabel('키워드', '사용자가 검색, 게시 또는 참여한 키워드로 오디언스를 타겟팅합니다.')}
        ${enterPicker('keywords', '키워드 검색... (Enter로 추가)', '')}
      </div>
      <div class="sim-field">
        ${flabel('팔로워 유사', '계정 팔로워와 유사한 관심사를 가진 사용자에게 도달하세요.')}
        ${enterPicker('lookalikes', '@사용자 이름 검색... (Enter로 추가)', '')}
      </div>
      <label class="sim-check">
        <input type="checkbox" ${state.retargetPast ? 'checked' : ''} onchange="SIM.setBool('retargetPast', this.checked)">
        <span class="sim-check-label">Retarget people who saw or engaged with your past posts</span>
      </label>
      ${state.retargetPast ? `
        <div class="sim-retarget">
          <div class="sim-warn">ⓘ Post Retargeting will not be reflected in the Audience Estimate at this time.</div>
          <div class="sim-field">
            ${flabel('Retargeting type')}
            <select class="sim-input sim-select" style="width:100%" onchange="SIM.setSeg('retargetType', this.value)">
              ${['People who saw your posts', 'People who saw and engaged with your posts']
                .map(v => `<option ${state.retargetType === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="sim-field" style="margin-bottom:0">
            ${flabel('Post type')}
            <select class="sim-input sim-select" style="width:100%" onchange="SIM.setSeg('postType', this.value)">
              ${['Organic posts', 'Posts from specific campaigns', 'Organic posts and posts from specific campaigns']
                .map(v => `<option ${state.postType === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>` : ''}`);
  }
})();
