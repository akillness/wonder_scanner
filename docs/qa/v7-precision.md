# v7 정밀도 QA (2차) — 추적 실루엣 · 액션 연출 · 아우라 · 카메라/앨범 · 위치 추천

> 기준: [GAMEPLAY_V7.md](../GAMEPLAY_V7.md) §1–§7, [DESIGN.md](../../DESIGN.md) §2·4.10·6·9·10, [game-feel-contract.json](../game-feel-contract.json) v3. 실행일 2026-09-23 22:5x–23:1x. 작성: qa-precision (v7, Fixer 반영 후 재검증 라운드).
> 원칙: 시뮬레이션 진실(감지·쿨다운·공명·등급·보상·저장 키)은 관측만 하고 바꾸지 않았다. `src/` 는 한 줄도 수정하지 않았다. 이 문서와 `docs/game-feel-contract.json`, `docs/screens/v7-*.png` 만 썼다.

## 0. 요약

| 항목 | 결과 |
|---|---|
| 스크린샷 | 요청 20장(`v7-01…31`) 전부 재촬영 + 상대 세션 배선 스모크 1장(`v7-40-scan-peer-wired.png`) |
| 콘솔 오류 | **0** (세 페이지 세션 합계 23건 = vite debug 4 · WebGL 드라이버 성능 경고(swiftshader) 4 · Canvas2D `willReadFrequently` 힌트 1(QA 의 getImageData) · `[geo]` info 9(의도한 실패 주입) · 나머지 debug). `Runtime.exceptionThrown` 0, 라우트 예외 0 |
| 검사 행 | 2.1–2.7 79행 중 **합격 71 · 관찰 6(문서/스펙 불일치 또는 low 결함) · 불합격 1(상대 세션 소유 scan.js 배지 가림) · 생략 1** + §5 의 23:05 버전 doSnap 회귀 1건 |
| Fixer 11건 재검증 | **11/11 확인** (선택 바 줄바꿈 · 스팟 헤더 · 프리즈 풀링 · createStaging · 클립 각인 게이팅 · 명암=스포트라이트 램프 · overlay quietNow · MISS Ember 비네트 · 카드 제목 리셋 · 메타 말줄임 · 타이틀 CTA sticky) |
| 새 결함 | v7 소유 2건(low: 타이틀 카드가 sticky CTA 띠 아래 38px 겹침 · mapsUrl 부동소수 노이즈 잔존), 상대 세션 소유 4건(medium 2: 배지 가림 · doSnap §6.11 회귀 / low 2: pointerdown 시계 · 480px 셸), 문서 1건 |
| 노드 검증 | `node tests/eye-precision.mjs` 14/14 ALL PASS · `node --check` v7 모듈 15개 통과 · `validate_vfx_spec.py` aura-tracking(valid, particles 60/draw 8)·eye-impact(valid, 14/6) 통과 |

## 1. 환경과 방법

- **브라우저**: `chrome-devtools` MCP 의 프로필(`~/.cache/chrome-devtools-mcp/chrome-profile`)을 상대 세션이 잡고 있어(`new_page` → "browser is already running") 1차와 같은 방식으로 **Google Chrome headless(new) + 자체 CDP 브리지**(Node 26 내장 WebSocket, 별도 프로필, 의존성 0, `Runtime.evaluate`/`Page.captureScreenshot`/`Emulation.*`/`Runtime.consoleAPICalled`+`exceptionThrown`+`Log.entryAdded`)를 썼다. 뷰포트 390×844 DPR 1 mobile+touch, 08 만 1024×800 desktop. `--use-angle=swiftshader` 로 이번엔 WebGL2 가 살아 tfjs 가 정상 백엔드로 로드됐다(1차는 CPU 폴백).
- **URL**: `http://127.0.0.1:5179/?debug` (vite 7.3.6, `--strictPort --host 127.0.0.1`). `window.__ws = { state, go, WONDERS, RARITY }` 확인.
- **카메라**: 새 문서마다 `getUserMedia` 를 `NotAllowedError` 로 거부 → 사진 폴백(`카메라를 쓸 수 없어요 … 사진 선택`) 경로 665ms 도달. `tutorialSeen=true`.
- **scan.js 상태(중요 — 실행 중에 바뀜)**: QA 시작 시점(22:2x)의 `scan.js` 는 v7 계약 미배선(`__scan` 키 13개, `.overlay-wrap/.track-log` 없음). 따라서 §1·§2·§4 의 "보이는 층"은 1차와 같이 **계약을 그대로 재현**해 검증했다: `S.alive=false` 로 스캔 루프를 멈추고 같은 오버레이 캔버스에 `overlay.drawTarget(x,{…,sil,mode,aura,shade},tf)` + `staging.createStaging()` + `auras.*` 를 스캔 루프와 같은 순서로 호출(`window.__qa`). 소스 = 720×1280 합성 정지 이미지(잉크 배경 + 머그), bbox = 소스 픽셀 `[200,420,320,400]` → 화면 `[89.5,276.9,211,263.8]`(tf.s .659). **23:05:59** 에 상대 세션이 `scan.js` 를 배선했고(§5 스모크), 이 문서의 §1·§2·§4 수치는 모듈 층(overlay/staging/auras)의 증거이며 배선된 scan.js 는 스모크만 했다.
- **증거 수집**: 오버레이 컨텍스트 `fillText` 스파이(태그 문자열), `getImageData` 3×3 최대-알파 샘플(색·알파), 주입 시각(`now`)으로 결정적 프레임, WAAPI `pause()/currentTime` 로 펀치 중간 프레임, IndexedDB 는 `import('/src/game/media.js')` 로 직접 조회, `fetch`/`geolocation` 모킹, `Emulation.setEmulatedMedia` 로 OS `prefers-reduced-motion`.
- **프로브 오염 교훈**: 처음 잡은 샘플점 3곳이 다른 층(스캔라인 띠·공명 링 블러·명암)에 겹쳐 값이 섞였다 — 모두 깨끗한 캔버스/다른 점에서 재측정했고 표에는 재측정값만 적었다. 아우라 cancel (a) 는 처음에 페이드 종료 뒤에도 gauge 1 프레임을 계속 먹여 이미터가 정당하게 재추적(48)했다 — 페이드 중에만 그리도록 고쳐 재측정.

