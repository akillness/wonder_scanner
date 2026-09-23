# GAMEPLAY v7 — 추적 실루엣 · 액션 연출 · 아이 게이지 · 정밀도 QA

> 기준 문서: [DESIGN.md](../DESIGN.md) (색·서체·컴포넌트·모바일 게임 원칙), [docs/game-feel-contract.json](game-feel-contract.json) (v2 포획 순간 계약).
> 원칙: **시뮬레이션 진실은 건드리지 않는다.** 감지·쿨다운·공명 채움·등급 판정·보상·저장 스키마는 그대로 두고, 그 위에 "보이는 층"과 "측정"만 더한다. 변경은 인과 변수 하나씩, 증거가 있을 때만.

---

## 1. 추적 실루엣 (Tracked Silhouette) — "렌즈가 무엇을 붙잡고 있는지, 얼마나 왔는지, 어디 있었는지"

### 1.1 플레이어가 읽어야 하는 것
1. 지금 렌즈가 **어떤 물건**에 잠겨 있는가 (실루엣 위치·라벨).
2. 공명이 **얼마나** 찼는가 (실루엣 자체가 진행 바).
3. 물건이 **어디서 어디로** 움직였는가 (추적이 따라가고 있다는 증거).
4. 놓쳤을 때 **어디서** 놓쳤는가.
5. 포획 뒤에도 그 실루엣이 **기록으로 남는가**.

### 1.2 레이어 사양 (모두 `src/ar/overlay.js` 캔버스, 60Hz 한 프레임 안에)

| 레이어 | 사양 |
|---|---|
| **각인 윤곽 (etching)** | 스무딩된 bbox 를 반경 14px 둥근 사각 경로로 만들고, 둘레를 `gauge`(0→1) 비율만큼만 그린다 (`setLineDash([len*gauge, len])`). 선 1.5px, 색 = 희귀도 잉크(모르는 라벨은 Bone 60%). 25/50/75/100% 지점에서 10px 코너 틱이 하나씩 켜진다. 100% 에서 1프레임 3px 로 굵어지며 황동으로 번쩍(120ms) 후 실선 유지 |
| **잔상 궤적 (ghost trail)** | 80ms 마다 bbox 를 링 버퍼(12개)에 저장. 오래된 것부터 alpha `.30→0`, Bone 색, 1px 로 그린다. 물건이 움직이면 "지나온 자리"가 꼬리처럼 남는다. 정지 상태면 거의 겹쳐 보이므로 시각 소음 없음 |
| **상실 잔영 (loss afterimage)** | 타겟 상실 시 마지막 bbox 를 1.5초 동안 점선(`[6,6]`)으로 남기며 alpha `.6→0`. 태그에 mono `놓침 · 다시 비춰 봐`. 게이지 감쇠 로직은 기존 그대로 |
| **진행 태그 (progress tag)** | 홀로 태그 내용 = `label · conf 87% · 공명 62%` (IBM Plex Mono 12px). 태그 아래 3px 진행 바(트랙 bone 15%, 채움 희귀도 잉크). 포획 링 단계에서는 `탭!` 으로 바뀐다 |
| **세션 추적 로그 (선택)** | `scan.js` 의 `S.trackLog` 에 최근 3개 `{label, best gauge, done}` 을 유지하고 hint-chip 아래 mono 한 줄 `최근: cup 62% · laptop ✓`. 세션 메모리만, 저장 안 함 |

### 1.3 기록으로 남기기
- 포획 시점의 bbox 를 **사진 좌표계 정규화 `[x,y,w,h]`**(0~1) 로 `addMoment({ ..., box })` 에 저장한다 (추가 필드, 없으면 무시 — 저장 스키마 호환).
- 발견 화면 `.card .photo` 위에 같은 윤곽을 `<svg class="etch">` 로 오버레이 (황동 1.5px, 코너 틱 4개, 둥근 사각). 사진 위 **글자**는 여전히 금지 — 선만.
- 앨범 상세와 공유 카드(`card.js` 캔버스 1080×1350) 에도 동일 윤곽을 그린다. `box` 가 없는 과거 추억은 그리지 않는다.
- 모션 줄이기: 잔상 궤적·번쩍은 끄고, 각인 윤곽·태그·잔영은 유지.

### 1.4 상수
`src/ui/staging.js` 의 `SILHOUETTE = { trailEveryMs: 80, trailLen: 12, lossLingerMs: 1500, tickAt: [0.25, 0.5, 0.75, 1], snapFlashMs: 120 }`. BALANCE 에는 넣지 않는다(시뮬레이션이 아니라 연출).

---

## 2. 액션 연출 (Action Staging) — "의도 → 결과가 한 호흡으로 읽히게"

game-feel 원칙: 먼저 측정(현재 v2 계약의 response_chain), 약한 고리 하나에 연출 하나, 입력을 막지 않기, 모션 줄이기 대체 채널 유지.

