# Design System: Wonder Scanner — 「황동 렌즈 탐험 일지」

> 이 문서는 Wonder Scanner의 **단일 디자인 기준(single source of truth)** 입니다.
> Google Stitch 화면 생성, 코드 구현, 아트 리소스 제작 모두 이 문서를 따릅니다.
> 세계관: 당신은 **원더 탐험가**. 렌즈에 깃든 안내 정령 **루페(Lupe)** 가 황동 모노클로
> 일상의 사물에 숨은 진짜 이름을 읽어 준다. 도감은 탐험가가 밤마다 적는 **관찰 일지**다.

---

## 1. Visual Theme & Atmosphere (분위기)

**한 줄:** 밤의 관측실에서 황동 렌즈로 들여다본 표본 일지. 종이는 오래된 뼈색, 잉크는 깊은 남색,
빛은 오직 황동 한 줄기.

- **밀도(Density) 6 / 10 — "Daily App Balanced"**: 도감·의뢰·프로필은 정보가 많다. 카드 남발 대신
  **장부 행(ledger row)** 과 hairline 구분선으로 밀도를 감당한다.
- **변주(Variance) 5 / 10 — "Offset Asymmetric"**: 타이틀 마스트헤드는 좌측 정렬, 루페의 쪽지는
  우측으로 살짝 밀린다. 중앙 정렬 히어로 금지.
- **모션(Motion) 7 / 10 — "Fluid CSS + 순간의 연출"**: 평소엔 절제된 스프링 이징. 발견(reveal)
  순간에만 플래시·흔들림·파티클을 허용한다.
- **재질 은유**: 잉크 플레이트(어두운 남색 판) 위에 **뼈색 활자**와 **황동 각인선**.
  카드는 "표본 플레이트(specimen plate)", 희귀도는 "잉크 도장(stamp)", 정령은 "청록 위습".
- **버린 것**: 시안→보라 네온 그라데이션, 유리 광택(glow), 이모지 아이콘, 시스템 기본 폰트.
  이것들이 이전 버전을 "AI가 만든 앱"처럼 보이게 했다.

---

## 2. Color Palette & Roles (색과 역할)

