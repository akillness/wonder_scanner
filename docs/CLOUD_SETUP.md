# ☁️ 클라우드 설정 (Google 로그인 · 사용자별 저장 · 탐험가 광장)

앱은 **환경변수가 없으면 로컬 전용**으로 동작합니다. 아래를 끝내면 로그인 버튼과 광장이 자동으로 켜집니다.

## 1. Firebase 프로젝트 (약 10분)

| 단계 | 어디서 | 무엇을 |
|---|---|---|
| 1 | https://console.firebase.google.com | 프로젝트 추가 → 웹 앱 등록 → `firebaseConfig` 값 복사 |
| 2 | Authentication → Sign-in method | **Google** 사용 설정, 승인된 도메인에 `wonderscanner.vercel.app` 추가 |
| 3 | Firestore Database | 만들기 (프로덕션 모드) → 아래 규칙 붙이기 |
| 4 | Storage | 만들기 → 아래 규칙 붙이기 |

### Firestore 규칙
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /collectors/{uid} {
      allow read: if resource.data.public == true || request.auth.uid == uid;
      allow write: if request.auth.uid == uid;
      match /moments/{id} {
        allow read: if get(/databases/$(db)/documents/collectors/$(uid)).data.public == true || request.auth.uid == uid;
        allow write: if request.auth.uid == uid;
      }
    }
    match /saves/{uid} { allow read, write: if request.auth.uid == uid; }
  }
}
```
Firestore 색인: `collectors` 컬렉션에 `public ASC, codexCount DESC` 복합 색인 (첫 쿼리 시 콘솔이 링크를 안내).

### Storage 규칙
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/{all=**} {
      allow read: if true;                       // 공개 URL로 광장에서 열람
      allow write: if request.auth.uid == uid && request.resource.size < 8 * 1024 * 1024;
    }
  }
}
```

## 2. Vercel 환경변수

`.env.example`의 5개 키를 Vercel → Project → Settings → Environment Variables에 추가(Production + Preview), 그 다음 재배포:
```bash
vercel env add VITE_FIREBASE_API_KEY production
vercel env add VITE_FIREBASE_AUTH_DOMAIN production
vercel env add VITE_FIREBASE_PROJECT_ID production
vercel env add VITE_FIREBASE_STORAGE_BUCKET production
vercel env add VITE_FIREBASE_APP_ID production
vercel --prod
```
로컬 개발은 `.env.local`에 같은 키를 넣습니다.

## 3. 데이터 모델

| 경로 | 내용 |
|---|---|
| `collectors/{uid}` | `name, codexCount, xp, rankTitle, momentsCount, public, photo, updatedAt` — 광장 카드 |
| `collectors/{uid}/moments/{id}` | `label, grade, variant, ts, caption, stage, filter, frame, fav, photoUrl, clipUrl, bytes` |
| `saves/{uid}` | `json` — 게임 저장 전체 (기기 간 이어하기) |
| Storage `users/{uid}/moments/{id}.jpg / .mp4 / .webm` | 압축된 사진(≈50KB)·클립(≈700KB) |

## 4. 동작

- 로그인 시 로컬 앨범의 미동기화 추억을 모두 업로드하고 프로필을 게시합니다 (`syncAll`).
- 이후 포획마다 발견 화면에서 백그라운드로 1건씩 업로드합니다.
- 프로필 **공개** 토글을 끄면 광장 목록과 추억 열람에서 빠집니다.
- 코드는 `src/cloud/provider.js` 인터페이스만 사용하므로 Supabase 등으로 교체 가능합니다.

## 5. Google Places API 키 (주변 촬영지 · 기믹)

"주변 촬영지" 화면(`spots`)은 키가 있으면 **Google Places API (New) Nearby Search**, 없으면 **OpenStreetMap Nominatim(경계 상자 검색, 1초 간격) → Overpass** 폴백, 둘 다 실패하면 "위치 없이도 게임은 그대로" 카드를 보여 줍니다. 키가 없어도 게임은 전부 동작합니다.

### 발급 (약 5분)

| 단계 | 어디서 | 무엇을 |
|---|---|---|
| 1 | https://console.cloud.google.com → API 및 서비스 → 라이브러리 | **Places API (New)** 사용 설정 (구 "Places API" 가 아니라 *New*) |
| 2 | 사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키 | 키 생성 후 **이름**을 `wonder-scanner-web` 처럼 알아볼 수 있게 |
| 3 | 키 편집 → 애플리케이션 제한사항 | **웹사이트** 선택, 허용 리퍼러에 `https://wonderscanner.vercel.app/*` 와 `http://localhost:*` (Preview 배포도 쓰면 `https://*.vercel.app/*`) |
| 4 | 키 편집 → API 제한사항 | **키 제한** → `Places API (New)` 만 체크 |
| 5 | 결제 | Places API (New) Nearby Search 는 월 무료 할당량 안에서 소액. 예산 알림을 걸어 두세요 |

### 환경변수

```bash
vercel env add VITE_GOOGLE_MAPS_KEY production   # Preview 에도 쓰려면 preview 로 한 번 더
vercel --prod
```
로컬은 `.env.local` 에 `VITE_GOOGLE_MAPS_KEY=...`. 값이 비어 있으면 자동으로 Overpass 폴백입니다.

### 앱이 보내는 것 / 보내지 않는 것

- 보내는 것: 위치 버튼을 **탭했을 때만** 현재 좌표(소수점 3자리 ≈ 100m)와 반경 800m, 장소 유형 목록. 요청 헤더 `X-Goog-Api-Key`, `X-Goog-FieldMask: places.id,places.displayName,places.types,places.location` (필드 최소화 = 과금 최소화). 8초 타임아웃.
- 보내지 않는 것: 카메라 프레임, 사진, 도감·저장 데이터. `state.geo` 는 기기 로컬(1시간 캐시)에만 있고 클라우드 어댑터에도 올리지 않습니다.
- 프로필 설정 **위치 기반 추천** 을 켜면 타이틀 진입 시 캐시가 만료됐을 때만 조용히 새로고침합니다 (기본 꺼짐).

### 유형 매핑 (`src/game/spots.js` `SPOT_RULES`)

카페·베이커리 → 부엌(커피 시간: 부엌 별가루 ×2) · 식당 → 부엌(만찬: XP ×1.5) · 공원·놀이터 → 놀이/살아있는 신비(산책: 정령 ×2) · 동물원·수족관 → 살아있는 신비(사파리: 변이체 ×2) · 해변·마리나 → 놀이(파도: XP ×1.5) · 도서관·서점 → 책상(정독: 별가루 ×2) · 버스·기차역 → 거리(거리의 거인들: 공명 +50%) · 마트·쇼핑몰 → 집/부엌(장보기: 원더 3종 스팟 도전 → 별가루 100) · 체육관·경기장 → 놀이(운동장: 별가루 ×2). 기믹은 카드의 "카메라 열기"로 시작하고 30분 유지됩니다.