| 이벤트 | 연출 (모두 오버레이/CSS, 로직 불변) | 지속 |
|---|---|---|
| **잠금 (target acquired)** | 뷰파인더 브래킷 4개가 화면 모서리에서 bbox 코너로 수렴(`--ease-out`), 도착 시 tick 1회 | 120ms |
| **공명 상승** | 각인 윤곽 채움 + 50%·100% 에서 bbox 중심에서 얇은 링 1개가 퍼진다 (Bone 25%, 1px) | 300ms |
| **포획 링 등장** | 80ms 동안 오버레이가 bbox 밖을 40% 어둡게(스포트라이트) — 비디오는 계속 재생, 입력은 열려 있음. 링은 기존 로직대로 줄어든다 | 유지 |
| **PERFECT** | ① 90ms 프리즈 프레임(마지막 비디오 프레임을 캔버스에 고정) + 줌 펀치(`.overlay-wrap` scale 1.06 → 스프링 복귀, transform-origin = bbox 중심) ② bbox 중심에서 황동 스피드라인 16개(200ms, transform/opacity 만) ③ 실루엣이 황동으로 번쩍 후 도장 찍히듯 scale 1.15→1 실선 고정, 등급 버스트 텍스트(기존, Fraunces 700) | 총 ≤ 480ms |
| **GREAT / GOOD** | 같은 3박자, 줌 1.03 / 스피드라인 8개 / 번쩍 없음 | ≤ 360ms |
| **MISS (달아남)** | 실루엣이 화면 중심 반대 방향으로 60px 튀어 나가며 잔상 3장(모션 스트릭) 남기고 fade, 화면 가장자리에 Ember 비네트 120ms, 기존 denied 톤·햅틱·"놓쳤어" 대사 | 300ms |
| **정령 포획** | 팝 링(verdigris 1px 확장) + 스파크 6개 + 기존 float 텍스트 | 250ms |
| **발견(희귀 3성↑/변이체)** | 기존 서스펜스 오브 + 드럼롤 앞에, **포획 실루엣을 황동 윤곽으로 화면 중앙에 먼저 띄운 뒤** 카드가 그 자리에서 뒤집혀 나온다 — 실루엣이 보상으로 이어진다 | +400ms |

- 구현 위치: 새 모듈 `src/ui/staging.js` (상수 `STAGING` + `stageLockOn / stageCapturePunch / stageMiss / stageSpiritPop` 함수). `scan.js` 는 이벤트 지점에서 호출만 한다. `reveal.js` 는 서스펜스 전 실루엣 표시만 추가.
- 입력 정책: 프리즈·줌은 시각 전용. 탭은 언제나 즉시 처리(기존 계약 유지). 스포트라이트가 spirits 탭을 가리면 안 됨(스포트라이트는 pointer-events 없음).
- 모션 줄이기: 프리즈·줌·스피드라인·스트릭·비네트 OFF, 도장 고정·텍스트·톤·햅틱 유지.
- 성능: 스피드라인·스트릭은 캔버스 한 패스, 오브젝트 풀 재사용, 60Hz 한 프레임 안. 새 DOM 요소는 `.overlay-wrap` 1개뿐.

---

## 3. 아이 게이지·핵심 기능 정밀도 QA (Precision QA)

목표: "감으로 되는 것 같다"를 "숫자로 확인했다"로 바꾼다. 헤드리스 브라우저(390×844, `?debug`)에서 **상태 주입 → 전이 검증** (probing-web-game-mechanics 방식) + 콘솔/크래시 스모크.

### 3.1 디버그 훅 (dev 전용, `?debug` 일 때만)
`window.__scan` 에 추가: `injectDetection(det|null)` (감지 루프가 이 값을 우선 사용), `setGauge(v)`, `injectGaze(sample|null)` (시선 어댑터 대신 `{gx,gy,open,present}` 를 주입; `undefined` 로 복구), `eye()` (시선 게이지 상태 `{fill, point, target, jitter, present}`), `calibrate()` (현재 시선을 화면 중앙으로 보정), `trail()` (링 버퍼 스냅샷), `staging` (연출 상수). 프로덕션 빌드에서 동작 변화 없음.

### 3.2 검사 항목과 합격 기준

