# v7 정밀도 QA — 추적 실루엣 · 액션 연출 · 아우라 · 카메라/앨범 · 위치 추천

> 기준: [GAMEPLAY_V7.md](../GAMEPLAY_V7.md) §1–§7, [DESIGN.md](../../DESIGN.md) §2·4.10·6·9·10. 실행일 2026-09-23. 작성: qa-precision (v7).
> 원칙: 시뮬레이션 진실(감지·쿨다운·공명·등급·보상·저장 키)은 관측만 하고 바꾸지 않았다. `src/` 는 한 줄도 수정하지 않았다.

## 0. 요약

| 항목 | 결과 |
|---|---|
| 스크린샷 | 20장 (`docs/screens/v7-01…31`) 모두 확보 |
| 콘솔 오류 | **0** (전체 16건 = vite debug 2 · tfjs WebGL 경고 4 · Canvas2D 성능 힌트 1(QA 의 getImageData) · `[geo]` info 9(의도한 실패 주입)) |
| 검사 행 | 38행 중 **합격 31 · 불합격 4(모두 상대 세션 소유 scan.js 미배선) · 관찰/문서 불일치 3** |
| 새 결함 | v7 소유 파일 5건(중 2건 medium), 상대 세션 소유 파일 6건 |

## 1. 환경과 방법

- **브라우저**: `chrome-devtools` MCP 의 Chrome 프로필(`~/.cache/chrome-devtools-mcp/chrome-profile`)을 상대 세션이 잡고 있어(`Google Chrome … --user-data-dir=…chrome-profile` 프로세스 실재) 그 인스턴스를 빼앗지 않고, **Google Chrome 153 headless(new) + 자체 CDP 브리지**(Node 26 내장 WebSocket, 별도 프로필, 의존성 0)로 동일 프로토콜(`Runtime.evaluate` / `Page.captureScreenshot` / `Emulation.*` / `Runtime.consoleAPICalled` + `exceptionThrown` + `Log.entryAdded`)을 썼다. 뷰포트 390×844 DPR 1 mobile+touch, 08 만 1024×800 desktop.
- **URL**: `http://127.0.0.1:5179/?debug` (vite 7.3.6, `--strictPort --host 127.0.0.1`). `window.__ws = { state, go, WONDERS, RARITY }` 확인.
- **카메라**: `getUserMedia` 를 `NotAllowedError` 로 거부 → 사진 폴백(`카메라를 쓸 수 없어요 … 사진 선택`) 경로. `tutorialSeen=true` 로 튜토리얼 게이트 통과. tfjs 는 WebGL 없이 CPU 백엔드 경고만 남기고 동작(오류 아님).
- **scan.js 배선 상태(중요)**: 상대 세션의 `scan.js` 는 아직 v7 계약을 쓰지 않는다 — `window.__scan` 키 = `S capture spirits ring injectGaze eye calibrate injectDetection setGauge eyeStats eyeCfg lastDet frameStats` (v7 훅 `trail aura staging stage trackLog shutter record frames` **없음**), `drawTarget` 에 `sil/aura/shade/mode` 를 넘기지 않고, `finish()` 의 `addMoment` 에 `box/alts` 없음, DOM 에 `.cam-bar .cam-thumb .cam-tools .bubble.compact .overlay-wrap .track-log` 없음. 따라서 §1·§2·§4 의 "보이는 층"은 **통합 대신 계약 그대로 재현**해 검증했다: `S.alive=false` 로 scan 루프를 멈추고, 같은 오버레이 캔버스에 `overlay.drawTarget(x, { …, sil, mode, aura, shade }, tf)` + `staging.*` + `auras.*` 를 스캔 루프와 동일한 순서로 호출하는 QA 루프를 얹었다(`window.__qa`). 소스는 720×1280 정지 이미지(잉크 배경 + 머그 실루엣)를 `S.source` 로 지정(사진 폴백과 같은 기하), bbox 는 소스 픽셀 `[200,420,320,400]`. 이 방식은 **overlay.js / staging.js / auras.js / eye.js(drawEyeReticle 읽기 전용)** 의 동작 증거이며, scan.js 가 배선되면 그대로 동일한 호출이 된다.
- **증거 수집**: `CanvasRenderingContext2D.fillText` 스파이(태그 문자열), `getImageData` 픽셀 샘플(색·알파), 프로즌 타임(`Q.now`)으로 결정적 프레임 캡처, IndexedDB 는 `import('/src/game/media.js')` 로 직접 조회.