절대 규칙: **악센트는 황동 하나.** 순수 검정(#000000) 금지. 네온·보라 글로우 금지.
희귀도 색은 "악센트"가 아니라 **의미 상태색(semantic status ink)** 이며 채도 80% 미만으로 눌러 둔다.

### 2.1 잉크(배경) 계층

| 이름 | Hex | 역할 |
|---|---|---|
| **Observatory Ink** | `#0F141E` | 기본 캔버스. 모든 화면의 바닥 (`--ink-0`) |
| **Ink Plate** | `#161D2B` | 카드·시트·탭바·입력창 채움 (`--ink-1`) |
| **Raised Plate** | `#1E2736` | 눌리는 버튼(ghost)·호버 표면 (`--ink-2`) |
| **Pressed Plate** | `#273244` | active 상태·선택된 칩 (`--ink-3`) |

### 2.2 활자(텍스트) 계층

| 이름 | Hex | 역할 |
|---|---|---|
| **Bone** | `#EDE6D6` | 1차 텍스트, 제목, 원더 이름 (`--bone`) |
| **Faded Bone** | `#CFC7B4` | 2차 텍스트, 설정·설명 본문 (`--bone-2`) |
| **Pencil** | `#8F8A7C` | 3차 텍스트, 메타·타임스탬프·잠긴 항목 (`--mute`) |
| **Hairline** | `rgba(237,230,214,.10)` | 1px 구분선·카드 테두리 (`--line`) |
| **Hairline Strong** | `rgba(237,230,214,.18)` | 포커스 전 테두리·탭 활성 밑줄 (`--line-2`) |

### 2.3 악센트 — 황동 (단 하나)

| 이름 | Hex | 역할 |
|---|---|---|
| **Brass** | `#C99A3F` | 주 CTA 채움, 진행 바, 활성 토글 (`--brass`) — HSL 40°/56%/52%, 채도 80% 미만 |
| **Brass Light** | `#E2B45A` | 어두운 바탕 위 악센트 텍스트·아이콘·각인선 (`--brass-2`) |
| **Brass Ink** | `#1A1408` | 황동 위에 얹는 글자색 (`--brass-ink`) |
| **Brass Tint** | `rgba(201,154,63,.14)` | 강조 행 배경, 이벤트 카드 배경 (`--brass-soft`) |

### 2.4 희귀도 잉크 (semantic status — 악센트 아님)

| 등급 | 이름 | Hex | 세계관 근거 |
|---|---|---|---|
| ★ 일반 | **Iron** | `#9FA8B4` | 무쇠. 어디에나 있고 든든하다 |
| ★★ 희귀 | **Verdigris** | `#6DB5A0` | 구리 녹청. 시간이 지나야 드러난다 |
| ★★★ 영웅 | **Amethyst Ink** | `#A493D9` | 자수정 잉크. 채도 48%, 글로우 없이 사용 |
| ★★★★ 전설 | **Brass** | `#E2B45A` | 전설만이 악센트와 같은 빛을 낸다 |
| 변이체(프리즘) | **Prism Rose** | `#E39BC0` | 렌즈에 잘못 들어온 빛 |

희귀도 색은 **도장(stamp) 테두리, 시길(sigil) 아이콘, 표본 플레이트 1px 테두리, 진행 링**에만 쓴다.
배경 전체를 물들이거나 40px 이상의 글로우를 만들지 않는다. 발견 화면의 표본 플레이트에 한해
`opacity ≤ .35, blur ≥ 40px` 후광 1개를 허용한다 (그날의 유일한 축하 빛).

### 2.5 상태색

| 이름 | Hex | 역할 |
|---|---|---|
| **Ember** | `#D2706A` | 실패(MISS)·삭제·오류 텍스트 (`--danger`) |
| **Verdigris** | `#6DB5A0` | 성공·완료 체크 (`--ok`) — 희귀와 공유 |

### 2.6 레거시 토큰 별칭 (코드 호환)

기존 CSS·인라인 스타일이 참조하는 이름은 **별칭으로 유지**한다. 값만 바뀐다.

```css
--bg: var(--ink-0);  --bg2: var(--ink-1);  --ink: var(--bone);
--accent: var(--brass-2);  --accent2: var(--brass);  --gold: var(--brass-2);
--r-color / --r-glow : 런타임에 희귀도별로 세팅 (glow 알파 ≤ .35)
```

---

## 3. Typography Rules (활자)

| 역할 | 서체 | 사용처 | 규칙 |
|---|---|---|---|
| **Display (Latin)** | `Fraunces` 600, opsz 9..144 | "Wonder Scanner" 워드마크, 큰 숫자(Lv, XP 합계), 등급 텍스트(PERFECT) | letter-spacing `-0.01em`. 대문자 남발 금지. 워드마크는 Title Case |
| **Display (Korean)** | `Gowun Batang` 700 | 화면 제목, 원더 이름, 챕터 제목, 루페의 스토리 인용 | 표본 라벨처럼. 크기보다 **굵기와 색**으로 위계 |
| **Body** | `IBM Plex Sans KR` 400 / 500 / 600 | 본문, 버튼, 설명, 설정 | 15px 기본, line-height 1.55, 한 줄 최대 34자(≈65ch) |
| **Mono** | `IBM Plex Mono` 500 | 카탈로그 번호 `No. 012`, 원래 이름(COCO 라벨), 신뢰도 %, 날짜, 선물 코드 | 11–12px, letter-spacing `.06em`, 숫자 정렬용 |

**로딩**: Google Fonts (`display=swap`). 캔버스(공유 카드)는 `document.fonts.load()` 후 그린다.
**금지**: `Inter`, `Pretendard`(Inter 계열), 시스템 기본 폰트 단독 사용, `Times New Roman`·`Georgia`·`Garamond`.

### 3.1 크기 척도

| 토큰 | 값 | 예 |
|---|---|---|
| `--fs-display` | `clamp(28px, 7vw, 36px)` | 워드마크 |
| `--fs-h1` | `22px` | 화면 제목 "원더 도감" |
| `--fs-h2` | `18px` | 카드 위 원더 이름 |
| `--fs-body` | `15px` | 본문 |
| `--fs-sm` | `13px` | 보조 설명 |
| `--fs-xs` | `11px` | 메타, 탭 라벨 (최소 11px) |

---

## 4. Component Stylings (컴포넌트)

### 4.1 버튼
- **Primary (황동)**: 채움 `--brass`, 글자 `--brass-ink`, 반경 `12px`, 높이 `52px`(big) / `44px`(기본).
  그라데이션 없음, 외부 글로우 없음. `:active` 시 `translateY(1px)` + 채움을 `#B98A34`로.
- **Ghost**: 채움 `--ink-2`, 1px `--line-2` 테두리, 글자 `--bone`. `:active` 시 `--ink-3`.
- **Icon 버튼**: 44×44 원형, `--ink-2` 채움, 아이콘 `20px` `--bone-2`. 툴팁(title) 필수.
- 버튼 안 아이콘은 `icon()` 인라인 SVG만. 이모지 금지. 텍스트와 아이콘 사이 `8px`.

### 4.2 표본 플레이트 (카드)
- 채움 `--ink-1`, 1px `--line` 테두리, 반경 `14px`, 그림자 `0 10px 30px rgba(6,9,15,.55)` (잉크 톤).
- **각인 모서리**: 히어로 카드(발견·도감 상세)에는 네 모서리에 12px 황동 코너 틱을 `::before/::after`로 새긴다 (뷰파인더 브래킷과 같은 언어).
- 희귀도는 테두리 1px 색 + 좌상단 **도장**(회전 -6°, 희귀도 잉크 테두리, 채움 `--ink-0`) 으로 표시.
- 사진은 반경 `10px`, 1px `--line`. 사진 위로 글자를 올리지 않는다(겹침 금지).
- 카드 하단 메타는 Mono: `No. 006 · cup · 신뢰도 97% · 2026.09.23`.

### 4.3 장부 행 (Ledger Row) — 목표·의뢰·마일스톤·설정
- 카드가 아니라 **행**이다. `border-top: 1px solid var(--line)`, 패딩 `12px 0`, 좌측 아이콘 `24px` 황동.
- 진행 바: 높이 `6px`, 트랙 `--ink-2`, 채움 `--brass` 단색. 그라데이션 금지.
- 우측 보상 텍스트는 Mono, `--brass-2`.

### 4.4 칩 / 필 (Pill)
- 높이 `32px`, 반경 `999px`, 채움 `--ink-1`, 1px `--line-2`, 글자 `13px --bone-2`.
- 선택 상태: 채움 `--bone`, 글자 `--ink-0`. 이벤트/프리즘 등 의미 칩은 **테두리 색만** 바꾼다.

### 4.5 루페 쪽지 (대화 말풍선)
- 좌측에 루페 44px 아바타, 우측에 쪽지. 쪽지는 `--ink-1` 채움, 좌측 2px `--brass` 세로선(만년필 자국).
- 이름표 `LUPE`는 Mono 11px `--brass-2` letter-spacing `.12em`. 본문은 Body 15px, 타자 효과 유지.
- 아바타 글로우 금지. 대신 3초 주기 6px 플로팅.

### 4.6 입력 / 시트
- 라벨 위, 입력 아래 도움말. 입력 채움 `--ink-0`, 1px `--line-2`, 포커스 시 테두리 `--brass`, 링 없음.
- 시트(모달 하단 패널): `--ink-1`, 상단 반경 `20px`, 상단에 36×4 손잡이 `--line-2`.
- 토글 스위치: 트랙 `--ink-3` → 켜짐 `--brass`, 손잡이 `--bone`.

### 4.7 탭 바 (하단 내비)
- 높이 `56px + safe-area`, 채움 `rgba(22,29,43,.94)` + blur 10px, 상단 1px `--line`.
- 각 탭: 아이콘 22px + 라벨 11px. 활성 = 아이콘·라벨 `--brass-2` + 아이콘 위 2px 황동 밑줄. 배경 박스 없음.
- 최소 터치 영역 44×44.

### 4.8 로딩 / 빈 상태 / 오류
- 로딩: 레이아웃과 같은 크기의 **스켈레톤 시머**(`--ink-1` → `--ink-2` 1.6s). 원형 스피너 금지.
  단, 카메라 준비는 "렌즈 조리개" 애니메이션(황동 링 6개 블레이드 회전) 1개 허용 — 세계관 요소.
- 빈 상태: 챕터 엠블럼(48px, `--mute`) + Gowun Batang 한 줄 + 행동 버튼 1개.
- 오류: 인라인, `--danger` 텍스트 13px, 아이콘 `warn`.

### 4.9 도감 슬롯 (표본 격자)
- 정사각, 반경 `12px`, `--ink-1`, 1px `--line`. 보유 시 테두리를 희귀도 잉크로, 글로우 없음.
- 원더 글리프(이모지 — 4.11 참조)는 40px 원형 "렌즈 접시"(`--ink-0` 채움, 1px `--line-2`) 안에 놓는다.
- 잠김: 글리프 `grayscale(1) brightness(.35)` + 하단에 시길 n개(`--mute`).
- 마스터: 테두리 `--brass-2` + 좌상단 Mono `MASTER`.

### 4.10 AR 오버레이 (캔버스)
- 뷰파인더 브래킷: `rgba(237,230,214,.28)` 1px. 스캔라인: `rgba(226,180,90,.10)`.
- 타겟 박스: 희귀도 잉크 1.5px, 코너 틱 10px. 홀로 태그는 `--ink-1` 90% 채움 + Mono 라벨.
- 포획 링: 트랙 `rgba(237,230,214,.2)`, 황금 밴드 `#E2B45A` 3px. 등급 버스트 텍스트는 Fraunces 700.
- 정령(위습): 일반 = Verdigris `rgba(109,181,160,a)`, 황금 = Brass `rgba(226,180,90,a)`. 보라 금지.

### 4.11 원더 글리프 — 이모지 사용의 유일한 예외
- `WONDERS[label].emoji` 는 80종 원더의 **표본 그림(게임 콘텐츠)** 이다. 이것만 이모지를 허용한다.
- 항상 `.glyph` 렌즈 접시 안에서만 렌더하고 `filter: saturate(.85)` 로 색을 팔레트에 맞춘다.
- 그 외 모든 UI 크롬(버튼, 탭, 헤더, 칩, 토스트, 루페 대사, 업적 아이콘, 상점 아이콘, 데이터의 `icon` 필드)은 `icon()` SVG 로 대체한다.

---

## 5. Layout Principles (레이아웃)

- **모바일 퍼스트, 단일 컬럼.** 390×844 기준으로 설계하고 `max-width: 480px` 중앙 컨테이너로 데스크톱을 감싼다.
  가로 스크롤은 치명적 결함이다.
- **타이틀 = 마스트헤드(좌측 정렬)**: 상단 좌측에 황동 조리개 마크 + "Wonder Scanner" 워드마크, 그 아래 태그라인(Gowun Batang).
  우측 상단에 설정 아이콘 버튼. 루페 쪽지는 폭 92%로 우측 정렬(오프셋 8%). 목표는 장부 행 4개. 하단 고정 CTA 1개("스캔 시작") + 보조 4개는 아이콘 버튼 행.
  중앙 정렬 로고·중앙 정렬 문단 금지.
- **화면 헤더**: `뒤로(44px) · 제목(Gowun Batang 22px, flex:1) · 우측 상태 칩 1개`. 제목에 이모지 없음.
- **격자**: 도감 4열, 앨범 3열, 상점 2열, 업적 3열. `gap 8px`. 동일 카드 3열 "기능 소개" 패턴은 쓰지 않는다.
- **겹침 금지**: 절대 위치 요소는 HUD·토스트·모달·AR 오버레이뿐. 콘텐츠끼리는 문서 흐름으로 쌓는다.
- **간격 척도**: `4 · 8 · 12 · 16 · 24 · 32px`. 섹션 간격 `clamp(16px, 4vw, 24px)`.
- **높이**: 전체 화면은 `min-height: 100dvh`. `h-screen`/`100vh` 금지.
- **safe-area**: 상단 `env(safe-area-inset-top)`, 하단 탭바에 `env(safe-area-inset-bottom)` 가산.

---

## 6. Motion & Interaction (모션)

- **이징 토큰**
  - `--ease-spring: linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 25.3%, 0.849 31.5%, 0.937 38.1%, 0.968 41.8%, 0.991 45.7%, 1.006 50.1%, 1.015 55%, 1.017 63.9%, 1.001)` — 무게감 있는 스프링(강성 100 / 감쇠 20 근사). 폴백 `cubic-bezier(.2,1.4,.4,1)`.
  - `--ease-out: cubic-bezier(.2,.8,.2,1)`.
  - 지속시간: 즉각 `160ms`, 전환 `280ms`, 연출 `480ms`. 선형(linear) 이징은 스캔라인 이동 외 금지.
- **스태거 등장**: 목록(장부 행, 도감 슬롯, 상점 카드)은 `--i` 인덱스로 `40ms` 계단 지연. 한 번에 뜨지 않는다.
- **영구 마이크로 루프** (활성 요소마다 1개)
  - 타이틀 조리개 마크: 24s 1회전. 루페 아바타: 3s 플로팅 6px. 공명 링: 1.6s 시머.
  - 탭바 활성 밑줄: 없음(정적). 과하면 시장통이 된다.
- **발견 순간(reveal)만의 허용 목록**: 플래시(뼈색, 0.5s), 흔들림, 파티클(희귀도 잉크 + Bone), 희귀 3성 이상은 드럼롤 + 슬로모. 글리치는 색상 회전 대신 `clip-path` 슬라이스만.
- **탭 피드백**: 모든 버튼 `:active` 에서 `transform: translateY(1px)`. 커스텀 커서 금지.
- **성능**: `transform`·`opacity` 만 애니메이션. `top/left/width/height` 애니메이션 금지. 노이즈 필터는 고정 의사 요소에만.
- **모션 줄이기**: `prefers-reduced-motion` 과 `state.settings.reduceMotion` 둘 다 존중. 스태거·플래시·흔들림·파티클·후광을 끄고 텍스트·색·진행 상태만 남긴다.

---

## 7. Anti-Patterns (금지 목록)

절대 하지 않는다:

1. UI 크롬에 이모지 (탭, 버튼, 헤더, 칩, 토스트, 루페 대사, 업적/상점/의뢰 아이콘). 원더 글리프만 예외 (4.11).
2. `Inter`, `Pretendard`, 시스템 기본 산세리프 단독. `Times New Roman`·`Georgia`·`Garamond`.
3. 순수 검정 `#000000`. 흰색 `#FFFFFF` 텍스트(Bone을 쓴다).
4. 시안→보라 그라데이션, 네온 외부 글로우, `box-shadow: 0 0 40px <채도색>`.
5. 채도 80% 이상의 악센트. 악센트 2개 이상.
6. 큰 제목의 그라데이션 텍스트(`background-clip: text`).
7. 커스텀 마우스 커서.
8. 요소 겹치기(사진 위 글자, 카드 위 카드).
9. 동일 카드 3열 나열, 중앙 정렬 히어로.
10. 가짜 지표·가짜 이름("John Doe", "99.9%"). 수치는 실제 `state` 값만.
11. `LABEL // YEAR` 식 장식 라벨.
12. 광고 문구 클리셰("차원이 다른", "혁신적인", "Seamless", "Unleash").
13. "아래로 스크롤", 튀는 화살표 같은 필러 UI.
14. 원형 스피너(조리개 애니메이션 1개 예외). 깨진 외부 이미지 링크.
15. 순수 흰 파티클·흰 플래시(Bone 사용).

---

## 8. Art Assets (아트 리소스 사양)

모든 리소스는 SVG, 팔레트 색만 사용, 그라데이션은 라디얼 1개까지(렌즈 유리 표현용).

| 파일 | 크기 | 사양 |
|---|---|---|
| `public/img/logo.svg` | 128×128 | 반경 30 잉크 플레이트(`#161D2B`) + 1px hairline. 중앙에 황동(`#E2B45A`) 조리개 링(외경 r40, 4방위 틱), 링 안쪽에 6개 블레이드 힌트 선(`rgba(226,180,90,.35)`), 중심 렌즈는 Verdigris→Ink 라디얼(`#6DB5A0`→`#0F141E`). 우상단 4각 스파클 1개 `#E2B45A`. 시안·보라 금지 |
| `public/img/lupe.svg` | 120×120 | 렌즈 정령. 몸통은 서리 낀 뼈색 오브(`#EDE6D6`→`#6DB5A0` 라디얼, 외곽 1.5px `#CFC7B4`), 오른눈에 황동 모노클(링 `#E2B45A` 3.5px, 렌즈 `#6DB5A0`→`#0F141E`), 모노클에서 내려오는 황동 체인 2마디, 왼눈은 잉크(`#0F141E`) 타원 + 하이라이트, 볼 `#E39BC0` 40%, 꼬리는 Verdigris 위습(`#6DB5A0` 70%), 스파클 1개 `#E2B45A`. 보라 글로우 제거 |
| `public/img/ch/desk.svg` | 64×64 | 챕터 엠블럼 공통: 투명 배경, 선 3px `#E2B45A`, 채움 포인트 1개 `#6DB5A0`, 각인 스타일(둥근 캡). desk = 모니터 + 주위 궤도 타원 + 작은 행성 |
| `public/img/ch/kitchen.svg` | 64×64 | 냄비/플라스크 + 거품 3개 (연금술) |
| `public/img/ch/home.svg` | 64×64 | 열쇠 + 램프 불빛 (유물) |
| `public/img/ch/street.svg` | 64×64 | 가로등 + 건물 실루엣 (거인) |
| `public/img/ch/living.svg` | 64×64 | 발자국 + 잎사귀 (살아있는 신비) |
| `public/img/ch/play.svg` | 64×64 | 연 + 실 곡선 (놀이) |
| `docs/qr.png` | 유지 | 변경 없음 |

**아이콘 세트**: 파일이 아니라 `src/ui/icons.js` 인라인 SVG. 24×24, `fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"`. 단선 각인 스타일(Lucide 계열 단순도). 아이콘은 색을 갖지 않고 `currentColor`를 상속한다.

---

## 9. Implementation Contract (구현 계약 — 병렬 작업용)

이 절은 여러 작업자가 **동시에** 파일을 고칠 때 서로 어긋나지 않기 위한 약속이다.

### 9.1 파일 소유권

| 소유자 | 파일 | 하지 말 것 |
|---|---|---|
| **art** | `src/ui/icons.js`(신규), `public/img/**`, `index.html` | 다른 파일 수정 금지 |
| **styles** | `src/styles.css` | 기존 클래스명 **삭제·개명 금지**(값만 교체, 신규 클래스 추가 가능) |
| **screens-a** | `src/ui/shell.js`, `src/ui/screens/title.js`, `src/ui/screens/meta.js`, `src/ui/screens/codex.js` | |
| **screens-b** | `src/ui/screens/scan.js`, `src/ui/screens/reveal.js`, `src/ui/card.js`, `src/ui/fx.js`, `src/ui/scratch.js`, `src/ar/overlay.js`, `src/ar/spirits.js` | 감지·쿨다운·저장 스키마 로직 변경 금지 |
| **screens-c** | `src/ui/screens/album.js`, `src/ui/screens/shop.js`, `src/ui/screens/collectors.js`, `src/ui/screens/duel.js`, `src/game/companion.js`, `src/game/achievements.js`, `src/game/economy.js`, `src/game/memories.js`, `src/game/media.js`, `src/game/quests.js`, `src/data/chapters.js`, `src/data/wonders.js`(RARITY 블록만), `src/main.js` | 게임 수치·보상·저장 키 변경 금지 |

### 9.2 `icon()` API (art 가 만들고, 모두가 쓴다)

```js
// src/ui/icons.js
export const ICONS = { camera: '<path d="..."/>', ... };           // 이름 → 24×24 path 마크업
export function icon(name, { size = 20, cls = '', label = '' } = {}) // → 인라인 <svg class="ic ${cls}" …> 문자열
export const hasIcon = (name) => name in ICONS;
// 모르는 이름이면 'circle' 을 그리고 console.warn('[icons] missing', name)
```

**이름 목록 (이 목록 밖의 이름을 쓰면 안 된다. 필요하면 Reconcile 단계에서 추가):**

`camera codex album quest profile shop gear back home flip image close globe duel`
`dust prism flame fragment boost event clock cloud lock check plus heart heart-off gift medal chest trash quill lamp share card film copy collage login warn info rec ar moon sun`
`scope cosmos crown star target circle miss repeat frame seed sprout bloom sigil lens key`
`ch-desk ch-kitchen ch-home ch-street ch-living ch-play arrow-right minus`

의미 매핑(이전 이모지 → 아이콘): 📷→camera 📖→codex 📸→album 📋→quest 🧭→profile 🏪→shop ⚙️→gear 🏠→home 🔄→flip 🖼️→image/frame 🌐→globe ⚔️→duel ✨→dust(별가루) 또는 prism(토큰·변이체) 🔥→flame ◇→fragment ⚡→boost/event ⏳→clock ☁️→cloud 🔒→lock ✅→check ❤️→heart 💔→heart-off 🎁→gift 🏅→medal 🎯→target ⭐→star 🌟→star 🫧→fragment 📝✏️→quill 💡→lamp 🎬→film 🧩→collage 🔐→login ❌→miss 🌙→moon 🍳→ch-kitchen 🔮→lens 🔭→scope 🌌→cosmos 👑→crown 📜→quest 🔁→repeat 🌱→seed 🌿→sprout 🌸→bloom 🗑️→trash 📤→share 📋(복사)→copy ☕등 원더 글리프→그대로(4.11)

### 9.3 데이터의 `icon` 필드

`ACHIEVEMENTS[].icon`, `SHOP[].icon`, `STAGES[].icon`, `CHAPTERS[].icon`, `advise().icon`, `goals()[].icon` 은 **이모지 문자열 → 위 아이콘 이름 문자열**로 바꾼다. 렌더 측은 `icon(x.icon)` 으로 그린다.
`RARITY[n].stars` 는 `'✦'.repeat(n)`(딩뱃, 이모지 아님) 으로 바꾸고, 새 필드 `sigils: n` 을 추가한다.
`FRAMES` 색: aurora `['#6DB5A0','#A493D9','#E2B45A']`, ember `['#E2B45A','#C9713F','#D2706A']`, void `['#EDE6D6','#273244','#0F141E']`.

### 9.4 `shell.js` 공용 헬퍼 (screens-a 가 만들고, b·c 가 쓴다)

```js
export { icon } from './icons.js';                    // 재수출
export const rarityHtml = (n, { label = true } = {}) // <span class="rar-sigils" data-r="n">sigil×n [라벨]</span>
export const catalogNo = (label) => `No. ${String(ALL_LABELS.indexOf(label) + 1).padStart(3, '0')}`;
export const glyph = (emoji, cls = '') => `<span class="glyph ${cls}">${emoji}</span>`;
```
`hudHtml / tabsHtml / lupeHtml / nudgeHtml / goalsHtml / toast / grade` 시그니처는 유지한다. `grade` 맵은 아이콘 이름으로 (`PERFECT:'target', GREAT:'star', GOOD:'circle', AUTO:'circle'`) 바꾸고 사용처는 `icon(GI[g])` 로 그린다.

### 9.5 CSS 계약 (styles 가 만들고, 모두가 쓴다)

신규 클래스: `.ic` (인라인 아이콘 기본: `width/height:1em; vertical-align:-0.15em; flex:none`), `.glyph`, `.rar-sigils`, `.ledger`, `.ledger-row`, `.masthead`, `.wordmark`, `.aperture`, `.plate`(각인 코너), `.mono`, `.skeleton`, `.sheet-handle`, `.stagger`(`--i` 기반 지연).
기존 클래스는 모두 유지하되 값만 새 팔레트·서체로 바꾼다. 화면 코드는 위 신규 클래스를 써도 되고 안 써도 된다(없어도 깨지지 않게 styles 가 기존 클래스에 새 룩을 입힌다).

### 9.6 절대 불변

- `localStorage` 키 `wonder-scanner:v1` 와 `state` 스키마, `BALANCE` 수치, 감지·쿨다운·포획 등급 판정.
- 한국어 카피(문장)는 유지. 이모지만 뺀다. 루페의 말투도 유지.
- 라우트 이름(`title scan reveal codex quests profile album shop collectors duel`)과 `data-go` 규약.
- `?debug` 시 `window.__ws = { state, go }` 훅 (QA 는 여기에 `WONDERS, RARITY` 를 덧붙일 수 있다).

---

## 10. 모바일 게임 스타일 원칙 (Mobile-first, game not website)

이 제품은 브라우저에서 돌지만 **모바일 게임**이다. 웹사이트의 문법을 쓰지 않는다.

| 원칙 | 규칙 |
|---|---|
| **해상도** | 기준 390×844 세로. 지원 폭 360–430px. QA 스크린샷과 판단은 모두 이 뷰포트에서 한다. 가로 모드는 "세로로 돌려 주세요" 플레이트 1장만 보여 준다 |
| **데스크톱** | 앱을 늘리지 않는다. 화면 폭이 520px 이상이면 `#app` 을 430px 폭 "폰 셸"(잉크 배경 + hairline 테두리, 높이 `100dvh`)로 가운데 고정하고 바깥은 `--ink-0` 로 채운다 |
| **엄지 영역** | 주 행동(스캔 시작, 포획, 계속 스캔, 받기)은 항상 화면 하단 35% 안에 둔다. 상단은 정보(HUD), 하단은 행동 |
| **HUD** | 스캔 화면 상단 스트립 = 게임 HUD (Lv·XP 바, 도감 수, 별가루, 의뢰). 항상 보이고 safe-area 를 피한다. 카드 위 텍스트가 아니라 칩(pill) 언어를 쓴다 |
| **터치** | 모든 탭은 시각 피드백(`:active` scale .97 또는 translateY 1px) + blip + 햅틱(설정 시). 호버 전용 상태 금지. 길게 누르기·드래그(스크래치)는 `touch-action: none` 으로 스크롤과 분리 |
| **크기** | 본문 15px 이상, 메타 11px 이상. 버튼 44px 이상, 주 CTA 52–56px. 탭바 아이콘 22px |
| **화면 문법** | 타이틀 = 시작 화면(워드마크 + 카메라 열기), 스캔 = **카메라**(셔터 바 + 뷰파인더 + HUD; 게임 레이어는 자동), 발견 = 결과 화면(도장·보상·베스트 포토·다음 행동), 앨범 = 갤러리(꺼내기·수정·공유), 도감 = 수집 격자, 상점·의뢰·프로필 = 메뉴 시트. 화면 전환 280ms |
| **금지** | 햄버거 메뉴, 브레드크럼, 사이드 내비, 텍스트 링크, 호버 툴팁 단독, 쿠키 배너, 푸터 |
| **PWA** | `index.html` 에 `mobile-web-app-capable`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style=black-translucent`, `viewport-fit=cover`. 홈 화면 아이콘 = `logo.svg` |

세부 게임플레이 연출·추적 실루엣·제스처 QA 사양은 [docs/GAMEPLAY_V7.md](docs/GAMEPLAY_V7.md) 를 따른다.