| 기능 | 주입 | 확인 | 합격 |
|---|---|---|---|
| 타이밍 링 등급 | 링 반지름 0.30 / 0.36 / 0.46 / 0.60 / 0.90 에서 pointerdown | 등급이 PERFECT / PERFECT / GOOD / GOOD / MISS 로 단조 | 경계값 ±0.01 에서 뒤집히지 않음, 3회 반복 동일 |
| 터치 지연 보정 | `event.timeStamp` 를 프레임보다 40ms 앞당겨 주입 | 등급 산정이 이벤트 시각을 쓰는지(프레임 시각이 아닌지) | 40ms 지연이 등급을 한 단계 떨어뜨리지 않음 — 아니면 `capture.js` 에 timeStamp 기반 반지름 역산 1줄 추가(인과 변수 1개) |
| 잠금 히스테리시스 | 두 감지(cup .82 ↔ bottle .80)를 프레임마다 번갈아 주입 | 잠금 라벨이 흔들리지 않음 | 400ms 동안 전환 ≤ 1회. 흔들리면 잠금 유지 조건(연속 N프레임 또는 신뢰도 차 ≥ .1)을 detectLoop 에 추가 |
| 상실·복귀 | 감지 → null 1.2s → 감지 | 게이지가 감쇠 후 이어서 차는지, 잔영이 1.5s 후 사라지는지 | 기존 BALANCE 감쇠 그대로, 잔영 타이밍 ±100ms |
| 스크래치 | 포인터 드래그 경로 주입(면적 30% / 60%) | 60% 에서 공개, tapOnly(모션 줄이기) 에서는 탭 1회 공개 | 임계값이 코드 상수와 일치 |
| 정령 탭 | 정령 좌표 ±20px / ±60px 탭 | 반지름 안만 포획 | 히트 반지름이 정령 r×2 이상 44px 이하 |
| 시선점 매핑 | `injectGaze({gx:.5,gy:0,open:1,present:true})` / `gx:-.5` | `eye().point.x` 가 화면 중앙 ± `gazeGain`×(폭/2)×.5 로 이동(스무딩 후 200ms 안 수렴), 부호가 전면 카메라 미러 기준으로 맞음 | 오차 ≤ 8px, 좌우 부호 정확 |
| 보정 | 시선 `gx:.2` 주입 후 `calibrate()` | 이후 `gx:.2` 가 화면 중앙(±4px)으로 매핑 | 오프셋 저장·복구 |
| 시선 홀드(포획) | 포획 링 활성 + 감지 주입 + 시선점을 타겟 박스 안에 고정 | `eye().fill` 0→1 이 `BALANCE.eye.holdMs`(900ms) ±50ms, 도달 즉시 finish 1회 | 타이밍 오차 ≤ 50ms, finish 중복 없음 |
| 시선 지터 등급 | 홀드 동안 시선점을 7 / 9 / 17 / 19px 진폭으로 흔들어 주입 | 등급 PERFECT / GREAT / GREAT / GOOD (`steady` 8/18px) | 경계 ±1px 에서 뒤집히지 않음, 3회 반복 동일 |
| 눈 감음·얼굴 없음 | `open:.2` 또는 `present:false` | 시선점 없음 → 눈이 중앙에서 흐려지고 fill 이 `decayPerS` 1.5/s 로 감쇠(.8→0 ≈ 533ms), 힌트 `얼굴이 보이지 않아요` | 오차 ≤ 60ms |
| 정령 시선 | 정령을 시선점에서 59px / 61px 에 스폰 | 59px 는 600ms 뒤 포획, 61px 는 미포획 | 반지름 = `spiritRadiusPx` 60px 정확 |
| 탭·시선 경합 | fill .95 상태에서 탭 주입 | 탭 등급으로 finish 1회, 눈은 리셋 | finish 1회만 |
| 아이 게이지 OFF | `settings.eyeGauge=false` | 얼굴 모델 미로드, 조준점 미표시, 탭 링만 | 상태 전이 없음, 네트워크 요청 없음 |
| 자이로 | (헤드리스 불가) | 코드 리뷰: 권한 요청 iOS 경로, 각도 차 계산 래핑(±180) | 리뷰 통과 |
| 모션 줄이기 | `state.settings.reduceMotion=true` | 잔상·프리즈·줌·스피드라인 미실행, 각인·태그·텍스트 유지 | 스크린샷 + 코드 |
| 스모크 | 전 라우트 순회 + 3회 포획 | 콘솔 오류 0, 메모리 증가 없음(트레일 버퍼 상한) | 오류 0 |

### 3.3 결과물
- `docs/qa/v7-precision.md`: 표의 각 행에 대해 주입값·관측값·판정·(있다면) 고친 인과 변수 1개.
- `docs/screens/v7-*.png`: 스캔(각인 50%·100%), 포획 PERFECT 연출 중간 프레임, MISS 잔상, 발견 실루엣, 앨범 상세 윤곽, 아우라 스킨 2종, 아이 게이지 드웰·임팩트.
- `docs/game-feel-contract.json` 을 v3 으로 갱신(변경한 응답 체인·이벤트 채널·접근성 대체 채널).

---

## 4. VFX 패킷 — 추적 명암 · 아우라 스킨 · 제스처 임팩트 (game-vfx 방식)

game-vfx 원칙: 파티클보다 **전달할 의미**가 먼저. 한 레이어만 주인공, 나머지는 보조. 풀링·프레임당 할당 0·60Hz 안. 계약서는 [vfx/aura-tracking.json](vfx/aura-tracking.json), [vfx/eye-impact.json](vfx/eye-impact.json) (검증기 통과 필수).

### 4.1 추적 명암 (Tracking Shade) — "지금 이 물건을 렌즈가 붙잡고 있다"
| 항목 | 사양 |
|---|---|
| 의미 | 검출된 오브젝트가 **밝게 떠오르고** 주변은 **살짝 가라앉는다**. 쉐입(각인 윤곽, 1절)과 명암이 함께 "추적 중"을 말한다 |
| 레이어 | ① 바깥 어둠: bbox 를 뺀 전체에 `rgba(15,20,30, 0.10 + gauge*0.15)` 채움 (even-odd 경로 1회) ② 안쪽 빛: bbox 중심 라디얼 그라데이션(`rgba(237,230,214,.14)`→0), gauge 에 비례해 반경 확장 ③ 각인 윤곽(1절) |
| 위상 | idle(없음) → tracking(①② 페이드인 160ms) → charged(gauge 1: ② 한 번 맥동 300ms) → capture(스포트라이트 2절과 합쳐져 바깥 어둠 0.4) |
| 예산 | draw call 2, 파티클 0, blur 0 |
| 모션 줄이기 | ① ② 유지(정적), 맥동 없음 |

