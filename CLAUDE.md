# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**AdMate Help Center** — 광고 플랫폼(Facebook / Instagram / X / Google Ads) 도움말 센터.
Express 단일 서버 + 바닐라 JS SPA 구조이며, 빌드 도구·번들러·테스트 프레임워크 없이 동작한다.
UI 텍스트와 코드 주석은 모두 한국어를 사용한다.

## 명령어

```bash
npm start          # node server.js — http://localhost:3000
```

- 빌드/린트/테스트 스크립트는 없다. 프론트엔드 파일(html/css/js)은 수정 후 브라우저 새로고침만으로 반영된다.
- 서버 코드(server.js) 수정 시에는 서버 재시작이 필요하다.

## 배포 환경 (이중 모드)

server.js는 환경변수 존재 여부로 로컬/Vercel 모드를 자동 전환한다. **저장소 관련 코드를 수정할 때는 두 모드 모두 고려할 것.**

| 환경변수 | 있을 때 | 없을 때 (로컬) |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas (`admate` DB, `store` 컬렉션의 `{key:'main'}` 단일 문서) | `data/articles.json` 파일 |
| `CLOUDINARY_*` | Cloudinary 업로드 | `uploads/` 디렉터리 + multer diskStorage |

- Vercel에서는 `api/index.js`가 `server.js`를 그대로 re-export하며, `vercel.json`이 `/api/*`와 `/uploads/*`를 서버리스 함수로 라우팅한다.
- Vercel + MongoDB 미설정 상태에서는 저장이 불가능하다(파일 시스템이 read-only).

## 아키텍처

### 메인 앱 (루트)
- **server.js** — Express 서버 전체. 데이터 레이어(loadArticles/saveArticles), 업로드 미들웨어, REST API, SPA 폴백이 한 파일에 있다.
- **index.html + app.js + style.css** — SPA 프론트엔드. 프레임워크 없이 해시 라우팅(`navigate()`)으로 home / category / article 페이지를 전환한다.
- 데이터 구조: `{ facebook: [...], instagram: [...], twitter: [...], google: [...] }` — 카테고리별 게시글 배열. 게시글은 `{ id, title, excerpt, date, views, media, excerptMedia, steps: [{ text, media }] }` 형태.
- 관리자 인증은 app.js 상단의 `ADMIN` 상수(하드코딩)로 프론트엔드에서만 검사한다. 서버 API에는 인증이 없다.
- API 엔드포인트: `GET/POST/PUT/DELETE /api/articles[...]`, `POST/DELETE /api/upload`, `GET /api/config`, `GET /api/debug`, `POST /api/reset`

