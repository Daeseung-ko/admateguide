/* ══════════════════════════════════════════════
   판매(sales) 캠페인 — 광고 단계
   core.js 의 공용 adComposer() 를 그대로 사용한다.
   광고 화면 수정은 core.js 의 adComposer() 에서.
══════════════════════════════════════════════ */
(function () {
  window.CAMPAIGN_MODULES = window.CAMPAIGN_MODULES || {};
  const M = (window.CAMPAIGN_MODULES.sales = window.CAMPAIGN_MODULES.sales || {});

  M.ad = function () {
    return adComposer();
  };
})();