### 4.2 아우라 스킨 (Aura Skins) — 오브젝트별 장착 가능한 연출
| 항목 | 사양 |
|---|---|
| 의미 | 원더마다 "그 원더가 내뿜는 기운"이 다르다. 챕터별 기본 아우라가 있고, 플레이어는 상점에서 스킨을 사서 **원더별로** 또는 **전체 기본**으로 장착한다 |
| 모듈 | `src/ar/auras.js` — `AURAS` 레지스트리, `auraFor(label,{variant})` 해석, `createAura(id)` 풀링 이미터, `drawTrackingShade(...)` (4.1) |
| 스킨 5종 | `ember` 잔불(황동 불씨 상승, 기본·무료) · `verdigris` 녹청 안개(청록 입자 서행, ✨150) · `orbit` 궤도(얇은 링 2개 교차 회전, ✨220) · `ink` 먹번짐(그림자 맥동, ✨260) · `prism` 프리즘(장미빛 파편, ✨400 · 변이체는 기본 장착) |
| 기본 매핑 | desk→orbit, kitchen→ember, home→ink, street→ember, living→verdigris, play→verdigris, 변이체→prism. 미보유 스킨도 **기본 매핑으로는 보인다**(스킨 구매는 "바꿀 권리") |
| 상태(추가 필드) | `state.auraSkins:['ember']`(보유), `state.auraSkin:null`(전체 덮어쓰기), `state.auraByLabel:{}`(원더별). `load()` 의 배열/객체 기본값 병합에 포함. 저장 키 불변 |
| 장착 UI | 도감 상세(보유 원더) 에 "아우라" 칩 행: 보유 스킨만 선택 가능, 선택 즉시 저장 + blip. 상점에 "아우라 스킨" 섹션(2열 카드, 미리보기 = 32px 캔버스 루프 1개) |
| 이미터 | 스킨당 최대 48 파티클 풀, gauge 에 비례해 활성 수 증가(4 → 48), 프레임당 할당 0, 색은 스킨 팔레트 2색 + 희귀도 잉크 |
| 위상 | tracking(입자 4~12) → charged(48, 궤도 반경 수축) → capture(정지 후 포획 펀치와 함께 바깥으로 흩어짐 250ms) → cancel(상실 시 400ms 페이드, 풀 반환) |
| 예산 | 파티클 ≤ 48, draw call ≤ 3, blur 0 (glow 는 alpha 로만) |
| 모션 줄이기 | 이미터 OFF, 대신 정적 아우라 링 1개(스킨 색, 1px) |

### 4.3 아이 게이지 임팩트 (Eye Impact) — "눈이 열렸다"를 크게
| 항목 | 사양 |
|---|---|
| 의미 | 드웰이 완성되어 눈이 **깜빡이며** 행동이 확정되는 순간을 탭보다 강하게 알린다. 드웰 중에는 눈의 홍채 링이 채워져 "곧 발동"을 예고한다 |
| 드웰 피드백 | 조준점 = 루페의 눈(아몬드 윤곽 Bone 1.5px). 홍채 링(황동)이 `eye().fill` 만큼 차오른다. 대상이 없으면 눈 전체 alpha .35 |
| 발동 연출 | ① 눈꺼풀 깜빡(위·아래 눈꺼풀 닫힘→열림 180ms) ② 조준점에서 충격파 링 2개(황동, 1.5px, 0→90px, 360ms, 두 번째 +60ms) ③ 방사 스파크 12개(황동/Bone, 240ms, 감속 페이드) ④ HUD 눈 배지 `.eye-hud.impact`(scale 1.3→1 스프링) ⑤ 화면 가장자리 황동 플래시 180ms(`.eye-flash`) ⑥ 햅틱 `[20,40,60]`, `fx.comboTone(3)` |
| 대상별 색 | 원더 포획 황동, 정령 포획 녹청(황금 정령은 프리즘) |
| 예산 | 파티클 ≤ 12, draw call ≤ 3, DOM 클래스 토글 2개 — [vfx/eye-impact.json](vfx/eye-impact.json) |
| 모션 줄이기 | 깜빡·링·스파크·플래시 OFF, 배지 굵게 + 텍스트 + 햅틱 + 톤 유지 |
| 정밀도 | 발동은 5절 규칙(드웰 시간·감쇠·반지름) 그대로. 발동 후 400ms 재무장 금지(같은 대상 연속 발동 방지) |

### 4.4 인수 기준
- 두 VFX 계약서(`vfx/aura-tracking.json`, `vfx/eye-impact.json`)가 `python3 ~/.claude/skills/game-vfx/scripts/validate_vfx_spec.py` 를 통과한다.
- 헤드리스 QA 에서 아우라 파티클 수가 48 을 넘지 않고(`window.__scan.aura().count`), 상실 후 400ms 안에 0 이 된다.
- 스크린샷: `v7-10-aura-ember.png`, `v7-11-aura-orbit.png`, `v7-12-eye-impact.png`, `v7-13-tracking-shade.png`, `v7-14-eye-dwell.png`.
- `npm run build` 통과 후 커밋·`git push origin main`.

---

## 5. 아이 게이지 (Eye Gauge = 시선 추적) — 제스처(MediaPipe 손·얼굴 표정) 대체

### 5.1 개념
전면 카메라(모바일 셀피 모드) 또는 웹캠(행사용 노트북)이 **플레이어의 얼굴과 손에 든 물건을 동시에** 본다. FaceLandmarker 의 눈 블렌드셰이프(`eyeLookIn/Out/Up/Down`)와 머리 자세(변환 행렬)로 **시선 방향**을 추정하고, 화면 위의 **시선점**으로 매핑한다. 화면 위 루페의 눈(조준점)이 시선점을 따라 움직이고, 시선점이 대상(원더 박스·정령) 위에 머무르면 홍채 링이 차오르며, 다 차면 깜빡이며 발동한다. 손 제스처(GestureRecognizer)와 얼굴 표정 이벤트(깜빡임·입·눈썹·미소)는 제거한다.

