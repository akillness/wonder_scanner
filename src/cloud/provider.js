// 클라우드 어댑터: VITE_FIREBASE_* 환경변수가 있으면 Firebase(Google 로그인 + Storage + Firestore), 없으면 로컬 전용.
// 앱 코드는 이 인터페이스만 본다 → 다른 BaaS로 교체 가능.
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const cloudEnabled = !!(cfg.apiKey && cfg.projectId);
let impl = null;
async function get() { if (!cloudEnabled) return null; return impl ??= (await import('./firebase.js')).createFirebaseProvider(cfg); }
const listeners = new Set();
export function onAuth(fn) { listeners.add(fn); get().then(p => p?.onAuth(u => listeners.forEach(l => l(u)))); return () => listeners.delete(fn); }
export const cloud = {
  get enabled() { return cloudEnabled; },
  async user() { return (await get())?.user() ?? null; },
  async signIn() { return (await get())?.signIn() ?? null; },
  async signOut() { return (await get())?.signOut(); },
  /** 추억 1건 업로드(사진·클립·메타). 로그인 안 되어 있으면 무시 */
  async syncMoment(m) { return (await get())?.syncMoment(m); },
  async deleteMoment(id) { return (await get())?.deleteMoment(id); },
  /** 공개 프로필(컬렉터 카드) 갱신 */
  async publishProfile(profile) { return (await get())?.publishProfile(profile); },
  async listCollectors(limit = 30) { return (await get())?.listCollectors(limit) ?? []; },
  async collectorMoments(uid, limit = 30) { return (await get())?.collectorMoments(uid, limit) ?? []; },
  async saveState(state) { return (await get())?.saveState(state); },
  async loadState() { return (await get())?.loadState() ?? null; },
};