### 독립 서브 앱 (정적 서빙)
- **simulator/** — X 캠페인 셋팅 시뮬레이터. `core.js`가 공용 로직이며, 목표별 폴더(reach/traffic/engagement/sales/app/video)의 `adgroup.js`/`ad.js`가 `CAMPAIGN_MODULES[목표]`에 렌더러를 등록하는 플러그인 구조. 각 `index.html`이 core.js 로드 전에 `window.SIM_PAGE`로 모드를 선언한다.
- **x-tutorial/** — X 광고 대시보드 튜토리얼(스포트라이트 코치마크). `tutorial.js`의 `TUT_STEPS` 배열에 단계를 추가/수정한다.

두 서브 앱은 메인 앱과 코드를 공유하지 않는 완전 독립 정적 페이지다.

## 작업 기록

> 새로운 작업을 완료하면 아래에 날짜와 함께 요약을 추가할 것. (최신 항목을 위에)

- **2026-09-16** — 문서 튜토리얼 줌을 **돋보기(loupe) 방식**으로 개편 + 카드 강조어를 네모 박스로 (스포트라이트 있는 모든 이미지 스텝 공통).
  - **돋보기 줌**: 전체 스크린샷은 그대로 두고 **하이라이트 영역만 확대**. 각 rect 위에 `.atv-loupe`(배경=스크린샷)를 얹고, `layoutTutLoupes()`가 표시 이미지 크기에 맞춰 `background-size/position`을 픽셀로 계산해 해당 rect를 1:1로 정렬 → `transform:scale(tutZoom)`(origin center)로 그 영역만 돋보기처럼 커진다. base 이미지는 스케일하지 않음(전체 화면 고정). 이전의 이미지 전체 스케일(`.atv-zoom`/`.atv-zoomclip`) 방식은 제거.
  - **자동 모션**: 스텝 진입 시 `.atv-loupe.intro`가 `atvLoupeIntro` 키프레임(opacity 0→1, scale 1→1.45→1, 1.9s, delay .3s) 재생 — 하이라이트가 돋보기처럼 커졌다 사라짐. `animationend`에서 intro 제거. rest(100%)에서는 loupe 숨김(opacity 0)이라 기존 스포트라이트 뷰와 동일.
  - 돋보기 활성(인트로/줌>1) 시 `.atv-imgwrap.magnifying`으로 원본 스포트라이트 테두리는 감춰 이중 테두리 방지(라벨 유지), loupe 자체 렌즈 프레임(outline+shadow) 표시. 수동 컨트롤 `.atv-zoomctl`(－/배율%/＋)·키보드 `+`/`-`로 loupe 배율 조절, 스텝 이동·문서 진입 시 100% 초기화. `layoutTutLoupes`는 창 resize에도 재정렬. `prefers-reduced-motion` 시 모션 없음.
  - **카드 강조어 박스**: `.atv-kw`(말풍선 따옴표 단어)를 옅은 빨강 배경+빨강 테두리 네모 박스로 변경(box-decoration-break:clone). X(트위터) 문서는 파랑 변형(`#art-tut-overlay.atv-x .atv-kw`).
  - style.css `.atv-loupe`/`@keyframes atvLoupeIntro`/`.atv-imgwrap.magnifying .atv-spot`/`.atv-kw`(박스) 신설·수정.
  - 검증: 로컬 서버 + Chrome CDP(headless)로 'Meta 페이지 엑세스 승인 가이드_KR' STEP1 확인 — 확대 시 base 이미지 `transform:none`(전체 정지)·loupe만 scale(1.8), `.atv-kw` 1px 빨강 테두리+음영 박스, rest에서 loupe opacity 0(기존 뷰 동일), 다음 스텝 이동 시 100% 초기화 스크린샷·어서션 확인 완료.

- **2026-09-16** — 'Meta 페이지 엑세스 승인 가이드_KR' 튜토리얼 스포트라이트 정비 (따옴표 텍스트 기준, 좌표 픽셀 스캔, 전부 `auto:false`).
  - 각 스텝 설명의 따옴표 단어를 이미지(1905×958)에서 찾아 실제 UI 요소에 맞춰 재조정. 최종 좌표: STEP 1 '설정'(x0.2/y50.4/w18.2/h6.0 — 사이드바 메뉴 행 탭 전체로 우측 구분선까지 확장, 기존 auto 좌표가 커버 사진 영역 가리키던 오류 수정, card:right), STEP 2 '페이지 설정'(x0.2/y84.2/w18.3/h5.8 — 사이드바 탭 전체로 확장, 기존 w77.2 과폭 수정), STEP 3 '페이지 엑세스' 행(x41.4/y27.0/w35.8/h8.0), STEP 4 '대기 중인 엑세스 요청'~'요청 검토' 버튼을 한 박스로 통합(x26.9/y52.2/w65.4/h14.0), STEP 5 '다음' 버튼 맞춤(x57.5/y77.4/w6.6/h4.1 — 기존 좌표가 모달 상단 가리키던 오류 수정, card:above), STEP 6 '수락' 버튼 맞춤(x57.6/y71.3/w6.3/h3.9, card:above), STEP 7 '확인' 버튼 맞춤(x36.2/y59.7/w27.8/h4.1, spots 없던 스텝에 추가). STEP 8 '엑세스 권한이 있는 파트너' 섹션 헤더~Nasmedia 파트너 행을 우측 끝(⋯ 메뉴 포함)까지 확장(x26.9/y45.7/w66.2/h15.0, card:below) 신규 — 따옴표는 없지만 사용자 요청으로 추가.
  - System.Drawing 크롭 확대 + 오버레이 사각형 렌더로 8개 스텝 전부 시각 정렬 검증 완료.

- **2026-07-24** — 문서 튜토리얼 PPTX 다운로드 기능 추가 (모든 튜토리얼 문서 공통).
  - 튜토리얼 오버레이 상단바에 '⬇ PPT 다운로드' 버튼(`.atv-ppt`) — 클릭 시 PptxGenJS(jsdelivr CDN, 최초 클릭 때 지연 로드)로 표지(문서 제목 + 'KT Nasmedia 데이터분석팀') + 스텝별 슬라이드 + 마지막 E.O.D 슬라이드 생성 후 `문서제목.pptx` 저장.
  - `tutStepShot()`: 스텝 이미지를 원본 해상도 캔버스에 그리고 스포트라이트를 합성 — 딤(rgba(8,8,8,.45)) + 홀펀치(원본 재드로잉) + 테두리 + 라벨 칩(위 공간 없으면 아래, 왼쪽 공간 없으면 오른쪽 배치). X 카테고리는 파랑(#1d9bf0), 그 외 빨강. JPEG 0.92로 인코딩.
  - 슬라이드: 16:9, STEP n/총 배지 + 스텝 텍스트(불릿 제거, Malgun Gothic) + 이미지(9.2×4.05in 박스에 비율 유지 맞춤).
  - 검증: 서버 경유 iframe 하니스로 X 광고계정 연동 가이드_KR 9스텝 → 표지+9슬라이드 PPTX ≈714KB 생성, 스텝2 합성 이미지(칩 스포트라이트+라벨) 시각 확인 완료.

- **2026-07-23** — simulator 앱 설치수 목표의 광고 단계 링크 대상 개편 + 홍보할 앱 동기화.
  - adComposer: 앱 설치수 목표(`state.objective === 'app'`)면 '링크 대상' 라벨과 웹사이트 박스 미노출, '앱' 박스만 항상 선택 고정(렌더 시 `linkTarget='app'` 강제, 클릭 토글 제거).
  - `SIM.setPromoApp`: 광고그룹에서 홍보할 앱 선택 시 광고 단계 플랫폼 체크·앱 셀렉트 동기화 — App Store → appIos 체크+appIosApp 설정(+appAndroid 해제), Google Play → 반대. 기존 OS 타겟팅 자동 설정과 동일하게 배타적.
  - 홍보할 앱 선택 시 OS 고정: 6개 adgroup.js deviceChecklist에 `osLock`(state.promoApp) — 특정 기기 선택의 iOS/Android/Web 체크박스 전부 disabled(스토어에 맞는 값으로 잠금). core.js 광고 단계 플랫폼 iOS/Android 체크박스도 promoApp 있으면 disabled. 앱 선택을 '앱 선택...'으로 되돌리면 잠금 해제.

- **2026-07-22** — simulator 업종 선택을 단일 선택(라디오 semantics)으로 변경.
  - core.js `SIM.setIndustry(v)` 신설(`state.industries = [v]` — 배열 구조는 그대로 유지해 persist/검증/벤치마크 로직 무변경), 캠페인 패널 input을 checkbox → radio(name=sim-industry)로. 힌트 문구 '업종을 하나 이상 선택' → '업종을 선택해 주세요'.
- **2026-07-22** — simulator 완료 화면에 업종×목표 벤치마크 카드 추가.
  - core.js `BENCHMARKS`('업종|목표id' 키) + `benchmarkHTML()` — 선택한 업종(다중 선택 중 첫 매칭)과 목표 조합의 데이터가 있으면 학습용 문구 아래에 다크 카드(골드 BENCHMARK 배지 + '게임 업종 · 도달 목표' + 기간 + 지표 타일 그리드, `.sim-bench-*`) 표시. 현재 데이터: 게임|reach (CPM 455~500원 / CPC(링크) 340~380원 / CTR(링크) 0.13~0.16% / CPV 4~6원 / VTR 10~13%, 최근 3개월간 평균), `BENCH_REACH_ALL`(CPM 280~600원 / CPC(링크) 180~1,100원 / CTR(링크) 0.06~0.16% / CPV 4~19원 / VTR 6~12%, "내부 사례가 없어 전체 업종 기준으로 제공")을 금융·가전·앱/사이트·패션·화장품·수송·단체·쇼핑몰·교육·관광/레저·컴퓨터·의료/건강·문화/예술·주택/가구·기타 15개 업종 |reach 에 일괄 적용. 방송/통신|reach (CPM 284원 / CPC(링크) 180원 / CTR(링크) 0.16% / CPV 0원 / VTR 0%)·식음료|reach (CPM 261원 / CPC(링크) 189원 / CTR(링크) 0.14% / CPV 0원 / VTR 0%)·생활/잡화|reach (CPM 160원 / CPC(링크) 193원 / CTR(링크) 0.07% / CPV 0원 / VTR 0%)는 전용 데이터(최근 3개월 평균). **도달 목표는 19개 전 업종 커버 완료.** 참여수(engagement) 목표: 수송|engagement (CPM 149원 / CPC(링크) 86원 / CTR(링크) 0.18%)·문화/예술|engagement (CPM 869원 / CPC(링크) 439원 / CTR(링크) 0.2%)·생활/잡화|engagement (CPM 84원 / CPC(링크) 95원 / CTR(링크) 0.1%)는 전용 데이터(모두 CPV 0원/VTR 0%, 최근 3개월 평균), 나머지 16개 업종은 `BENCH_ENGAGE_ALL`(CPM 84~869원 / CPC(링크) 86~439원 / CTR(링크) 0.09~0.2% / CPV 0원 / VTR 0%, "내부 사례가 없어 전체 업종 기준으로 제공") — INDUSTRIES에서 전용 키 없는 업종에 자동 적용. **참여수 목표도 19개 전 업종 커버 완료.** 웹사이트 트래픽(traffic) 목표: 게임|traffic (CPM 461~547원 / CPC(링크) 168~416원 / CTR(링크) 0.13~0.27% / CPV 2~10원 / VTR 18~30%)·앱/사이트|traffic (CPM 800~1,100원 / CPC(링크) 400~560원 / CTR(링크) 0.15~0.25% / CPV 0원 / VTR 0%)·화장품|traffic (CPM 234~720원 / CPC(링크) 100~344원 / CTR(링크) 0.19~0.27% / CPV 6~10원 / VTR 9~12%)·수송|traffic (CPM 150~700원 / CPC(링크) 100~344원 / CTR(링크) 0.17~0.4% / CPV 0원 / VTR 0%)·교육|traffic (CPM 295~400원 / CPC(링크) 100~344원 / CTR(링크) 0.17~0.4% / CPV 0원 / VTR 0%)·컴퓨터|traffic (CPM 252~490원 / CPC(링크) 200~320원 / CTR(링크) 0.11~0.21% / CPV 0원 / VTR 0%)·문화/예술|traffic (CPM 495~1,700원 / CPC(링크) 210~660원 / CTR(링크) 0.24~0.4% / CPV 2~9원 / VTR 21~30%)·생활/잡화|traffic (CPM 130~300원 / CPC(링크) 210~660원 / CTR(링크) 0.24~0.4% / CPV 0원 / VTR 0%)는 전용 데이터(최근 3개월 평균), 나머지 11개 업종은 `BENCH_TRAFFIC_ALL`(CPM 400~1,200원 / CPC(링크) 300~700원 / CTR(링크) 0.1~0.25% / CPV 6~12원 / VTR 6~23%, "내부 사례가 없어 전체 업종 기준으로 제공") 자동 적용. **트래픽 목표도 19개 전 업종 커버 완료.** 동영상 조회 수(video) 목표: 게임|video (CPM 350~430원 / CPC(링크) 380~680원 / CTR(링크) 0.07~0.09% / CPV 1~3원 / VTR 21~24%)·문화/예술|video (CPM 270~1,200원 / CPC(링크) 200~1,000원 / CTR(링크) 0.13~0.16% / CPV 1~4원 / VTR 20~32%)는 전용 데이터(최근 3개월 평균), 나머지 17개 업종은 `BENCH_VIDEO_ALL`(CPM 270~1,200원 / CPC(링크) 200~1,000원 / CTR(링크) 0.09~0.16% / CPV 1~7원 / VTR 20~32%, "내부 사례가 없어 전체 업종 기준으로 제공") 자동 적용. **동영상 목표도 19개 전 업종 커버 완료.** 앱 설치수(app) 목표: 문화/예술|app (CPM 880원 / CPC(링크) 260원 / CTR(링크) 0.34% / CPV 3원 / VTR 28% / CPI 2,000원 — 첫 6지표 사례, 그리드 minmax 94px로 축소해 6타일 한 줄 배치)는 전용 데이터, 나머지 18개 업종은 `BENCH_APP_NONE`("최근 데이터 없음" + note "데이터분석팀(tw@nasmedia.co.kr)로 문의 부탁드립니다." — 벤치마크 카드에 `note` 필드 지원 추가: metrics 비면 그리드 생략, 이메일은 mailto 골드 링크). **앱 목표도 19개 전 업종 커버 완료.** 조합 데이터 없으면 미표시. 새 조합은 BENCHMARKS에 항목만 추가하면 됨.
- **2026-07-22** — simulator 완료 화면에 'X 벤치마크 데이터 확인' 버튼 추가.
  - panelDone의 '도움말 문서 보기' 우측에 배치 — https://note.nasmedia.co.kr:4439/benchmark/media_search/nxis 새 탭 이동.
- **2026-07-22** — simulator 시작 안내 팝업 추가.
  - core.js `introModal()` — 허브 첫 진입(step 0) 시 "캠페인 셋팅을 미리 체험하고, 벤치마크 데이터를 확인 할 수 있습니다" + 시작하기 버튼. `state.introSeen`(persist 포함)으로 세션 내 1회 — 허브↔목표 이동은 재표시 안 되고, 새로고침 리셋 시 다시 표시. renderStage의 패널 밖 notice 슬롯 재사용.
- **2026-07-22** — 'Meta 페이지 파트너 할당 가이드_KR' STEP 1·5·6·7 스포트라이트 정비 (좌표는 픽셀 스캔, 전부 `auto:false`).
  - STEP 1: 이름 목록의 KT Nasmedia 선택 행(x21.8/y19.2/w23.1/h7.1) 신규. STEP 5: '할당' rect를 돌아가기 우측 실제 파란 버튼(x61.4/y86.6/w3.9/h4.9)으로 수정. STEP 6: '파트너에게 이 Facebook 페이지 공유하기' 완료 팝업 전체(x34.1/y16.5/w31.9/h49.4, 라벨 '파트너 할당 완료') 신규. STEP 7: 단일 와이드 rect → '부분적인 액세스 권한을 보유한 파트너' 섹션(x45.9/y53.8/w52.3/h9.4, labelPos:left) + '파트너' 탭(x49.2/y34.4/w3.8/h4.5) 2중 스포트라이트. 말풍선 기준은 첫 rect라 섹션을 첫 번째로 배치(카드가 섹션을 가리지 않도록).
  - headless Edge로 4개 스텝 스크린샷 검증 완료.
- **2026-07-22** — 'X 광고계정 연동 가이드_KR' STEP 3·4·8·9 스포트라이트 정비 + 엔진 개선.
  - STEP 1: 말풍선을 이미지 정중앙에 표시 — app.js `atvCardStyle`/`renderArtTutStep`에 `card:'center'` 힌트 신설(스포트라이트 rects 없이도 spotted 카드 배치), step[0].spots = `{card:'center', rects:[]}`. 중앙 카드는 `.atv-card.centered`로 진입 애니메이션을 페이드 전용(atvCardFade)으로 교체 — 기본 atvCardIn의 translateY transform이 센터링 transform을 덮어써 아래에서 중앙으로 튀던 문제 수정.
  - STEP 5: 검색란(@nas_tw) 스포트라이트에 더해 드롭다운 검색 결과의 'KT 나스미디어 @nas_tw' 행(x38.2/y72.8/w24.6/h5.9, labelPos:left) 추가 — 2중 홀펀치. 말풍선이 목록을 가리지 않도록 card:right 로 변경.
  - STEP 3: 좌측 하단 '계정 설정' 행(청구 아래, x0.6/y87.5/w4.6/h3.1, card:above) 신규. STEP 4: '사용자 추가' 검은 버튼 전체(x93.4/y0.4/w6.6/h4.6)로 확장. STEP 8: 모달 '취소' 우측 '기여자 추가' 버튼(x57.1/y61.8/w5.8/h4.7)으로 이동. STEP 9: 기여자~권한 수준 테이블 전체(x12.6/y12.9/w87.6/h13, 라벨 'KT 나스미디어 연동 확인') 신규. 좌표는 모두 System.Drawing 픽셀 스캔 산출, `auto:false` 수동 고정.
  - 엔진(app.js `tutExpandSpotRect`)에 A-0 단계 신설: 솔리드 다크 버튼(검은 채움 박스) 감지 — 단어 좌우가 어두운 채움이면 어두운 영역 전체로 확장(양쪽 모두 밝은 경계를 찾은 경우에만 확정, 다크 테마 패널 오검출 방지). 기존 A-1 테두리 탐지가 채움형 버튼에서 글자 크기 박스만 잡던 문제 해결. (Node 생성기 gen-spots.js는 저장소에 없어 app.js만 반영)
  - headless Edge로 4개 스텝 전부 스크린샷 검증 완료.
- **2026-07-22** — 'X 광고계정 연동 가이드_KR' 튜토리얼 수정.
  - STEP 2에 스포트라이트 추가: 좌측 상단 계정 칩(Nasmedia 나… / 18ce55qlvq5) — data/articles.json step[1].spots에 수동 좌표(`auto:false`, x0.3/y0.6/w9.5/h5.5, 라벨 '계정명 또는 ID', card:below). 좌표는 System.Drawing 픽셀 스캔(칩 경계 8,8~183,55 / 1900×958)으로 산출.
  - X(트위터) 카테고리 문서 튜토리얼은 파란색(#1d9bf0) 하이라이트: app.js renderArtTutStep에서 `currentCat==='twitter'`면 오버레이에 `atv-x` 클래스 부여, style.css에 `.atv-x` 스포트라이트/라벨/펄스(atvPulseBlue) 파랑 오버라이드. 다른 카테고리는 기존 빨강 유지.
  - headless Edge(로컬 서버, `?tut=2#/article/twitter/4` 딥링크)로 파란 스포트라이트·라벨 위치 검증 완료.

- **2026-07-21** — simulator 단계별 URL 해시 라우팅 추가.
  - `STEP_HASHES = ['campaign','adgroup','ad','review']` — 허브는 `/simulator/#campaign`, 목표 페이지는 `/simulator/<목표>/#adgroup·#ad·#review`.
  - 단계 이동 시 `syncHash()`(renderStage 말미)가 해시 갱신(히스토리 항목 생성 → 뒤로가기로 단계 이동 가능). `hashchange` 리스너로 주소창 직접 변경도 동기화 — 앞 단계 요건 미충족 시 원복.
  - 딥링크 지원: `#review` 직접 진입 시 `canProceedAt`으로 진행 가능한 단계까지 클램프(예: 광고 텍스트 없으면 #ad 까지만). 허브/이전/goto 네비게이션 URL에도 해시 부여.
  - iframe 하니스 검증: 진입 #adgroup / next → #ad·#review / 미충족 차단 / 해시 직접 변경 동기화 / 빈 상태 #review 딥링크 → #ad 클램프 / 허브 #campaign ✓.
- **2026-07-21** — simulator 새로고침 시 초기화 동작 추가.
  - core.js 초기화부에 `resetOnReload`: `performance.getEntriesByType('navigation')[0].type === 'reload'`이면 sessionStorage(`xsim-state`) 삭제. 목표 페이지에서 새로고침하면 `location.replace('../')`로 허브 첫 화면 복귀(이후 초기화·렌더 스킵).
  - 허브 ↔ 목표 페이지 간 일반 이동(navigate)에서는 기존대로 상태 유지.
  - iframe reload 하니스로 검증: 허브 새로고침 리셋 ✓ / 페이지 이동 상태 유지 ✓ / 목표 페이지 새로고침 → 허브 복귀 + 저장 삭제 ✓. (file:// 테스트 시 디렉터리 URL은 index.html 자동 로드가 안 되므로 명시 필요)
- **2026-07-21** — simulator 광고 만들기(step 2) 화면을 X 실제 컴포저 스타일로 전면 개편.
  - 6개 목표 ad.js 를 전부 core.js 의 공용 `adComposer()` 호출로 통일 — **광고 화면 수정은 이제 core.js 의 adComposer()에서만 하면 됨.**
  - 좌측 '광고 세부 정보' 카드: 헤더(✎ + '+ 기존 게시물 사용'), 이름+`4/255` 카운터(`SIM.onAdName`), 계정 행(KT 나스미디어 ✓ @nas_tw, 빨간 kt 아바타), 텍스트영역(placeholder에 가이드 포함: "무슨 일이 있나요? (최대 한글 140자 (공백 없을 경우), 280byte 이내)") + 'Everyone can reply', 제목 placeholder "제목 입력 (공백 포함 70자 이내)", 링크 대상(웹사이트/앱 박스 — 웹사이트 클릭 시 선택 토글: 2px 검정 테두리+회색 배경+체크 배지(`state.linkTarget`), 아래에 '웹사이트 URL*'(https:// 프리픽스, `state.adUrl`)·'제목*'(`state.adTitle`) 입력란 표시. '앱' 클릭 시: 클릭 유도문안(`appCta`)/기본 앱 스토어(`appStore`) 셀렉트 2열 + 플랫폼 iOS·Android 체크(기본 해제, `appIos`/`appAndroid`) — 체크 시 들여쓴 '앱' 셀렉트(하나 선택/내 앱)와 '딥링크 (선택 사항)' 입력(myapp://, `appIosApp·Deep`/`appAndApp·Deep`) 표시), '+ 미디어 추가'(클릭 → "현재는 이미지 소재만 테스트 가능합니다" 팝업 → 이미지 선택 → FileReader dataURL 로 `state.adMedia` 저장, 컴포저 썸네일(× 제거 버튼, 우측에 이미지 규격 가이드: 이미지 크기/비율/파일 크기/File types — `.sim-adx-mediaguide`)과 폰 미리보기 트윗에 표시. adMedia 는 persist 제외라 새로고침 시 삭제, 캠페인 시작 시에도 명시 삭제), 'AI로 제작됨' 체크(`state.adAI`).
  - 우측 아이폰 목업 미리보기(`.sim-phone`, 컬럼 폭 250px — 광고 세부 정보를 넓게): 상태바(9:41/다이내믹 아일랜드/신호 아이콘 SVG), 스켈레톤 피드 2행(위 반행+아래 1행), 중앙 실제 트윗 프리뷰(이미지 업로드 전에는 1:1 빈 플레이스홀더(`.sim-tw-imgph`, 그림 아이콘) 상시 표시, 입력 텍스트 실시간 반영 `#xp-text`, 제목은 이미지 위 좌하단 검정 칩 `#xp-title`, 웹사이트 URL은 이미지 아래 "From 도메인" `#xp-url` — 모두 oninput 실시간 갱신. 링크 대상 '앱'일 땐 이미지가 앱 카드(`.sim-tw-appcard`)로: 하단 바 좌측 앱 이름(선택한 iOS/Android 앱, 미선택 시 '앱 이름') + 우측 검정 필 CTA(클릭 유도문안, appCta/앱 셀렉트는 setSeg 재렌더로 즉시 반영), From 라인은 숨김, Ad 라벨, 액션 아이콘 4종 SVG), 홈바, 하단 캡션. `position:sticky` 고정.
  - `SIM.onAdText` 가 미리보기 텍스트 + 남은 글자 카운터(`#adx-count`) 동시 갱신 (재렌더 없이 포커스 유지). 웹사이트 URL 입력란은 제거(링크 대상 박스는 장식), `state.adUrl` 은 데이터로만 유지.
  - CSS `.sim-adx-*`/`.sim-phone*`/`.sim-skel-*`/`.sim-tw*` 신설. headless Edge DOM 어서션 8건 + 스크린샷 검증 완료.
- **2026-07-21** — simulator 광고 만들기(step 2) 진입 시 안내 팝업 추가.
  - core.js `adNoticeModal()` — [필수 참고] 실제 트윗 생성은 작성 도구를 통해 생성 후 불러오기로 셋팅 + **본문에 #해시태그/URL/체크 표시 이모지는 사용 불가능합니다 (오가닉 포함)** / [중요] **오가닉 트윗을 끌어와서 셋팅시에 트윗 수정 불가능합니다.(랜딩URL 삽입 불가)** (강조 2문장은 #e0245e 빨간 볼드) + 확인 버튼. `.sim-mmp-*` 모달 스타일 재사용.
  - 팝업 마크업은 `.sim-panel`(진입 애니메이션 transform) 밖에 렌더 — transform 조상 아래서는 fixed 가 뷰포트 기준이 아니게 되는 문제 회피.
  - renderStage에서 step 2 && `!state.adNoticeSeen`일 때만 표시 — 확인 시 `SIM.setBool('adNoticeSeen', true)`로 세션(sessionStorage) 내 1회만 노출. 모든 목표 공통.
- **2026-07-20** — simulator '홍보할 앱'에 MMP(모바일 측정 파트너) 안내·모달 추가.
  - core.js `promoAppField()`: 앱 선택 시 안내 박스(`.sim-mmp-note`) 표시 — "이 앱에서 app installs 목표를 사용하려면 ... : 모바일 측정 파트너." (밑줄 링크). 모든 목표 공용.
  - 링크 클릭 → `mmpModal()` 오버레이 모달(`.sim-mmp-*`): 제목 '모바일 측정 파트너 관리', 부제에 "아래 5개 MMP사만 지원합니다." 포함, `MMP_PARTNERS` 5개사(Adjust/AppsFlyer/Branch/Kochava/Singular) 행 — 로고 5종 모두 실제 워드마크를 모사한 인라인 SVG(Adjust: 꼬리 말린 A+DJUST, AppsFlyer: 녹/청 마크+2색 텍스트, Branch: h 위 파란 점 나무, Kochava: 검정 대문자+빨간 별, Singular: 파란 조리개 링+텍스트) + '연결되지 않음' + '연결 →'(각사 X/Twitter 연동 공식 도움말 새 탭 이동 — `MMP_PARTNERS[].url`), 닫기/×/배경 클릭으로 닫힘. 열림 상태(`state.mmpOpen`)는 `SIM.setBool` 재사용, persist 제외.
  - headless Edge DOM 어서션 + 모달 스크린샷 검증 완료.
- **2026-07-20** — simulator 목표별 결제 방법/입찰 전략 개편 (X 실제 대시보드와 일치하도록).
  - core.js에 `state.payMethod`('cpm' 기본)·`state.optGoal`('install' 기본)·`state.convEvent`/`convOpen` 신설. setSeg에서 최대 입찰가 선택 시 결제 방법 자동 고정(traffic→cpc, video→cpv). convOpen은 persist 제외.
  - **참여수**: 결제 방법 '참여수 (CPE)'(core.js OBJECTIVES.pay), 최대 입찰가 단위 '참여당'.
  - **트래픽**: 결제 방법 셀렉트(노출수 CPM 기본 / 링크 클릭수 CPC). 최대 입찰가 선택 시 CPC 단일 옵션 + disabled 고정, 단위 '링크 클릭당'.
  - **동영상**: 결제 방법 셀렉트(CPM 기본 / 동영상 조회수 CPV). 최대 입찰가 선택 시 CPV 고정, 단위 '동영상 조회당'.
  - **앱 설치수**: 최적화 목표 셀렉트(앱 설치수/앱 클릭수) — 결제 방법이 목표 따라 readonly 고정(설치수→노출수 CPM, 클릭수→앱 클릭수). 최대 입찰가 옵션 제거(자동 입찰만), 렌더 시 bid='max' 방어 복귀.
  - **판매**: 최적화 목표 'Website Conversions' 고정, 결제 방법 셀렉트(CPM/CPC), 입찰 전략 UI 제거(자동 입찰만). '전환 이벤트' 커스텀 드롭다운 신설 — core.js `CONV_EVENTS`(10종, 이름+부제+Inactive 상태) + `convEventField()` 헬퍼 + `SIM.toggleConvMenu`/`setConvEvent`, 라벨 우측 '이벤트 관리 ⧉' 링크, simulator.css `.sim-conv-*` 스타일. 실제 X 캡처와 동일 레이아웃.
  - 각 목표 headless Edge(DOM 어서션 + 스크린샷)로 검증 완료.

- **2026-07-20** — simulator 상단바에 도움말 센터 카테고리 바로가기 추가.
  - 7개 index.html(허브+6목표)의 sim-nav에 `.sim-nav-cats`(📘 Facebook / 📸 Instagram / 🐦 X (Twitter) / 🔍 Google Ads → `/#/category/*`) 삽입.
  - 레이아웃: 브랜드(`.sim-nav-brand`)는 `position:absolute;left:50%` 로 화면 정중앙 고정, 카테고리는 우측(SIMULATOR 태그 왼쪽), back 링크는 `margin-right:auto`로 좌측. 1400px 이하에서는 중앙 브랜드와 겹치므로 카테고리 숨김.
- **2026-07-20** — simulator 고급 타겟팅 '자세히 알아보기'를 실제 링크로 변경.
  - 6개 목표 adgroup.js 모두 span → `<a href="https://business.x.com/en/help/campaign-setup/campaign-targeting/optimized-targeting" target="_blank" rel="noopener">` (X 공식 Optimized Targeting 도움말, GA 추적 파라미터는 제거).
- **2026-07-20** — simulator 광고그룹에 '홍보할 앱' 필드 추가.
  - core.js에 공용 `promoAppField()` 헬퍼 + `state.promoApp` + `PROMO_APPS` 신설 — 라벨 우측 '앱 관리 ⧉' 링크(.sim-label-row/.sim-applink), '앱 선택...' 셀렉트(미선택 시 회색), 검토 요약에도 표시.
  - reach/engagement/traffic/video/sales: 고급 타겟팅의 'Retarget people...' 체크박스 아래 배치(`promoAppField(true)` — .sim-gap-top).
  - app(앱 설치수): 광고그룹 최상단에 전용 섹션 카드(`sectionCard('promoApp','📱','홍보할 앱',...)`)로 배치.
  - 기본값은 '앱 선택...'. 앱 선택 시 `SIM.setPromoApp`이 운영 체제를 자동 설정 — App Store → 특정 기기 선택 + iOS만, Google Play → 특정 기기 선택 + Android만 (Web 해제).
  - headless Edge로 reach(고급 타겟팅 하단)·app(최상단 섹션)·스토어별 OS 자동 선택 검증 완료.
- **2026-07-20** — simulator 검색창 돋보기 아이콘/텍스트 겹침 수정.
  - 원인: `.sim-search{padding-left:38px}`(simulator.css 상단)가 뒤에 선언된 `.sim-input{padding:12px 14px}` 축약형에 밀려 무효화 → 입력 텍스트가 아이콘 위로 겹침.
  - `.sim-input.sim-search`, `.sim-input.sim-search-mode`로 특이도를 올려 해결(위치 포함/제외 셀렉트용 padding-right:82px도 같은 문제였음). headless Edge로 reach 광고그룹 페이지(위치/언어/Device model/Carrier/오디언스) 검증 완료.
- **2026-07-20** — x-tutorial STEP 11·12·13 추가: Funding instruments / Campaigns / 기간 설정 (총 14스텝).
  - STEP 12: Campaigns 탭(`openTab:'campaigns'`)으로 전환해 캠페인 테이블 스포트라이트 — "생성된 캠페인, 광고그룹, 광고를 확인 할 수 있고, 운영했던 데이터를 한눈에 볼 수 있습니다."
  - STEP 13: '최근 7일' 버튼 + 기간 설정 캘린더 드롭다운(`#date-menu`) 스포트라이트(openEl/extras 방식). 드롭다운은 실제 X 대시보드 캡처와 동일 — Current/Archived 세그먼트, 프리셋 10개(오늘~전체 기간), 6월/7월 2026 이중 캘린더(6/1 선택, 7/20 오늘, 미래 날짜 muted), KST 푸터 + UTC 토글. `toggleDateMenu()`로 실제 클릭 토글도 가능.
  - index.html 테이블 카드에 `#panel-funding`(결제 수단 테이블: 요약 + IO 2건 + 카드 1건, Halted 핑크 필, 잔여 예산 0% 게이지 바, 우측 정렬 금액 컬럼) 추가 — 실제 대시보드 캡처와 동일한 데이터/레이아웃. 기존 캠페인 테이블은 `#panel-campaigns`로 래핑.
  - 탭 클릭으로 funding ↔ campaigns 패널 실제 전환(`showTablePanel`/`selectTableTab`, ttab에 `data-panel` 부여).
  - 튜토리얼 엔진에 `openTab` 스텝 옵션 신설 — 스텝 진입 시 해당 테이블 탭으로 전환, 스텝 이탈/종료 시 Campaigns로 복귀. STEP 11은 `#tut-table-card` 전체를 스포트라이트.
  - headless Edge로 STEP 11(펀딩 테이블 표시) / STEP 12(캠페인 탭 복귀) 검증 완료.
- **2026-07-14** — x-tutorial 스텝 개편: 사이드바 메뉴 중심 흐름으로 재구성 (총 11스텝).
  - STEP 4~9를 기간설정/핵심지표/성과그래프/오디언스 인사이트/계층구조/캠페인목록 → 작성 도구·게시물·일괄 편집기·오디언스·앱 관리자·이벤트 관리자(사이드바 메뉴, 각각 신규 id + place:'right')로 교체.
  - STEP 10 신설: 상단 '필터' 버튼 + 드롭다운(Status/Objective/전달됨/삭제된 항목 표시/테이크오버, index.html `#filter-menu`) — 튜토리얼 엔진에 `openEl`(스텝 진입 시 요소 열기)·`extras`(스포트라이트 영역 union) 옵션 추가. `toggleFilterMenu()`로 실제 클릭 토글도 가능.
  - STEP 4 설명의 핵심 문장은 빨간 볼드(#e0245e) 강조 — step.text에 HTML 허용됨.
- **2026-07-14** — x-tutorial(X 광고 대시보드 튜토리얼) 수정.
  - STEP1 문구에서 "게임 튜토리얼처럼" 제거. STEP3 타겟을 상단 캠페인 생성 버튼 → 사이드바 '캠페인 양식'(`#tut-campaign-form` 신규 id)으로 변경, 문구 수정, 말풍선 우측 배치(`place:'right'` 스텝 옵션 신설 — placeCard가 지원).
  - 스포트라이트 밝게: `.tut-spot`에 흰색 틴트 배경(.16) + 파란 링 불투명 + 흰 글로우, 주변 딤 .6→.55.
  - `?step=N` 쿼리로 특정 스텝 딥링크 지원 (TUT.start 인덱스).
- **2026-07-14** — 튜토리얼을 전체 문서로 확대 적용.
  - `TUTORIAL_ARTICLES` 목록 제거 — `isTutorialArticle()`이 "비어있지 않은 steps가 있는 문서"면 true. 새 문서도 steps만 작성하면 자동으로 튜토리얼 모드.
  - steps 없는 문서(예정/준비 중)는 기존 방식 그대로 렌더링.
  - spots 없는 문서(구형 이미지)는 스포트라이트 없이 이미지+카드로 표시 — 이미지 교체 후 관리자 "자동 생성" 버튼으로 스포트라이트 생성 예정.
  - 검증: 이미지 스텝 문서(Meta 페이지 KR), 텍스트-온리 스텝 문서(Google 키워드), 0-스텝 문서(예정 문서) 3종 확인.
- **2026-07-14** — 버튼 테두리 오검출 수정 + 펄스 테두리 얇게.
  - borderBox: 상/하 테두리 확정 후 요소 전체 높이 기준으로 좌/우 테두리 재탐색(임계 0.8) — 버튼 안 아이콘 글리프 열을 테두리로 오인하던 문제 해결 (KR/EN step1 박스 우측 밀림 원인).
  - `.atv-spot` 테두리 2.5px→1.5px, 펄스 그림자 두께 축소.
  - gen-spots.js와 app.js 양쪽 반영, EN/KR 재생성·검증 완료.
- **2026-07-14** — 스포트라이트를 단어 → UI 요소 전체로 확장하는 로직 추가 (`tutExpandSpotRect`).
  - OCR로 찾은 단어 박스를 픽셀 분석으로 확장: A-1 근접 테두리(버튼) → B 라벨 아래 입력란 → A-2 원거리 테두리(카드) → C 행 블록(아래 이어지는 설명 행을 실제 여백 기준으로 붙이고, 좌우는 콘텐츠 극값·모달 내부 폭으로. 안 붙으면 섹션 헤더로 보고 3%H 내 다음 블록 브리지).
  - 세로로 쌓인 행들(콘텐츠/광고/인사이트)은 좌우 폭 자동 통일. 행 경계는 빈 픽셀 줄 0.9%H 기준(OCR bbox보다 정확).
  - Node 생성기(scratchpad/gen-spots.js)와 app.js 클라이언트 동일 로직 유지 — 수정 시 양쪽 다 반영할 것.
  - EN/KR 10개 스텝 재생성·스크린샷 검증 완료: 버튼 박스 전체, 라벨+입력란, 권한 행 전체(토글+설명), 팝업 전체, 섹션 전체(관리 버튼 포함).
- **2026-07-14** — 스포트라이트 OCR 자동 생성 시스템 도입 (이미지 크기·문서 무관).
  - 스텝 설명의 '따옴표 단어'를 Tesseract.js OCR로 이미지에서 찾아 `step.spots`({auto, card, rects})로 문서 데이터에 저장. 렌더러는 `TUTORIAL_SPOTS`(수동 오버라이드, 현재 비어 있음) → `step.spots` 순으로 사용.
  - 관리자 UI: 튜토리얼 문서의 관리자 노트에 "✨ 스포트라이트 자동 생성" 버튼(`autoGenerateSpots`) — 브라우저에서 OCR 후 PUT 저장. 이미지를 교체하면 이 버튼만 누르면 됨.
  - 매칭 알고리즘: 2배 업스케일 + best 언어데이터(kor+eng) + 2-패스(전체 + 우하단 크롭) OCR → 라인을 가로 간격으로 세그먼트 분할(나란한 버튼 개별 인식) → 세그먼트 전체 일치 > 짧은 라인 > 긴 라인, 위쪽 우선 스코어 → 매칭 실패 시 팝업(딤 배경 흰 모달) 자동 검출 폴백. 다른 term에 포함되는 짧은 term 제외.
  - EN/KR 파트너 할당 가이드 10개 스텝 전부 Node에서 같은 알고리즘으로 생성·검증 완료(data/articles.json에 저장, .bak 백업 있음).
  - 주의: OCR 언어데이터는 CDN(tessdata.projectnaptha.com)에서 로드 — 사내망 인증서 문제 시 브라우저는 OK, Node는 curl -k로 수동 다운로드 필요.
- **2026-07-14** — 'Instagram 파트너 할당 가이드_KR'에도 튜토리얼 적용.
  - `TUTORIAL_ARTICLES`에 KR 제목 추가, `TUTORIAL_SPOTS`에 KR 좌표 추가 (ins_par_kr_01~05, 835x420 기준).
  - KR 이미지는 빨간 박스가 그려진 구형 캡처 — jpeg-js로 빨간 박스 라인을 검출해 좌표 산출(완화 임계값 r>140, r-g>60, r-b>60).
  - EN과 동일하게 스텝3의 콘텐츠/광고/인사이트는 개별 박스 + 왼쪽 라벨로 분리.
  - headless Edge로 KR 5개 스텝 전부 검증 완료.
- **2026-07-14** — 튜토리얼 스포트라이트 정밀화 (새 스크린샷 ins_en01~05, 1905x958 기준).
  - 사용자가 스텝 이미지를 빨간 박스 없는 깨끗한 고해상도 캡처로 교체함 → 튜토리얼이 직접 대상 UI를 표시하도록 변경.
  - 각 rect에 `label`(따옴표 단어 이름표) 추가 — 스포트라이트 위(기본) 또는 왼쪽(`labelPos:'left'`, 세로로 붙은 박스용)에 칩으로 표시.
  - SVG 홀펀치 마스크로 스포트라이트 외 이미지 영역을 어둡게 처리 (다중 홀 지원).
  - 말풍선 텍스트의 작은따옴표 단어를 자동 강조(`.atv-kw`, tutText에서 치환).
  - 좌표는 jpeg-js 픽셀 분석(파란 토글/버튼, 텍스트 행 밴드, 흰 팝업 경계 검출)으로 산출 — 눈대중 아님. 이미지 교체 시 재산출 필요.
  - headless Edge로 5개 스텝 전부 검증 완료.
- **2026-07-14** — 문서 튜토리얼을 x-tutorial 방식 전체 화면 오버레이로 개편.
  - 인라인 스텝 플레이어 → 전체 화면 오버레이(`#art-tut-overlay`, body에 동적 생성). 스크린샷을 크게(최대 1240px) 표시.
  - `TUTORIAL_SPOTS`(app.js): 문서 제목 → 스텝별 스포트라이트 % 좌표(rects) + 말풍선 위치 힌트(card: below/above/right/left). 이미지 속 빨간 표시 영역 위에 펄스 스포트라이트를 얹고 말풍선 카드를 근처에 배치.
  - 문서 페이지에는 시작 배너만 남기고, 문서 첫 진입 시 자동 시작(`tutSeenId`로 재렌더 중복 방지). Esc/←/→ 키보드 지원, `?tut=N` 쿼리로 특정 스텝 딥링크.
  - 좌표는 이미지 % 기준이라 화면 크기와 무관하게 정렬됨. 새 문서에 스포트라이트를 넣으려면 `TUTORIAL_ARTICLES`에 제목 추가 후 `TUTORIAL_SPOTS`에 좌표 입력(없으면 카드가 이미지 아래 중앙에 표시).
  - headless Edge 스크린샷으로 5개 스텝 전부 스포트라이트 정렬 검증 완료.
- **2026-07-14** — 문서 튜토리얼 기능 추가 (테스트: 'Instagram 파트너 할당 가이드_EN').
  - app.js에 `TUTORIAL_ARTICLES` 목록 추가 — 제목이 포함된 문서는 튜토리얼 모드로 렌더링.
  - 튜토리얼 모드: Video Guide(excerpt/excerptMedia)를 화면에서 제거하고, `steps` 데이터로부터 스텝 플레이어(진행바·이전/다음·점 내비게이션·완료 화면·←→ 키보드)를 자동 생성 (`renderArticleTutorial`).
  - 단계별 가이드 원본은 관리자에게만 노출(`.steps-admin-wrap`). 일반 사용자는 튜토리얼만 볼 수 있음.
  - steps 수정 시 튜토리얼은 렌더링 시점에 자동 반영됨. 다른 문서로 확대하려면 `TUTORIAL_ARTICLES`에 제목 추가.
  - 데이터(excerpt의 "[Video Guide]" 텍스트와 업로드된 mp4)는 삭제하지 않고 표시만 숨김.
- **2026-07-14** — CLAUDE.md 최초 작성.