### 5.2 규칙 (시뮬레이션 — `BALANCE.eye` 추가, 다른 BALANCE 값 불변)
```js
BALANCE.eye = { holdMs: 900, spiritHoldMs: 600, decayPerS: 1.5, gazeGain: 1.4, headGain: 0.6, smoothK: 8,
                openMin: 0.5, boxPad: 0.2, minHitPx: 44, spiritRadiusPx: 60, steady: { PERFECT: 8, GREAT: 18 }, jitterEmaK: 6, rearmMs: 400 }
```
| 대상 | 조건 | 홀드 | 발동 |
|---|---|---|---|
| 원더 (포획 링 활성 `S.mode === 'capture'`) | 시선점이 스무딩된 타겟 박스(양쪽 `boxPad` 20% 확장, 최소 `minHitPx` 44px 반경) 안 | `holdMs` 900ms | 포획 `finish(grade)`. **등급 = 홀드 동안 시선점의 흔들림**(프레임 간 이동량 EMA px, `jitterEmaK`): `steady.PERFECT` 8px 이하 PERFECT, `steady.GREAT` 18px 이하 GREAT, 그 외 GOOD. MISS 없음 — 흔들리면 등급이 내려간다 |
| 정령 | 정령 중심이 시선점 `spiritRadiusPx` 60px 안 (`!popped && alpha > .3`) | `spiritHoldMs` 600ms | 정령 포획(기존 `catchSpirit`, 황금이면 프리즘) |
| 시선 없음 | 얼굴 미검출, 눈 감음(`open < openMin`), 모델 미로드 | 감쇠 `decayPerS` 1.5/s | 눈이 닫히고 중앙에서 흐려짐 + 힌트 |
- **시선점 계산** (`src/scanner/gaze.js` 어댑터): `gxEye = ((eyeLookOutRight − eyeLookInRight) + (eyeLookInLeft − eyeLookOutLeft)) / 2`, `gyEye = ((eyeLookDown*2 − eyeLookUp*2) 평균)`; 머리 요/피치(행렬에서 추출, 라디안/0.5 로 정규화) × `headGain` 을 더한다. 전면 카메라는 미러 표시이므로 화면 x 부호를 그에 맞춘다(후면 카메라에서는 시선 추적을 켜지 않는다). 화면점 = 중앙 + (gx − cal.gx) × `gazeGain` × 폭/2, y 도 같은 식. `smoothK` 로 지수 스무딩. 추론 주기 66ms(15Hz), GPU delegate, 모델·WASM 은 CDN(기존과 동일), `settings.eyeGauge` 가 켜지고 전면 카메라일 때만 동적 import.
- **보정**: 스캔 화면 눈 배지를 탭하면 "가운데 점을 보고 다시 탭" → 현재 gx,gy 를 `state.eyeCal = {gx,gy}` 로 저장(추가 필드). 보정 전에는 0,0.
- **탭 링과 공존**: 포획 단계에서 탭이 먼저 오면 탭 등급(기존 `capture.tap`), 눈이 먼저 열리면 눈 등급. 둘 중 하나만 `finish`. `settings.autoCapture` 는 그대로.
- **재무장**: 발동 후 `rearmMs` 400ms 동안 같은 대상 재발동 금지.
- **설정**: `settings.eyeGauge` (기본 `true`). 켜져 있고 전면 카메라면 얼굴 모델을 로드하고 눈 조준점을 그린다. 후면 카메라·사진 폴백에서는 눈이 숨고 탭만 동작하며, 힌트 `전면 카메라에서 시선 추적이 켜져요`.
- **모듈 분리**: `src/scanner/gaze.js` = 얼굴 모델 → 샘플 `{gx, gy, open, present, yaw, pitch}` (DOM·캔버스 없음, 실패 시 null). `src/scanner/eye.js` = 순수 게이지 `createEyeGauge(BALANCE.eye)` → `update({ now, dt, sample, cal, cw, ch, targetBox:[X,Y,W,H]|null, mode, spirits:[{id,x,y,golden}], enabled })` 가 `{ fill, point:{x,y}|null, present, target: null|{type:'wonder'|'spirit', id}, fired: null|{type,id,grade}, jitter }` 를 돌려준다. 순수 함수 스타일이라 노드에서 단위 검증 가능하고, QA 는 `injectGaze` 로 샘플을 주입한다.

### 5.3 표시 (staging.js)
`drawEyeReticle(x, { cx, cy, fill, target, present, blink /*0..1|null*/, reduceMotion })`: 시선점 위치에 아몬드 눈 윤곽(Bone 1.5px, 폭 56px) + 홍채 링(황동, fill 비율, 4px) + 동공(잉크). `present` 가 아니면 화면 중앙에 alpha .35 + mono 힌트. 발동 시 눈꺼풀 깜빡(180ms, reduceMotion 이면 생략) → 4.3 임팩트.

### 5.4 제거·변경 목록
- `src/scanner/gesture.js` 삭제 → `src/scanner/gaze.js` 신설(FaceLandmarker 만, `outputFaceBlendshapes` + `outputFacialTransformationMatrixes`). `@mediapipe/tasks-vision` 의존성은 유지(얼굴 모델용), GestureRecognizer 모델 URL 제거.
- `scan.js`: 제스처 import·HUD(`#gest`, `#gestBtn`)·`gestureAction`·`startGestures/stopGestures`·손 포인터 제거. 눈 배지(`.eye-hud`: 눈 아이콘 + `시선 ON/OFF` + 보정) 추가. 손 제스처가 맡던 **촬영(record)·스냅(snap)** 은 컨트롤의 아이콘 버튼(`film`, `camera`)으로 남긴다.
- `state.js` `settings`: `gestures`, `faceControl` → `eyeGauge: true`; 최상위에 `eyeCal: null` 추가(저장된 옛 키는 무해). 프로필 설정 행 두 개 → "아이 게이지(시선 추적)" 한 행 + "시선 보정 초기화" 버튼.
- 문서: HISTORY/PRD/README 의 제스처 항목을 "아이 게이지(시선 추적)로 대체"로 갱신.

