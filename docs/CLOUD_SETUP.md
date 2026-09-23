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