## 2. 결과 표

판정: ✅ 합격 · ❌ 불합격 · ⚠️ 관찰(스펙/문서 불일치 또는 결함, 시뮬레이션 불변) · ⏭ 생략(훅 없음). "인과 변수"는 고칠 때 건드릴 단 하나의 변수/파일.

### 2.1 추적 실루엣 (§1)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| 각인 윤곽 50% | `gauge=.5, mode=scan`, 프로즌 타임 | 상·우변 = 무쇠 잉크 `rgb(159,168,180)`(cup ★ Iron `#9FA8B4`) α255, 하·좌변 미그림(트레일 α≤123 만), 코너 틱 TR·BR 켜짐 / BL·TL 꺼짐 → 25·50% 틱 규칙 일치 | ✅ | — |
| 각인 윤곽 100% 번쩍 | `gauge=1` 첫 프레임을 프로즌 | 4변+4틱 모두 황동 `rgb(226,180,90)` α255(3px) — `snapFlashMs 120` 안 | ✅ | — |
| 100% 이후 실선 | 프로즌 해제 +400ms | 4변+4틱 무쇠 잉크 실선 α255 | ✅ | — |
| 진행 태그 | fillText 스파이 | `cup · conf 87% · 공명 50%` → `… 공명 100%`; 포획 모드에서 `탭!`; 3px 진행 바(스크린샷) | ✅ | — |
| 잔상 궤적 | 박스를 45ms 마다 10px 씩 12회 이동 | 링 버퍼 7개(80ms 간격), 3번째 최신 항목 좌변에서 Bone α46(기대 ≈55, 1px 선 샘플링 오차) | ✅ | — |
| 모션 줄이기 × 궤적 | 같은 이동, `reduceMotion=true` + `prefers-reduced-motion` | 같은 지점 α0 (궤적 OFF), 각인·태그 유지 | ✅ | — |
| 상실 잔영 타이밍 | `sil.setLoss(box,T)`, T+10/450/1490/1510 프레임 | drawLoss = true/true/true/**false**; 태그 `놓침 · 다시 비춰 봐` 1490 까지, 1510 에 사라짐; α 42→30(=×0.7, `.6→0` 선형) | ✅ (±20ms) | — |
| normalizeBox | bbox `[200,420,320,400]`, 소스 720×1280, crop=bbox | `[0.2647, 0.2059, 0.4706, 0.5882]` (snapshot 크롭 규칙 680px 정사각 재현과 일치) | ✅ | — |

### 2.2 액션 연출 (§2)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| PERFECT 펀치 | `punch(.overlay-wrap,{grade:PERFECT,cx,cy})`, WAAPI 70ms 에서 일시정지 | `transform: matrix(1.06,…)`, `transform-origin: 195px 408.8px`(bbox 중심), 프리즈 프레임 성공, 스피드라인 16, `퍼펙트!` 버스트, 스포트라이트 .4 | ✅ | — |
| 펀치 복귀 | `await punch(...)` | 338ms 후 resolve(true), `transform:none`, origin 초기화, 애니 0개; `reduceMotion` → false 즉시, `AUTO`(1.0) → false | ✅ | — |
| `.overlay-wrap` 래핑 기하 | video/still/canvas 를 런타임 래핑 | 오버레이 rect 불변(wrapGeomOk) — staging.css `.overlay-wrap{position:absolute;inset:0}` 이 기존 절대배치와 호환 | ✅ | — |
| MISS 달아남 | `drawMissFlee(box, 화면중심, t=.5)` + `도망쳤다!` | 화면 중심 반대 방향(0,−1)으로 52.5px(=60·easeOut(.5)), 이동 위치 상변 Ember `rgb(211,113,106)` α115, 스트릭 3장 | ✅ | — |
| MISS 비네트 색 | `#vig.on` | styles.css `.vignette` 는 황동 `rgba(226,180,90,.28)` 고정 — 스펙의 Ember 120ms 비네트 아님 | ⚠️ | `src/styles.css .vignette`(상대 세션) — MISS 전용 `--vig-color` |
| 정령 팝 / 락온 / 펄스 | 함수 호출(스크린샷 미요구) | 예외 없음, 프레임당 할당 0 경로 | ✅ | — |

### 2.3 아이 게이지·핵심 정밀도 (§3.2 — 훅이 있는 행만)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| 타이밍 링 등급 | `capture.start(t0); tap(t0+(1−r)·1500)` r=.30/.36/.46/.60/.90 ×3 | PERFECT / GREAT / GOOD / MISS / MISS — 3회 동일, 단조 | ✅(단조·안정) | — |
| 경계 ±0.01 | r = .30±(.045∓.01), ±(.10∓.01), ±(.17∓.01) | 안쪽 PERFECT/GREAT/GOOD, 바깥 GREAT/GOOD/MISS — 양쪽 대칭, 뒤집힘 없음 | ✅ | — |
| 스펙 표 vs BALANCE | (문서) | §3.2 표의 기대값 `PERFECT/PERFECT/GOOD/GOOD/MISS` 는 `BALANCE.capture{perfect .045, great .10, good .17}` 과 맞지 않음(.36→GREAT, .60→MISS). 시뮬레이션은 동결이므로 **문서 오기** | ⚠️ | `docs/GAMEPLAY_V7.md §3.2 1행` |
| 터치 지연 보정 | (코드 리뷰) | `overlay.onpointerdown` 이 `performance.now()` 를 쓰고 `event.timeStamp` 는 무시 — 40ms 지연이 그대로 등급에 반영됨 | ⚠️ | `scan.js` pointerdown(상대 세션) — `now = e.timeStamp || performance.now()` |
| 시선 정밀도(노드) | `node tests/eye-precision.mjs` | 14/14 ALL PASS: 정지 홀드 917ms PERFECT, 지터 7/9/17/19px → PERFECT/GREAT/GREAT/GOOD, 깜빡임 2회 중 발동 1, 정령 59px 발동·61px 미발동, 상실→0 850ms(유예 300+감쇠), 300px 점프 90% 도달 33ms | ✅ | — |
| 잠금 히스테리시스 / 상실·복귀 / 스크래치 / 정령 탭 / 시선 홀드·보정·경합 | 헤드리스 | v8.1 QA 에서 확인된 항목, 이번 라운드 훅·소유권 범위 밖 | ⏭ | — |

### 2.4 VFX (§4)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| 추적 명암 | `shade=true, gauge=.6`, 400ms 후 | 박스 밖 (30,760) 잉크 α**48** = 기대 `(0.10+0.6·0.15)·255=48`, 중심 Bone 빛 α53; 120ms 시점 α30(페이드인 160ms 진행 중) | ✅ | — |
| 아우라 풀 상한 | `createAura('ember'|'orbit')`, gauge .85 → 1 | tracking 41 / charged **48** = `POOL_MAX`, 초과 없음 | ✅ | — |
| 상실 후 400ms 안 0 | (a) `setPhase('cancel')` 후 draw 중단 (b) draw 만 중단 | 둘 다 365ms=48 → **456ms=0** (`cancelMs`/`staleMs` 400) | ✅ | — |
| 모션 줄이기 아우라 | `rm=true` | count 0, 정적 황동 타원 링 1px | ✅ | — |
| 아이 임팩트 | `drawEyeImpact(pt,t=.42,'#E2B45A')` + `drawEyeReticle(fill 1)` + `.eye-hud.impact` + `.eye-flash.on` | 링 1 반지름 90·easeOut 위치 황동 α156, 스파크, 눈 조준점, HUD impact 클래스, 화면 가장자리 황동 inset 3px 플래시 | ✅ | — |
| `.eye-hud` 가림 | `elementFromPoint(HUD 중심)` | HUD rect (12,650,207,44) 가 루페 말풍선 SPAN 에 **가려짐** — 모든 스캔 스크린샷에서 배지 미표시 | ⚠️ | `scan.js` 레이아웃(상대 세션) — v7 §6.2 대로 `.cam-tools` 안으로 |

### 2.5 카메라 · 미디어 · 앨범 (§6)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| 셔터 탭(사진 폴백, 원더 없음) | `#shutter` pointerdown/up | 앨범 +0, 루페 `원더를 비춘 채로 스냅하자.` — §6.11 `kind:'photo', label:null 허용` 미구현 | ❌ | `scan.js doSnap`(상대 세션) — 라벨 없어도 `addMoment({kind:'photo'})` |
| 셔터 탭(감지 주입) | `injectDetection(cup .8)` 후 탭 | 앨범 +1, 그러나 `kind:'wonder', box:null, alts:0` (스펙 `photo` + box/alts) | ❌ | 같은 곳 |
| 미디어 데이터 모델 | `addMoment` kind photo/video/wonder(+box,alts) + 옛 스키마 레코드 `legacy-1`(kind/box/alts 없음) | 저장 OK; `listMoments({kind})` photo 1 · video 1 · perfect 1; legacy → `normalizeMoment` 로 `kind:'wonder', box:null, alts:[], edited:false` | ✅ | — |
| 영상 클립 | 캔버스 `captureStream` + MediaRecorder(webm 5225B) | `kind:'video', duration 4200, poster 있음`; 격자 `film` 배지 `00:04`; 상세 `<video controls playsinline poster>` | ✅ | — |
| 발견 화면 각인 | `go('reveal', {…discover(), photo, box:[.2,.2,.6,.6], alts×2, momentId})` | `.card .photo-wrap svg.etch` rect = 사진 rect `[50,27,290,290]` 정확 일치, `<rect x20 y20 w60 h60>`, svg 안 글자 0, 히어로 없음(★1), 스크래치는 이름 영역 | ✅ | — |
| 다른 컷 고르기 | `.burst-strip` 2번째 탭 | 카드 사진 교체, `img.on` 0→1, DB `photo` 8565B→2163B / `alts` [2163,2203]→[8565,2203](swapAlt 재배열), 각인 유지, 토스트 `컷을 바꿨어요` | ✅ | — |
| 앨범 상세 각인 | `go('album','all',id,{recall:false})` | `.etch` 있음. 단 svg rect `[50,127,290,**297**]` vs 사진 `[…,290]` — `.photo-wrap` 이 인라인 img 기준선 여백 7px 만큼 큼 → 윤곽 2.4% 세로 늘어남 | ⚠️ | `album.js detail render` 의 `.photo` 에 `display:block` (reveal.js 는 이미 그렇게 함) |
| 옛 추억 상세 | `legacy-1` 열기 | `.etch` 없음(box 없음), 헤드 `희귀 AUTO`, 오류 없음 | ✅ | — |
| 격자 혼합 | `go('album')` | 7장: 영상=film 배지, 스냅=camera 아이콘, 원더=글리프, legacy 타일 표시; 칩 `전체·사진·영상·원더·퍼펙트·즐겨찾기·친구`; UI 크롬 이모지 0 | ✅ | — |
| 상세 스와이프 | 캡션 위 pointerdown → move −12 → −80 → up | `--dx:-80px`, `dragging`, 4/7 → **5/7**(스냅) 이동; 세로 우세 드래그(dy 90)는 양보(위치 불변) | ✅ | — |
| 더블탭 즐겨찾기 | `#pz img` click ×2 (80ms) | 토스트 `즐겨찾기`, DB `fav:true` 1건 | ✅ | — |
| 꺼내기 | `#dExport` (navigator.share 제거) | `a[download="wonder-clock-20260920.jpg"]` 클릭 관측(blob:), 토스트 `기기에 저장했어요`; share 가 있는 환경에선 share 경로로 감 | ✅ | — |
| 선택 모드 | 타일 pointerdown 300ms→미진입, 550ms→진입(LONG_PRESS 450) | `.select-mode` + `.select-bar`(top 747) `1장 선택` → 두 번째 탭 `2장 선택`, 버튼 `꺼내기·삭제·취소` | ✅ | — |
| 삭제 → 실행 취소 | `#sDel` → `.toast.undo` 버튼 | 낙관적 5장/DB 5 → 되돌리기 7장/DB 7(`undeleteMoment` 원복), 토스트 `되돌렸어요` | ✅ | — |
| 선택 바 글자 줄바꿈 | 390px | `.select-bar .btn` 3개가 각 ~94px → `꺼/내/기` 글자 단위 세로 줄바꿈(스크린샷 23) | ⚠️ | `src/ui/v7.css .select-bar .btn` — `white-space:nowrap; padding:0 8px; font-size:13px` |

### 2.6 위치 기반 추천 (§7)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| 옵트인·아이들 | `go('spots')` | `주변 촬영지 찾기` 버튼, 위치 요청 없음, 프라이버시 줄 `좌표(100m 단위)만…` | ✅ | — |
| 제공자 폴백 순서 | 코드 | `google → nominatim → overpass → []` (문서 §7.2 는 overpass 만 언급; provider.js 주석에 2026-09-23 실측 근거) | ⚠️(문서) | `docs/GAMEPLAY_V7.md §7.2` |
| 키 없음 + OSM 모킹 | `fetch` 모킹(Nominatim jsonv2 16행, 이름 없는 1행 포함) + `getCurrentPosition` 모킹(37.5665,126.978) | 요청 1회(`enough 14` 로 조기 종료), 카드 **5** (cafe·restaurant·park·library·shop 규칙 다양성), mono `104m · 북서 · 부엌의 연금술`(IBM Plex Mono), 원더 글리프 3개/카드, 기믹 배지 5(카드당 1), 챕터 엠블럼 svg, `mapsUrl=https://www.google.com/maps/search/?api=1&query=lat,lng` | ✅ | — |
| 저장 최소화 | `localStorage['wonder-scanner:v1'].geo` | `lat 37.567, lng 126.978`(소수 3자리), spots 15(≤20, 최소 필드), gimmick 유지 | ✅ | — |
| 위치 거부 | `getCurrentPosition → err({code:1})` | status `denied`, `위치 없이도 게임은 그대로` 카드 + 다시 시도 + 카메라 열기 | ✅ | — |
| 두 API 실패 | nominatim·overpass fetch 모두 throw | 7.2s 후 status `empty`(8+1 시도), 폴백 카드 + 재시도, 콘솔 **info 만**(오류 0) | ✅ | — |
| Google 경로(키 모킹) | `googleNearby({key:'TESTKEY', fetchImpl:spy})` | `POST places.googleapis.com/v1/places:searchNearby`, `X-Goog-Api-Key: TESTKEY`, `X-Goog-FieldMask: places.id,places.displayName,places.types,places.location`, `includedTypes 20`, `maxResultCount 20`, `languageCode ko`, `radius 800`; 응답 파싱 `source:'google'` | ✅ | — |
| 기믹 시작 → 배율 | 카페 카드 `카메라 열기` | 토스트 `기믹 「커피 시간」 시작 · 30분`, `state.geo.gimmick{coffee, dustMulChapter 2, kitchen}`; `eventMod('dust',{chapter:'kitchen'})` = **2**(`gimmickMod` 2 × 사건 1), desk = 1, xp = 1; 정령 2 는 오늘의 사건(정령 대이동) 몫 | ✅ | — |
| 만료 | `gimmick.until = now−1` | `activeGimmick()` null, `eventMod(dust,kitchen)` = **1** | ✅ | — |
| 루페 조언 | `advise({screen:'scan'})` | 사건 다음 순위로 `pin` 아이콘 `기믹 「커피 시간」 진행 중 — …` action `spots` | ✅ | — |
| 타이틀 카드 | `go('title')` | `#spotCard.top` `골목 카페 1 104m · 북서 · 부엌의 연금술 / 기믹 「커피 시간」 30분 남음…`, 엠블럼 kitchen, `data-go=spots`, 중복 삽입 0 — 단 로드 시 top **824px**(가시 20px, 접힘 아래) | ⚠️ | `title.js spotCardHtml` 삽입 위치 — `.thumb-row` 위 또는 스트립 바로 아래 |
| 스팟 헤더 줄바꿈 | 390px | `header h2 "주변 촬영지"` 높이 143px = **5줄**(`#src` 필 211px) | ⚠️ | `spots.js` 헤더 — 필에 `· 방금` 대신 title 속성, 또는 `h2{white-space:nowrap;min-width:0}` |
| mapsUrl 좌표 | 카드 `data-map` | `query=37.567499999999995%2C126.97699999999999`(부동소수 노이즈) — 동작엔 지장 없음 | ⚠️(low) | `provider.js decorate` — `round(…,5)` 후 `mapsUrl` |

### 2.7 모바일 게임 원칙 (DESIGN §10)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| 데스크톱 폰 셸 | 1024×800, 타이틀 | `.screen` 480px 가운데 고정 + hairline 좌우 테두리, `#app` 배경 `--ink-0` — 스펙의 **430px** 셸은 아님, `.phone-shell` 없음(styles.css 의 ≥520px 규칙이 있어 v7.css 가 추가하지 않음) | ⚠️(low) | `src/styles.css .screen{max-width}`(상대 세션) |
| 엄지 영역 | 390×844 | 셔터 72px @ y731, 앨범 상세 액션 4개 @ y762–844, 선택 바 @ y747 — 모두 하단 35% 안 | ✅ | — |

## 3. 스크린샷 (`docs/screens/`)

| 파일 | 내용 | 메모 |
|---|---|---|
| v7-01-scan-etch-50.png | 각인 50% + 틱 2 + 태그 `공명 50%` | 배지 `.eye-hud` 가 말풍선에 가려 안 보임(§2.4) |
| v7-02-scan-etch-100.png | 100% 황동 번쩍 프레임(3px) | — |
| v7-03-perfect-punch.png | 프리즈 + 줌 1.06(70ms) + 스피드라인 16 + `퍼펙트!` + 스포트라이트 | `.overlay-wrap` 은 QA 가 런타임 래핑 |
| v7-04-miss-afterimage.png | Ember 스트릭 3 + `도망쳤다!` | 비네트는 황동(⚠️) |
| v7-05-loss-afterimage.png | 점선 잔영 α.42 + `놓침 · 다시 비춰 봐` | T+450ms |
| v7-06-reveal-etch.png | 카드 사진 위 황동 각인 + 버스트 스트립 3 + NEW | — |
| v7-07-album-detail.png | 앨범 상세 각인(ALT A 로 교체된 사진) | 세로 7px 늘어남(⚠️) |
| v7-08-phone-shell.png | 1024×800 타이틀, 480px 셸 | 430px 아님(⚠️ low) |
| v7-09-reduce-motion-scan.png | 궤적 OFF · 정적 아우라 링 · 각인·태그 유지 · 명암 유지 | — |
| v7-10-aura-ember.png | 잔불 41 파티클 + 명암 | — |
| v7-11-aura-orbit.png | 궤도 링 2 + 파티클 41 | — |
| v7-12-eye-impact.png | 눈 조준점 fill 1 + 충격파 링 + 스파크 + `탭!` + 가장자리 플래시 | — |
| v7-13-tracking-shade.png | 바깥 어둠 α48 + 안쪽 빛 | — |
| v7-20-camera.png | 사진 폴백 카메라 화면(구 레이아웃) | `.cam-bar/.cam-tools` 미배선(상대 세션) |
| v7-21-album-mixed.png | 사진·영상·원더·옛 레코드 혼합 격자 | 검은 타일 = 스트림 없는 video 스냅(헤드리스 특성) |
| v7-22-album-detail-actions.png | 영상 상세 + 4 액션 | — |
| v7-23-select-mode.png | 2장 선택 + 선택 바 | 버튼 글자 세로 줄바꿈(⚠️ medium) |
| v7-24-reveal-burst.png | 컷 교체 후(ALT A) + 토스트 | — |
| v7-30-spots.png | 카드 5 + 기믹 배너/배지 | 헤더 5줄 줄바꿈(⚠️ medium) |
| v7-31-title-spot-card.png | 타이틀 스팟 카드(스크롤 후) | 로드 시 접힘 아래(⚠️) |

## 4. 콘솔 오류

**0건.** 전체 16건: `[vite] connecting/connected`(debug 2) · `Could not get context for WebGL`(log 2) · `Initialization of backend webgl failed` + 스택(warning 2, tfjs 헤드리스 특성) · `Canvas2D … willReadFrequently`(QA 의 `getImageData` 유발 1) · `[geo] nominatim failed: … TypeError` ×8 + `[geo] overpass failed` ×1(의도한 실패 주입, `console.info`). `Runtime.exceptionThrown` 0.

## 5. 상대 세션 소유 파일 (scan.js · scanner/** · state.js · balance.js · meta.js · styles.css · icons.js)

수정하지 않았고, 관측만 기록한다. 라우트 예외/크래시는 없었다(`go('scan')` 3회 모두 정상, 폴백 UI 정상).

| # | 파일 | 관측 | 스펙 |
|---|---|---|---|
| P1 | `scan.js` | v7 배선 없음: `drawTarget` 에 `sil/aura/shade/mode` 미전달(평범한 브래킷), `staging.js/auras.js/frames.js/fx.shutter` 미사용, `__scan` 에 `trail aura staging stage trackLog shutter record frames` 없음 | §1.2·§2·§3.1·§4 |
| P2 | `scan.js finish()` | `addMoment({label,grade,variant,frame,photoDataUrl,clip})` — `box`(normalizeBox) · `alts`(프레임 버퍼 베스트) 없음 → 발견/앨범/카드 각인이 실제 포획에서는 안 그려짐 | §1.3·§6.3 |
| P3 | `scan.js doSnap` | 라벨 없으면 저장 안 함; 있으면 `kind:'wonder'` 로 저장(스펙 `photo`, box/alts, `fx.shutter()`, 썸네일 플라이 없음) | §6.3·§6.11 |
| P4 | `scan.js` DOM | `.cam-bar .cam-thumb .cam-tools .bubble.compact .rec-time .track-log .overlay-wrap` 없음(구 `.controls` 레이아웃). 셔터 72px 는 있음 | §6.2·§6.10 |
| P5 | `scan.js` + `styles.css .eye-hud` | 배지가 루페 말풍선(SPAN)에 가려짐 — 탭 불가·안 보임 | §5.4·§6.2 |
| P6 | `scan.js onpointerdown` | `performance.now()` 사용, `event.timeStamp` 무시(터치 지연 40ms 가 등급에 반영) | §3.2 |
| P7 | `styles.css .vignette` | MISS 용 Ember 비네트 없음(황동 고정) | §2 |
| P8 | `styles.css .screen` | 데스크톱 셸 480px(스펙 430) | DESIGN §10 |

## 6. v7 소유 파일 결함 (우선순위)

1. **medium** `src/ui/v7.css:89` `.select-bar .btn` — 390px 에서 글자 단위 줄바꿈(`꺼/내/기`). `white-space:nowrap; padding:0 8px; font-size:13px; gap:4px`.
2. **medium** `src/ui/screens/spots.js` 헤더 — `#src` 필(`OSM (Nominatim) · 방금`, 211px) 때문에 h2 가 5줄. 필을 `title` 로 축약(`OSM`)하거나 `h2{white-space:nowrap}`.
3. **low** `src/ui/screens/title.js spotCardHtml` — 카드가 로드 시 y824(가시 20px). `.thumb-row` 앞으로 이동 또는 스트립 위.
4. **low** `src/ui/screens/album.js detail render` — `.photo-wrap` 이 인라인 `img` 기준선 여백만큼 7px 큼 → 각인 세로 2.4% 오차. `.photo{display:block}`(reveal.js 와 동일).
5. **low** `src/geo/provider.js decorate` — `mapsUrl` 좌표 부동소수 노이즈(15자리). 5자리 반올림.
6. **doc** `docs/GAMEPLAY_V7.md` — §3.2 링 등급 기대값이 BALANCE 와 불일치(.36→GREAT, .60→MISS 가 맞음); §7.2 제공자 순서에 Nominatim 추가.

## 7. QA 메모

- 첫 스팟 시도에서 모킹 URL 패턴(`overpass`)이 실제 제공자(Nominatim)와 달라 **모킹 좌표(서울시청)로 실제 `nominatim.openstreetmap.org` 요청이 1회 나갔다**(카드 5장 정상 수신, 그 뒤 올바른 모킹으로 재실행). 제품 동작(탭할 때만 좌표 전송) 자체는 스펙대로였다.
- 헤드리스에서 `navigator.share` 가 함수라서 꺼내기가 share 경로로 갔다(사용자 제스처 없음 → cancel 처리). `share` 를 제거하고 재실행해 `a[download]` 폴백을 확인했다.
- `docs/game-feel-contract.json` v3 갱신과 `vfx/*.json` 검증기 실행은 이 역할의 소유 범위 밖이라 하지 않았다.
- 서버(`:5179`)·헤드리스 Chrome·브리지는 종료했다(프로세스 0).