---

## 6. 카메라 퍼스트 (Camera-first) — 단순 촬영 · 녹화 · 베스트 포토 · 인터랙티브 앨범

### 6.1 프레이밍
이 제품은 **카메라 앱**이고, 그 위에 정교한 게임 레이어(원더 잠금·공명·포획·도감)가 자동으로 얹힌다. 스캔 화면은 곧 카메라다. 사진·영상은 원더가 없어도 찍히고 앨범에 남으며, 앨범은 갤러리 앱처럼 꺼내고(내보내기) 고치고(편집) 나누는(공유) 곳이다.

### 6.2 카메라 화면 레이아웃 (`scan.js`, 390×844)
| 영역 | 내용 |
|---|---|
| 상단 | 기존 HUD 칩(Lv·도감·별가루·의뢰), 그 아래 힌트 칩 + `.track-log` |
| 중앙 | 카메라 풀블리드 + 오버레이(실루엣·명암·아우라·눈 조준점) |
| 루페 | 한 줄 말풍선(`.bubble.compact`, 말줄임, 탭하면 펼침) — 시야를 가리지 않는다 |
| 하단 엄지 영역 `.cam-bar` | 좌 `.cam-thumb`(마지막 촬영 썸네일 44px, 탭 → 앨범) · 중앙 `.shutter`(72px 원, Bone 링 2px + 황동 내부 원; **탭 = 사진**, **길게(≥350ms) = 녹화 시작**, 녹화 중 탭 = 정지; 녹화 중 `.shutter.rec` 내부가 Ember 사각으로 바뀌고 옆에 mono 경과 `00:07`) · 우 `flip` 44px |
| 보조 행 `.cam-tools` | `image`(사진 파일로 스캔) · `codex` · `home` · 눈 배지 `.eye-hud`(시선 ON/OFF·보정) — 각 44px, `.cam-bar` 위 8px |

### 6.3 촬영 규칙
- **사진(탭)**: 프레임 버퍼(최근 400ms, ≤4프레임, 640px)에서 **베스트 포토** 1장 → `addMoment({ kind:'photo', label: S.lock ?? S.target?.label ?? null, box, alts })`. 연출: Bone 플래시 120ms + 셔터음 `fx.shutter()`(2단 클릭, 신규) + 햅틱 `[15]` + 썸네일이 `.cam-thumb` 로 날아가는 250ms 애니. 원더가 잠겨 있으면 라벨만 태그된다 — **도감 등록·보상은 없다**(그건 공명 포획의 몫).
- **영상(길게)**: `recorder.start(video, overlay, { raw: !state.settings.recordOverlay, maxMs: 30000 })`. 원본 스트림(raw) 또는 오버레이 합성(설정). mono 경과, 30초 자동 정지. 정지 → `addMoment({ kind:'video', clip, clipType, duration, poster })`.
- **원더 포획(자동, 기존)**: 공명→링→등급 로직 불변. 포획 사진 = 공명 60%~포획 사이 버퍼(≤8프레임)의 베스트 포토, `alts` 최대 3장(240px) 저장 → 발견 화면에서 교체 가능.
- **사진 폴백**(`S.source === still`)에서도 셔터가 동작한다(정지 이미지 저장; 헤드리스 QA 경로). 녹화는 캔버스 캡처로 폴백.

### 6.4 베스트 포토 점수 (`src/camera/frames.js`)
`score = 0.5·conf + 0.35·sharpNorm + 0.15·center` — `sharp` = 64px 그레이스케일 라플라시안 분산, `sharpNorm` = 버퍼 내 min-max 정규화(단일 프레임이면 1), `center` = 1 − (박스 중심↔프레임 중심 거리 / 대각선), `conf` 없으면 0.5. 결정적(같은 입력 → 같은 선택). `createFrameBuffer({ maxFrames, everyMs, size })` → `push(source, now, { conf, box })`, `frames()`, `best()`, `recent(ms)`, `clear()`; 캔버스 풀 재사용, 프레임당 할당 0.

### 6.5 데이터 모델 (`media.js`, 추가 필드만 — 기존 추억 호환)
`kind: 'wonder'|'photo'|'video'`(없으면 'wonder'), `label: string|null`, `box`, `alts: Blob[] ≤3`, `duration: ms`, `poster: Blob`(영상), `edited: boolean`. `listMoments({ kind, fav, friend, perfect, clip })`. 용량 정책은 기존(오래된 것부터, 즐겨찾기 제외) + 영상은 최근 10개 상한. `exportMoment(m)` → `{ blob, filename }`(사진 JPEG 원본 / 영상 webm·mp4).