## 2. 결과 표

판정: ✅ 합격 · ❌ 불합격 · ⚠️ 관찰(스펙/문서 불일치 또는 low 결함, 시뮬레이션 불변) · ⏭ 생략. "인과 변수"는 고칠 때 건드릴 단 하나의 변수/파일.

### 2.1 추적 실루엣 (§1)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| 각인 윤곽 50% | `gauge=.5, mode=scan`, 프로즌 now=1000, 아우라·명암 OFF | 상변 무쇠 잉크 `rgb(159,167,179)` α192(소수 y 안티에일리어스) · 우변 α255, 하·좌변 α0, 코너 틱 TR·BR 켜짐 / BL·TL 꺼짐 → 25·50% 틱 규칙 | ✅ | — |
| 각인 100% 번쩍 | `gauge=1` 첫 프레임 프로즌 | 4변+4틱 모두 황동 `rgb(226,180,90)` α255 (3px, `snapFlashMs 120` 안) | ✅ | — |
| 100% 이후 실선 | 프로즌 +400ms | 4변+4틱 무쇠 잉크 실선 α255 | ✅ | — |
| 진행 태그 | fillText 스파이 | `cup · conf 87% · 공명 50%` → `… 공명 100%`; `mode:'capture'` → `탭!`; 태그 아래 3px 바(스크린샷 01/02) | ✅ | — |
| 잔상 궤적 | 박스를 45ms 마다 10px 씩 12회 이동 | 링 버퍼 **6**개(80ms 규칙: 45ms 스텝은 2회당 1회), 오래된→새 순 좌변 α 13/21/23/28/48 (스펙 `.30·(i+1)/n` = 13/26/38/51/64, 1px 선 샘플링으로 낮지만 단조 증가) | ✅ | — |
| 모션 줄이기 × 궤적 (호출자 플래그) | 같은 이동, `reduceMotion:true` | 궤적 위치 α≈4(스캔라인 띠만) = 궤적 OFF, 각인 α192·태그 유지 | ✅ | — |
| 모션 줄이기 × 궤적 (OS) | `prefers-reduced-motion: reduce` 에뮬레이션 + 호출자 플래그 **false** | 궤적 α0, 각인 α192 — staging.rm() 이 OS 설정을 OR | ✅ | — |
| 상실 잔영 타이밍 | `sil.setLoss(box,T)`, T+10/450/1490/1510 | drawLoss = true/true/true/**false**; 상변 α85 → 60(=×0.71, `.6→0` 선형) → 0; 태그 `놓침 · 다시 비춰 봐` 1490 까지, 1510 에 사라짐 | ✅ (±20ms) | — |
| normalizeBox | bbox `[200,420,320,400]`, 소스 720×1280, crop=bbox | `[0.2647, 0.2059, 0.4706, 0.5882]` (camera.snapshot 정사각 크롭 규칙과 일치, 1차와 동일) | ✅ | — |
| 상수 | `SILHOUETTE`/`STAGING` | 계약과 필드·값 모두 일치 | ✅ | — |

### 2.2 액션 연출 (§2 — Fixer 의 `createStaging` 컨트롤러 포함)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| `.overlay-wrap` 래핑 기하 | video/still/canvas 를 런타임 래핑 | 오버레이 rect 불변(wrapGeomOk) | ✅ | — |
| 잠금 수렴 120ms | `stg.lock(box,6000)`, draw 6060 | TL 브래킷 (83.2,247.2) Bone α**210** = 스펙 `.3+.6·easeOut(.5)`=.825; `isActive` 60ms true / 130ms false | ✅ | — |
| 공명 펄스 링 | `gauge(.4→.55)`, `.7`, `1` | 펄스 이벤트 50% 교차(7016)·100%(7400)에서만, .7 에서는 없음; t=.5 반지름 150.2 Bone α28(기대 32) | ✅ | — |
| 스포트라이트 램프(명암 없음) | `stg.capture(8000)`, draw +0/40/80/200 | 박스 밖 INK0 α 0 → 51 → **102**(.4) → 102; quiet 컨트롤러는 +0 에서 α102(정적) | ✅ | — |
| 명암 = 스포트라이트 (Fixer) | `drawTarget(shade:true)`, scan g=1 → `mode:'capture'` +0/40/80/200 | 바깥 α64(=.25) → 64 → 83(.325) → **102**(.4) → 102 = 80ms 램프; `reduceMotion` 이면 +0 에서 102 | ✅ | — |
| PERFECT 펀치 중간 | `stg.grade('PERFECT',{cx,cy,r},10000,wrap,src)`, WAAPI 70ms 정지 | 애니 1개, `transform: matrix(1.06,…)`, `transform-origin: 195px 408.812px`(bbox 중심) | ✅ | — |
| 펀치 복귀 | 실시간 `await punch()` | PERFECT **403ms**(320 + finish 지연 폴백 80) / GOOD 243ms 후 resolve(true), `transform:none`, origin 초기화, 애니 0; `reduceMotion` → false 즉시(OS 에뮬레이션에서도 false); `AUTO`(1.0) → false | ✅ | — |
| 프리즈 프레임 풀링 (Fixer) | grade 시점에 `captureFreeze(src)`, 그 뒤 **라이브 소스를 Ember 로 덮어 칠한 뒤** draw 10030/10060 | 머그 픽셀이 여전히 Bone `(207,199,180)` α255 — 고정 캔버스 블릿, 재샘플 없음; `hasFrozen(10000)` true; `freezeFrame(x,src,tf,cw,ch,10080)` true; reset 뒤 `hasFrozen` false | ✅ | — |
| 프리즈 호환 시그니처 | `freezeFrame(x, tf, cw, ch)` (now 생략) | false — `performance.now()` 시계와 주입 시계(10000)가 달라 stale 판정. 실제 루프(같은 시계)에서는 문제 없음 | ✅(메모) | — |
| 스피드라인 | draw 10190 (t=.5) | r0=153 지점 황동 α128(=1−t), `isActive` 290ms 까지 | ✅ | — |
| MISS 달아남 | `stg.miss(box,{x:cx,y:cy+60},11000)`, draw 11150 | `from` 반대 방향 −y 로 52.5px(=60·easeOut(.5)), 본체 Ember `(211,113,106)` α115(=.9·.5), 스트릭 α26, 원위치 α0, 300ms 뒤 inactive | ✅ | — |
| MISS Ember 비네트 (Fixer) | 같은 호출, `#vig` | `.vignette.miss` 즉시 on: `box-shadow: rgba(210,112,106,.45) 0 0 60px 8px inset`, `animation: stgMissVig .12s`, opacity 1; 140ms 뒤 클래스 제거(200ms 확인 false) | ✅ | — |
| 정령 팝 | `stg.spirit({120,600})`, t=.5 | 링 r=39.5 녹청 `(109,180,159)` α122(기대 128); 황금 → 황동 `(224,178,88)` | ✅ | — |
| quiet 컨트롤러 | `createStaging({quiet:true})` miss/spirit | 캔버스 α0, `#vig.miss` 미토글, 스포트라이트만 정적 유지 | ✅ | — |
| 발견 히어로 실루엣 | `go('reveal')` rarity 3(`hot dog`), reduceMotion false | `.etch-hero > svg.etch`(글자 0) `animation: stgEtchHero` 즉시, 300ms 존재, 800ms 제거, 서스펜스 후 카드 | ✅ | — |

### 2.3 핵심 정밀도 (§3.2 — 훅/모듈이 있는 행)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| 타이밍 링 등급 | `createCapture().start(0); tap((1−r)·1500)` r=.30/.36/.46/.60/.90 ×3 | PERFECT / GREAT / GOOD / MISS / MISS — 3회 동일, 단조; 3사이클 뒤 `{auto:true}` | ✅ | — |
| 경계 ±0.01 | `target±(perfect∓.01)`, `±(great∓.01)`, `±(good∓.01)` | 안쪽 PERFECT/GREAT/GOOD, 바깥 GREAT/GOOD/MISS — 양쪽 대칭, 뒤집힘 없음 | ✅ | — |
| 스펙 표 vs BALANCE | (문서) | §3.2 1행 기대값 `PERFECT/PERFECT/GOOD/GOOD/MISS` 는 `BALANCE.capture{perfect .045, great .10, good .17}` 과 불일치(.36→GREAT, .60→MISS). 1차 지적 후 미수정 | ⚠️ | `docs/GAMEPLAY_V7.md §3.2 1행` |
| 터치 지연 보정 | (코드, 23:05 버전) | `overlay.onpointerdown` 이 여전히 `performance.now()` 만 씀(`e.timeStamp` 무시) | ⚠️ | `scan.js:171`(상대 세션) — `now = e.timeStamp || performance.now()` |
| 시선 정밀도(노드) | `node tests/eye-precision.mjs` | 14/14 ALL PASS(정지 홀드 917ms PERFECT, 지터 7/9/17/19 → P/G/G/GOOD, 깜빡임 1/2, 정령 59/61px, 상실→0 850ms, 300px 점프 90% 33ms) | ✅ | — |
| 시선 홀드·보정·경합·잠금 히스테리시스 | 헤드리스 | v8.1/8.2 QA 범위, 이번 라운드 훅 범위 밖 | ⏭ | — |

### 2.4 VFX (§4)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| 추적 명암 | `shade:true, gauge=.6`, 450ms rAF 후, 아우라 OFF | 박스 밖 4점 모두 INK0 α**48** = `(0.10+0.6·0.15)·255`; 중심 Bone 빛 α36(=.14) | ✅ | — |
| 아우라 풀 상한 | `createAura('ember')` gauge .85 → 1, 프레임별 max | tracking **41**(=4+.85·44) / charged **48** = `POOL_MAX`, 초과 0 | ✅ | — |
| 상실 후 400ms 안 0 (a) | `setPhase('cancel')` + 페이드 중 22프레임 계속 draw | 48 → 399ms **48**(페이드 중) → 456ms **0** | ✅ | — |
| 상실 후 400ms 안 0 (b) | draw 중단만 | 48 → 365ms 48 → 465ms **0** (`staleMs 400`) | ✅ | — |
| 모션 줄이기 아우라 | `reduceMotion:true` | count 0, 정적 링 rx=122.2 에 황동(명암 위라 `(185,149,84)`) α152 1px | ✅ | — |
| `:root.reduce-motion` 만 (Fixer quietNow) | 호출자 플래그 false + 루트 클래스 | count 0 + 정적 링 → overlay.drawTarget 가 OR 한다 | ✅ | — |
| OS prefers-reduced-motion 만 | 에뮬레이션 + 플래그 false | aura count 0, 궤적 OFF, punch false | ✅ | — |
| 궤도 스킨 | `createAura('orbit')` gauge .85 | 41 파티클 + 링 2 (스크린샷 11) | ✅ | — |
| 기본 매핑·경제 | `auraFor`/`buyAura`/`equipAura` | cup·laptop(desk)→orbit, dog(living)→verdigris, variant→prism, 모르는 라벨→ember; 미보유 장착 false; dust 100 → `별가루가 120 부족해요`; 500 → ok(280 남음) → `이미 보유`; 원더별/전체 장착·해제 정상; state 원복 | ✅ | — |
| 아이 임팩트 | 깨끗한 캔버스 `drawEyeImpact(pt,.42,'#E2B45A')` | 링1 r72.4 황동 α**148**(=1−t 정확), 링2(+60ms) r59.7 α**177**(정확), Bone 스파크 α94(정확)·황동 스파크 α70, t>1 → 0 | ✅ | — |
| 임팩트 DOM 채널 | `.eye-hud.impact`, `.eye-flash.on` | 배지 `animation: eyeBadge`, 플래시 opacity 1 + `inset 0 0 0 3px #E2B45A` | ✅ | — |
| `.eye-hud` 가림 | `elementFromPoint(HUD 중심)` (구·신 scan.js 모두) | HUD rect (12,650,207,44) 가 루페 말풍선 `SPAN.who` 에 **가려짐** — 스캔 스크린샷에서 배지 미표시 | ❌ | `scan.js` 레이아웃(상대 세션) — §6.2 대로 `.cam-tools` 안으로 |
| VFX 계약서 | `validate_vfx_spec.py` | aura-tracking valid(particles 60 = 궤적 12 + 아우라 48, draw 8) · eye-impact valid(14/6) | ✅ | — |

### 2.5 카메라 · 미디어 · 앨범 (§6)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| 셔터 탭(원더 없음, 22:57 버전) | `#shutter` pointerdown/up, 타겟 null | 앨범 +1 `kind:'photo', label:null` — §6.11 충족(1차 ❌ → 해소) | ✅ | — |
| 셔터 탭(감지 주입, 22:57 버전) | `injectDetection(cup .8)` 후 탭 | +1 `kind:'photo', label:'cup'`, **box null · alts 0** | ⚠️ | `scan.js doSnap`(상대 세션) — 23:05 버전은 `box` 전달(§5) |
| 미디어 데이터 모델 | `addMoment` photo/video/wonder(+box,alts) + 옛 레코드 `legacy-1`(kind/box/alts/duration/edited 없음, `undeleteMoment` 로 원문 저장) | 7건; `listMoments` photo 2 · video 1 · wonder 4 · perfect 1 · fav 0 · friend 1 · clip 1; legacy → `kind:'wonder', box:null, alts:[], edited:false, duration:0, poster:null`; m1 alts 2(1885/1776B) · photo 5745B · thumb 1367B; 영상 `duration 4200, poster, clip 6032B webm` | ✅ | — |
| exportMoment | m1·m3 | `wonder-clock-20260923.jpg` image/jpeg · `wonder-clip-20260923.webm` video/webm | ✅ | — |
| 격자 혼합 | `go('album')` | 7타일: 영상 `film 00:04` 배지, 스냅 `camera` 마커 ×2, 원더 글리프 ×4(legacy 포함); 칩 `전체·사진·영상·원더·퍼펙트·즐겨찾기·친구`; `.glyph` 밖 이모지 텍스트 0; 헤더 `7장 · 55KB` | ✅ | — |
| 영상 상세 | 영상 타일 탭 | `<video controls playsinline poster preload="metadata">`, 헤드 `00:04`, 액션 4 (`꺼내기·수정하기·공유하기·더보기`) y778 h60, 각인 없음 | ✅ | — |
| 앨범 상세 각인 (Fixer) | clock 타일(box .2/.2/.6/.6) | img = svg = wrap **[50,130.2,290,290]** (1차의 297 세로 늘어남 해소, `img.photo` display block), `<rect 20 20 60 60 rx4.5 sw1.5>` 황동, 글자 0, 틱 4 | ✅ | — |
| 상세 스와이프 | 캡션 위 pointerdown → move −12 → −80 → up | `--dx:-12px` + `dragging` → `-80px` → 6/7 → **7/7**, 종료 `--dx:0px`; 세로 우세 드래그(dy 90)는 양보(7/7 유지) | ✅ | — |
| 더블탭 즐겨찾기 | `#pz img` click ×2 (80ms) | 토스트 `즐겨찾기`, DB fav 1, 헤드에 하트 | ✅ | — |
| 꺼내기 | `#dExport` (share/canShare 제거) | `a[download="wonder-laptop-20260920.jpg"]` blob: 클릭 관측, 토스트 `기기에 저장했어요` | ✅ | — |
| 옛 추억 상세 | `legacy-1` | `.etch` 없음, 헤드 `일반 AUTO`, 이름 글리프 정상, 오류 없음 | ✅ | — |
| 선택 모드 | 타일 pointerdown 300ms→미진입, 550ms→진입 | `.select-mode` + `.select-bar`(y775 h69) `1장 선택` → 두 번째 탭 `2장 선택`, 체크 2 | ✅ | — |
| 선택 바 글자 줄바꿈 (Fixer) | 390px | `.select-bar .btn` 3개 각 95×48, `white-space: nowrap`, 13px, 텍스트 **1줄**(Range rects 1) — 1차 `꺼/내/기` 해소 | ✅ | — |
| 삭제 → 실행 취소 | `#sDel` → `.toast.undo` 버튼 | 낙관적 5타일/DB 5, 토스트 `2장 삭제됨 실행 취소` → 되돌리기 7/7, `되돌렸어요` | ✅ | — |
| 발견 화면 각인 | `go('reveal', {…discover('clock'), photo, box, alts×2, momentId})` | 카드 1210ms; `.card .photo-wrap svg.etch` rect = 사진 rect **[50,27,290,290]**, `<rect 20 20 60 60>`, 글자 0; 버스트 3(`on` 0, `다른 컷`); NEW 도장; 스크래치는 이름 영역 | ✅ | — |
| 다른 컷 고르기 | `#burst [data-k=1]` 탭 | 사진 src 교체, `on` 0→1, DB photo 5745→**1885** / alts [1885,1776]→**[5745,1776]**(swapAlt 재배열), 각인 rect 동일 유지, 토스트 `컷을 바꿨어요` | ✅ | — |
| 클립 있는 발견 (Fixer 게이팅) | 같은 res + `clip: webm` | `.card .photo` = **VIDEO**, `.card .photo-wrap`/`svg.etch` 없음(카드 위 윤곽은 정지 사진에만), 버스트 3 유지 | ✅ | — |

### 2.6 위치 기반 추천 (§7)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| 옵트인·아이들 | `go('spots')` | `주변 촬영지 찾기` 버튼, geolocation 호출 0·요청 0, 프라이버시 줄 `좌표(100m 단위)만 …` | ✅ | — |
| 스팟 헤더 줄바꿈 (Fixer) | 390px | h2 `주변 촬영지` 높이 **29px**(1줄; 1차 143px/5줄), 필 `OSM`(title `OSM (Nominatim)`) 70px → 목록 후 `OSM · 방금` 116px 에도 h2 29px, 헤더 44px | ✅ | — |
| 키 없음 + OSM 모킹 | `fetch` 모킹(Nominatim jsonv2 16행, 이름 없는 1행) + `getCurrentPosition`(37.5665,126.978) | 요청 **1**회(15건 ≥ `enough 14` 조기 종료), 카드 **5**(transit 63m 남동 · cafe 74m 서 · shop 86m 북동 · restaurant 142m 북동 · library 177m 동 — 규칙 다양성), `.sp-name` Gowun Batang 16px 1줄, mono 메타 `scrollWidth ≤ clientWidth`, 글리프 3/카드, 기믹 배지 5, 엠블럼 svg, 버튼 44px, 첫 카드 `.top` | ✅ | — |
| 카드 제목·메타 리셋 (Fixer) | 위 카드 | `.sp-name` 높이 21px(장부 h3 룩 리셋), `.sp-meta` 말줄임 준비(`min-width:0`) — 오버플로 0 | ✅ | — |
| 저장 최소화 | `state.geo` / localStorage | `lat 37.567, lng 126.978`(3자리), spots 15(≤20) 키 `id name types lat lng dist_m bearing_deg mapsUrl source`, localStorage 동일 | ✅ | — |
| mapsUrl 좌표 | 카드 `data-map` | `37.567299999999996%2C126.9789`, `…126.97999999999999` — 부동소수 노이즈 잔존(1차 low, 미수정) | ⚠️(low) | `provider.js decorate/mapsUrl` — 5자리 반올림 |
| 기믹 시작 → 배율 | 카페 카드 `카메라 열기` | 토스트 `기믹 「커피 시간」 시작 · 30분`, `state.geo.gimmick{coffee, dustMulChapter 2, kitchen, 골목 카페}`, `eventMod('dust',{kitchen})`=**2** · desk 1 · xp 1 · spirit 2(오늘의 사건 몫), `gimmickMod` 2, scan 라우트로 이동(폴백 정상) | ✅ | — |
| 만료 | `gimmick.until = now−1` | `activeGimmick()` null, `eventMod(dust,kitchen)` = **1** | ✅ | — |
| 루페 조언 | `advise({screen:'scan'})` | `pin` 아이콘 `기믹 「커피 시간」 진행 중 — 부엌 원더 별가루 ×2. 30분 남았어, 골목 카페 근처야.` action `spots` | ✅ | — |
| 위치 거부 | `getCurrentPosition → err({code:1})` + `#refresh` | status `denied`, `.spot-fallback.warn` `위치 없이도 게임은 그대로` + `다시 시도` + `카메라 열기` | ✅ | — |
| 두 API 실패 | nominatim·overpass fetch throw, 캐시 없음 | 7.3s 후 status `empty`(nominatim 8 + overpass 1 시도), 폴백 카드(warn 아님) + 재시도, 콘솔 **info 만** | ✅ | — |
| Google 경로(키 모킹) | `googleNearby({key:'TESTKEY', fetchImpl:spy})` | `POST places.googleapis.com/v1/places:searchNearby`, `X-Goog-Api-Key: TESTKEY`, `X-Goog-FieldMask: places.id,places.displayName,places.types,places.location`, `includedTypes 20`, `maxResultCount 20`, `languageCode ko`, `radius 800`; 응답 `source:'google'` | ✅ | — |
| 타이틀 카드 | `go('title')` (캐시 + 기믹) | `#spotCard.top` `시청앞 정류장 63m · 남동 · 거리의 거인들 / 기믹 「커피 시간」 30분 남음 · …`, 엠블럼 street, `data-go=spots`, 중복 삽입 0(entries 1) | ✅ | — |
| 타이틀 CTA sticky (Fixer) | 같은 화면 | `.actions` `position: sticky`, `#start` [16,673,358,60] — 하단 35% 안, 스크롤 0 에서 항상 보임 | ✅ | — |
| 타이틀 카드 vs sticky 띠 | 목표 장부·회상 카드가 있는 상태 | 카드 y629–695(다른 상태 742–819)가 sticky `.actions` 띠 y657–828 와 **38px 겹침**, `elementFromPoint(카드 중심)` = `DIV.actions` — 로드 시 카드가 그라데이션 띠 아래 숨어 스크롤해야 보임(빈 상태에선 y321 로 보임, 스크린샷 31) | ⚠️(low) | `title.js spotCardHtml` 삽입 위치(목표 장부 위) 또는 `v7.css .screen.title .actions` 위쪽 여백 |

### 2.7 모바일 게임 원칙 (DESIGN §10)

| 항목 | 주입 | 관측 | 판정 | 인과 변수 |
|---|---|---|---|---|
| 데스크톱 폰 셸 | 1024×800, 타이틀 | `.screen` 480px(x272) 가운데 + hairline 좌우, `#app`·body `--ink-0` — 스펙 **430px** 아님, `.phone-shell` 없음(styles.css 의 ≥520px 규칙이 있어 v7.css 가 추가하지 않음, 1차와 동일) | ⚠️(low) | `src/styles.css .screen{max-width}`(상대 세션) |
| 엄지 영역 | 390×844 | 셔터 72px @ y731, 앨범 상세 액션 @ y778, 선택 바 @ y775, 타이틀 CTA @ y673 — 모두 하단 35% 안 | ✅ | — |
| 팔레트·아이콘 | v7.css/staging.css/모듈 grep + DOM 이모지 워크 | `#fff/cyan/purple/magenta` 0건; 타이틀·앨범·스팟 크롬에 `.glyph` 밖 이모지 0 | ✅ | — |

### 2.8 Fixer 보고 11건 재검증

| # | Fixer 항목 | 재검증 | 판정 |
|---|---|---|---|
| 1 | `v7.css:89 .select-bar .btn nowrap` | 2.5 선택 바 — 95×48, 1줄 | ✅ |
| 2 | spots 헤더 `srcShort()` + h2 nowrap + 필 38% | 2.6 — h2 29px, `OSM`/title | ✅ |
| 3 | `staging.js freezeFrame` 풀링(`captureFreeze/hasFrozen/releaseFreeze`, 선택 `now`) | 2.2 — 라이브 소스 덮어도 Bone 유지, 호환 형태 유지 | ✅ |
| 4 | `createStaging()` 컨트롤러 | 2.2 — lock/pulse/capture/grade/miss/spirit/release/reset/isActive/snapshot 전부 관측 | ✅ |
| 5 | `reveal.js` 클립 있으면 카드 각인 생략 | 2.5 — VIDEO 카드에 `.photo-wrap/.etch` 없음 | ✅ |
| 6 | `drawTrackingShade(mode,now)` 명암 = 스포트라이트 램프 | 2.2 — 64→83→102 (80ms), AURA_TIMING 에 spotlightMs/Alpha | ✅ |
| 7 | `overlay.js quietNow()` | 2.4 — `:root.reduce-motion` 만으로 아우라·명암 정적 | ✅ |
| 8 | `.vignette.miss` + `missVignette()` | 2.2 — Ember inset 60/8 .45, 120ms, 140ms 후 해제 | ✅ |
| 9 | `.spot-card .sp-name` 장부 h3 룩 리셋 | 2.6 — 21px 1줄, 말줄임 | ✅ |
| 10 | `.sp-meta` min-width/ellipsis | 2.6 — 오버플로 0 | ✅ |
| 11 | `.screen.title .actions` sticky | 2.6 — CTA 엄지 영역 고정(단, 카드 겹침 ⚠️ 신규) | ✅ |

## 3. 스크린샷 (`docs/screens/`)

| 파일 | 내용 | 메모 |
|---|---|---|
| v7-01-scan-etch-50.png | 각인 50% + 틱 2 + 태그 `공명 50%` + 명암 + 잔불 아우라 | 배지 `.eye-hud` 가 말풍선에 가려 안 보임(§2.4) |
| v7-02-scan-etch-100.png | 100% 황동 번쩍 프레임(3px) | — |
| v7-03-perfect-punch.png | 줌 1.06(WAAPI 70ms 정지) + 스포트라이트 .4 + 실선 각인 + 스피드라인 16 + `퍼펙트!` | 프리즈(0–90ms)와 스피드라인(90–290ms)은 순차라 라인 구간(190ms)에서 촬영 |
| v7-04-miss-afterimage.png | Ember 스트릭 3 + `도망쳤다!` + Ember 비네트 | 비네트는 120ms 라 `.miss` 를 붙인 채 애니를 일시정지해 촬영 |
| v7-05-loss-afterimage.png | 점선 잔영 + `놓침 · 다시 비춰 봐` | T+450ms |
| v7-06-reveal-etch.png | 카드 사진 위 황동 각인 + 버스트 스트립 A·B·C + NEW | — |
| v7-07-album-detail.png | 앨범 상세 각인(사진 rect 와 정확 일치) | 1차 세로 7px 늘어남 해소 |
| v7-08-phone-shell.png | 1024×800 타이틀, 480px 셸 | 430px 아님(⚠️ low, 상대 세션) |
| v7-09-reduce-motion-scan.png | OS prefers-reduced-motion: 궤적 OFF · 정적 아우라 링 · 각인·태그·명암 유지 | 박스는 궤적 시험으로 오른쪽 이동 상태 |
| v7-10-aura-ember.png | 잔불 41 파티클 + 명암 | — |
| v7-11-aura-orbit.png | 궤도 링 2 + 파티클 41 | — |
| v7-12-eye-impact.png | 눈 조준점 fill 1 + 충격파 링 + 스파크 + `탭!` + 가장자리 플래시 + 배지 impact(왼쪽 가장자리) | 배지가 말풍선 뒤라 일부만 보임 |
| v7-13-tracking-shade.png | 바깥 어둠 α48 + 안쪽 빛 | — |
| v7-20-camera.png | 사진 폴백 카메라 화면(구 `.controls` 레이아웃) | `.cam-bar/.cam-tools` 미배선(상대 세션) |
| v7-21-album-mixed.png | 사진·영상·원더·옛 레코드 혼합 격자 | — |
| v7-22-album-detail-actions.png | 영상 상세 + 4 액션 | — |
| v7-23-select-mode.png | 2장 선택 + 선택 바(1줄 버튼) | 1차 줄바꿈 해소 |
| v7-24-reveal-burst.png | 컷 교체 후(B) + 토스트 | — |
| v7-30-spots.png | 카드 5 + 기믹 배지, 1줄 헤더 | 1차 5줄 헤더 해소 |
| v7-31-title-spot-card.png | 타이틀 스팟 카드(캐시 + 기믹) | 목표 장부 없는 상태(y321) — 장부·회상이 있으면 sticky 띠 아래로 들어감(⚠️) |
| v7-40-scan-peer-wired.png | (추가) 23:05 배선된 scan.js 스모크: `.track-log` `최근: cup 53%`, 각인 53%, 태그 | 상대 세션 소유, 관측만 |

## 4. 콘솔 오류

**0건.** 세 페이지 세션 합계 23건: `[vite] connecting/connected`(debug) · `GL Driver Message … GPU stall due to ReadPixels`(swiftshader 성능 경고, warning) · `Canvas2D … willReadFrequently`(QA 의 `getImageData` 유발 1) · `[geo] nominatim failed: <카테고리> TypeError` ×8 + `[geo] overpass failed` ×1(의도한 실패 주입, `console.info`). `Runtime.exceptionThrown` 0. 라우트 `scan/reveal/album/spots/title` 어느 것도 throw 하지 않았다(배선 전·후 scan.js 모두).

## 5. 상대 세션 소유 파일 (scan.js · scanner/** · state.js · balance.js · meta.js · styles.css · icons.js)

수정하지 않았고 관측만 기록한다. `scan.js` 는 이 QA 도중 두 번 바뀌었다(22:57 `doSnap kind:'photo'` 도입 → 23:05:59 v7 배선). 아래는 **23:05 버전 스모크**(`v7-40`) 기준.

| # | 파일 | 관측 (23:05 버전) | 스펙 | 1차 대비 |
|---|---|---|---|---|
| P1 | `scan.js` | v7 배선 **됨**: `staging.js`·`auras.js`·`frames.js` import, `#owrap.overlay-wrap`(VIDEO/IMG/CANVAS), `#tlog.track-log`(`최근: cup 33%`), `__scan` 에 `trail aura staging silhouette stage trackLog frames shutter record` 추가(총 18키). `injectDetection(cup)` + 사진 폴백에서 `trail 3`, `aura {orbit, 19}`(gauge .33 → 4+.33·44), `frames 3`, `S.lock 'cup'`, 라우트 예외 0 | §1.2·§2·§4 | 해소(스모크만; 모듈 층 수치는 §2 표) |
| P2 | `scan.js finish()` | `addMoment({…, box, alts})` (line 332) + `frames.best()` 기반 베스트 포토·`normalizeBox` | §1.3·§6.3 | 해소(코드 관측; 실포획 경로는 카메라 거부라 미실행) |
| P3 | `scan.js doSnap` | 22:57 버전: `kind:'photo', label:null 허용` (탭 시험 ✅ — 앨범 +1). **23:05 버전(line 151–155)은 회귀**: `if (!lbl) return setLupe('원더를 비춘 채로 스냅하자.')` 로 라벨 없으면 저장 안 함, `addMoment({ label, grade:'AUTO', …, photoDataUrl, box })` 에 `kind:'photo'` 없음(기본값 'wonder' 로 저장) · `fx.shutter()` 미호출 · 썸네일 플라이 없음. 베스트 포토 `box` 전달은 새로 됨 | §6.3·§6.11 | 회귀 ❌ |
| P4 | `scan.js` DOM | `.cam-bar .cam-thumb .cam-tools .bubble.compact .rec-time` 없음(구 `.controls`). 셔터 72px·`.overlay-wrap`·`.track-log` 있음 | §6.2·§6.10 | 부분 |
| P5 | `scan.js` + `styles.css .eye-hud` | 배지 rect (12,650,207,44) 가 루페 말풍선 `SPAN.who` 에 가려짐(배선 전·후 동일) | §5.4·§6.2 | 미해소 ❌ |
| P6 | `scan.js:171 onpointerdown` | `performance.now()` 사용, `e.timeStamp` 무시 | §3.2 | 미해소 |
| P7 | `styles.css .vignette` | 황동 심장박동은 그대로이고 MISS 는 staging.css `.vignette.miss` 가 별도로 처리 — 충돌 없음 | §2 | 해소(v7 측) |
| P8 | `styles.css .screen` | 데스크톱 셸 480px(스펙 430) | DESIGN §10 | 미해소(low) |

## 6. v7 소유 파일 결함 (우선순위)

1. **low** `src/ui/screens/title.js spotCardHtml` / `src/ui/v7.css .screen.title .actions` — 목표 장부·회상 카드가 있으면 스팟 카드가 sticky CTA 띠와 38px 겹쳐 로드 시 가려진다(`elementFromPoint` → `.actions`). 카드를 장부 위로 올리거나 `.actions` 앞 콘텐츠에 `padding-bottom` 을 준다.
2. **low** `src/geo/provider.js mapsUrl` — 좌표 부동소수 노이즈(`37.567299999999996`). `round(…,5)` 후 URL 생성(1차 지적, 미수정).
3. **doc** `docs/GAMEPLAY_V7.md §3.2 1행` — 링 등급 기대값을 BALANCE 대로 `PERFECT/GREAT/GOOD/MISS/MISS` 로.

## 7. QA 메모

- `setup` 에서 부른 `indexedDB.deleteDatabase('wonder-album')` 이 타이틀의 `listMoments()` 연결에 막혀(`versionchange` 핸들러 없음) 영구 대기 상태가 됐고, 그 뒤 QA 의 **직접 `indexedDB.open` 이 큐에 걸려 멈췄다**(앱 자체 연결은 정상). 옛 레코드는 `media.undeleteMoment(record)`(원문 put)로 넣었다. 제품 결함 아님 — 다만 media.js 가 `onversionchange` 에서 `close()` 하면 외부 삭제/업그레이드에 더 안전하다(선택).
- 헤드리스에서 `navigator.share/canShare` 가 함수라 꺼내기 시험은 둘을 제거하고 `a[download]` 폴백을 확인했다.
- 아우라 `count` 게터는 `performance.now()` 를 쓰므로 주입 시계(now) 프레임과 섞으면 0 으로 읽힌다 — 아우라 행은 모두 실시간 rAF 로 측정했다. staging 은 주입 시계 그대로.
- 서버(`:5179`)·헤드리스 Chrome·브리지는 모두 종료했다(프로세스 0).