### 6.6 앨범 인터랙션 (`album.js`)
| 요소 | 동작 |
|---|---|
| 필터 칩 | 전체 · 사진 · 영상 · 원더 · 퍼펙트 · 즐겨찾기 · 친구 |
| 격자 | 영상 = `film` 배지 + 길이 mono; 사진(원더 없음) = `camera` 아이콘; 원더 = 글리프. 3열, 스태거 |
| 상세 `.detail-swipe` | 좌우 스와이프로 이전/다음(포인터 드래그 translateX + 스프링 스냅, 40px 임계, 세로 스크롤과 구분), 더블탭 즐겨찾기, 영상은 `<video controls playsinline>` + 포스터 |
| 액션 4개(큰 버튼, 엄지 영역) | **꺼내기**(`exportMoment` → Web Share files, 폴백 다운로드) · **수정하기**(다듬기 시트: 캡션·필터·프레임 라이브 프리뷰 + "스킬 에디터" 진입; 저장 시 `edited:true`, 원본 보존) · **공유하기**(시트: 카드 / 원본 / 클립 / 콜라주) · **더보기**(다른 컷 고르기 = `alts` 교체 · 대결 · 선물 · 삭제) |
| 삭제 | 낙관적 제거 + 5초 실행 취소 토스트(`.toast.undo`) |
| 선택 모드 | 길게 누르기 → `.select-mode`, 체크 표시, 하단 바: 꺼내기(순차) · 삭제(실행 취소) · 취소 |
| 피드백 | 모든 액션에 blip + 1.6s 토스트, 낙관적 갱신, 스켈레톤 없음 |

### 6.7 발견 화면 (`reveal.js`)
카드 사진 아래 `.burst-strip`: 베스트 포토(체크) + 대안 ≤3 썸네일. 탭 → 카드 사진 교체 + `updateMoment`(사진·썸네일 교체, `alts` 재배열). 실루엣 윤곽(1.3절)은 교체 후에도 같은 `box` 로 그린다.

### 6.8 타이틀·탭
타이틀 CTA = **카메라 열기**(`camera`). 탭 순서 = 카메라 · 앨범 · 도감 · 의뢰 · 프로필. 타이틀에 마지막 촬영 썸네일 행(최근 3장, 탭 → 앨범 상세).

### 6.9 설정 (`settings`, 추가 키)
`recordOverlay:false`(오버레이 합성 녹화), `shutterSound:true`, `bestPhoto:true`(끄면 탭 순간 프레임).

### 6.10 CSS 계약 (`styles.css` 끝 v7 섹션, mobile-shell 이 작성)
`.cam-bar .cam-thumb .shutter .shutter.rec .shutter .rec-time .cam-tools .eye-hud .eye-hud.impact .eye-flash .bubble.compact .burst-strip .burst-strip img.on .detail-swipe .detail-actions .select-mode .mom.selected .select-bar .toast.undo .share-sheet .thumb-row`

### 6.11 인수 기준 (헤드리스 + 실기기 메모)
- 사진 폴백에서 셔터 탭 → 앨범 count +1, `kind:'photo'`, `label:null` 허용, 썸네일 표시.
- 셔터 길게 → 캔버스 녹화 시작(`.shutter.rec`, 경과 표시) → 탭 정지 → `kind:'video'` 저장 + 앨범 격자에 `film` 배지. 원본 스트림 녹화는 실기기 항목.
- 베스트 포토 결정성: 같은 프레임 3회 push → 같은 선택; 흐린 프레임(블러 처리) vs 선명 프레임 → 선명 선택.
- 앨범 상세 스와이프(포인터 이벤트 주입 −80px) → 다음 추억; 꺼내기 → `a[download]` 클릭 관측; 삭제 → 실행 취소로 복구; 선택 모드 2장 삭제.
- 스크린샷: `v7-20-camera.png`, `v7-21-album-mixed.png`, `v7-22-album-detail-actions.png`, `v7-23-select-mode.png`, `v7-24-reveal-burst.png`.

---

## 7. 위치 기반 추천 (Google Places) — 주변 촬영지 · 기믹

### 7.1 원칙
- **옵트인**: 위치는 플레이어가 "주변 촬영지 찾기"를 탭할 때만 `navigator.geolocation` 으로 요청한다. 설정 `settings.location`(기본 `false`) 이 켜져야 자동 새로고침(타이틀 진입 시 1시간 캐시)을 한다.
- **키 게이팅**: `import.meta.env.VITE_GOOGLE_MAPS_KEY` 가 있으면 Google Places API(New) Nearby Search, 없으면 OpenStreetMap **Nominatim**(경계 상자 검색) 폴백, 그다음 Overpass, 모두 실패하면 "위치 없이도 게임은 그대로" 카드. 키는 HTTP 리퍼러 제한(`wonderscanner.vercel.app/*`, `localhost:*`)을 걸어 쓴다(`docs/CLOUD_SETUP.md` 에 절차).
- **저장 최소화**: `state.geo = { at, lat, lng, spots }` — 좌표는 소수점 3자리(≈100m)로 반올림, 1시간 뒤 만료. 서버 전송 없음(클라우드 어댑터에도 올리지 않는다).
- **프레임 밖으로 나가지 않는 원칙 유지**: 카메라 프레임은 여전히 기기 밖으로 나가지 않는다. 위치만 Places 에 보낸다.

### 7.2 모듈
| 파일 | 역할 |
|---|---|
| `src/geo/provider.js` | `nearby({lat,lng,radius=800})` → `Spot[]`; `google` → `nominatim` → `overpass` → `[]` 순서로 폴백, 반경×1.6 밖은 제외. `Spot = { id, name, types:[...], lat, lng, dist_m, bearing_deg, mapsUrl }` |
| `src/geo/nominatim.js` | 키 없는 1차 폴백. 경계 상자(`bounded=1&viewbox`) 검색을 카테고리(cafe·park·station·restaurant·library·playground·supermarket·bakery)별로 **1초 간격 순차** 호출, 14건이면 조기 종료, 전체 8초 데드라인. 2026-09-23 실측: 서울시청 반경 800m 에서 20곳 / 2.7초. (Overpass 공개 미러는 406·429·타임아웃이 잦아 최후 폴백으로 강등) |
| `src/geo/google.js` | Places API (New) `POST https://places.googleapis.com/v1/places:searchNearby`, 헤더 `X-Goog-Api-Key`, `X-Goog-FieldMask: places.id,places.displayName,places.types,places.location`, `includedTypes` 는 7.3 매핑의 키 목록, `maxResultCount 20`, `languageCode 'ko'` |
| `src/geo/osm.js` | Overpass `https://overpass-api.de/api/interpreter` 에 `amenity/leisure/shop/tourism` 노드 쿼리(반경 800m, 타임아웃 8s), 결과 20개 상한 |
| `src/game/spots.js` | 장소 유형 → 챕터·원더·기믹 매핑(7.3), `recommend(spots)` → `{ spots: 상위 5, gimmick }`, 거리·방위 계산(하버사인), `mapsUrl` = `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` (키 불필요) |
| `src/ui/screens/spots.js` | 라우트 `spots` "주변 촬영지": 위치 버튼 → 스켈레톤 → 카드 목록. 카드 = 장소명(Gowun Batang) · mono `320m · 북동` · 챕터 엠블럼 · "여기서 찍을 수 있는 원더" 글리프 3개 · 기믹 배지 · 버튼 2개(지도 열기 `globe` / 카메라 열기 `camera`) |
| 진입점 | 타이틀에 "근처 촬영지" 카드(캐시가 있으면 상위 1곳 + 기믹 요약, 없으면 "찾기" 버튼), 의뢰 화면 상단 섹션, 프로필 설정 `location` 토글. 아이콘 `pin`(신규, icons.js 에 추가) |

### 7.3 장소 유형 → 챕터 · 원더 · 기믹 매핑 (`SPOT_RULES`)
| 유형(Google / OSM) | 챕터 | 추천 원더 | 기믹 (활성 30분, 별가루·정령 배율은 `eventMod` 와 같은 경로) |
|---|---|---|---|
| `cafe`, `coffee_shop`, `bakery` / `amenity=cafe` | kitchen | cup, cake, donut, sandwich | **커피 시간**: 부엌 원더 별가루 ×2 |
| `restaurant`, `food_court` / `amenity=restaurant` | kitchen | pizza, bowl, fork, wine glass | **만찬**: 부엌 원더 XP ×1.5 |
| `park`, `playground`, `dog_park` / `leisure=park\|playground` | play·living | frisbee, kite, sports ball, dog | **산책**: 정령 출몰 ×2 |
| `zoo`, `aquarium` / `tourism=zoo` | living | elephant, zebra, giraffe, bird | **사파리**: 살아있는 신비 변이체 확률 ×2 |
| `beach`, `marina` / `natural=beach` | play | surfboard, boat, umbrella | **파도**: 놀이 원더 XP ×1.5 |
| `library`, `book_store` / `amenity=library` | desk | book, laptop, clock | **정독**: 책상 원더 별가루 ×2 |
| `bus_station`, `train_station`, `transit_station` / `highway=bus_stop` | street | bus, train, traffic light, bicycle | **거리의 거인들**: 거리 원더 공명 +50% |
| `shopping_mall`, `supermarket` / `shop=*` | home·kitchen | handbag, bottle, banana, apple | **장보기**: 원더 3종 스팟 도전 → ✨100 |
| `gym`, `stadium` / `leisure=sports_centre` | play | sports ball, baseball bat, tennis racket | **운동장**: 놀이 원더 별가루 ×2 |
| 그 외 | closestChapter() | 챕터 부족분 상위 3 | 없음 |

- 기믹은 `state.geo.gimmick = { id, until, mod }` 로 저장되고, `companion.js` 의 `eventMod(key, ctx)` 가 사건 보정치와 **곱**한다(기존 사건 로직 불변, 추가 곱만). 루페가 진입 시 한 줄 안내(`advise` 규칙 1개 추가: 기믹 활성 시 최우선 다음 순위).
- **스팟 도전**: `state.geo.challenge = { spotId, labels:[3], done:[] }` — 캐시된 스팟 반경 150m 안에서 해당 라벨 포획 시 진행, 3/3 이면 ✨100 + 토스트. 위치 재확인은 포획 시 1회(`getCurrentPosition`, 5s 타임아웃, 실패해도 게임은 진행).

### 7.4 인수 기준 (헤드리스: `navigator.geolocation` 과 `fetch` 를 주입/모킹)
- 키 없음 + Overpass 모킹 응답 → 카드 5개 렌더, 거리·방위 mono 표기, 기믹 배지 1개.
- 키 있음(모킹) → Google 경로 호출 헤더·필드마스크 검증.
- 두 API 모두 실패 → 폴백 카드 + 콘솔 오류 0.
- 위치 거부 → "위치 없이도 게임은 그대로" 카드 + 설정 안내, 재시도 버튼.
- 기믹 활성 상태에서 `eventMod('dust', {chapter:'kitchen'})` 이 2 를 반환, 30분 뒤 1.
- 스크린샷 `v7-30-spots.png`, `v7-31-title-spot-card.png`.
- `.env.example` 에 `VITE_GOOGLE_MAPS_KEY=`; `docs/CLOUD_SETUP.md` 에 "Places API 키 발급·리퍼러 제한" 절.

