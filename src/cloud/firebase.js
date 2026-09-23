// Firebase 구현 (동적 import → 로컬 모드에서는 번들에 포함되지 않음)
export async function createFirebaseProvider(cfg) {
  const [{ initializeApp }, auth, fs, st] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore'), import('firebase/storage')]);
  const app = initializeApp(cfg), a = auth.getAuth(app), db = fs.getFirestore(app), storage = st.getStorage(app);
  const uid = () => a.currentUser?.uid ?? null;
  return {
    onAuth(fn) { auth.onAuthStateChanged(a, u => fn(u ? { uid: u.uid, name: u.displayName, photo: u.photoURL, email: u.email } : null)); },
    user() { const u = a.currentUser; return u ? { uid: u.uid, name: u.displayName, photo: u.photoURL } : null; },
    async signIn() { const p = new auth.GoogleAuthProvider(); const r = await auth.signInWithPopup(a, p); return { uid: r.user.uid, name: r.user.displayName, photo: r.user.photoURL }; },
    signOut() { return auth.signOut(a); },
    async syncMoment(m) {
      const u = uid(); if (!u) return null;
      const base = `users/${u}/moments/${m.id}`;
      const photoRef = st.ref(storage, `${base}.jpg`); await st.uploadBytes(photoRef, m.photo, { contentType: 'image/jpeg', cacheControl: 'public,max-age=31536000' });
      const photoUrl = await st.getDownloadURL(photoRef);
      let clipUrl = null; if (m.clip) { const cr = st.ref(storage, `${base}.${m.clip.type.includes('mp4') ? 'mp4' : 'webm'}`); await st.uploadBytes(cr, m.clip, { contentType: m.clip.type }); clipUrl = await st.getDownloadURL(cr); }
      await fs.setDoc(fs.doc(db, 'collectors', u, 'moments', m.id), { label: m.label, grade: m.grade, variant: !!m.variant, ts: m.ts, caption: m.caption || '', stage: m.stage || 0, filter: m.filter || 'none', frame: m.frame || 'default', fav: !!m.fav, photoUrl, clipUrl, bytes: m.bytes || 0 }, { merge: true });
      return { photoUrl, clipUrl };
    },
    async deleteMoment(id) { const u = uid(); if (!u) return; await fs.deleteDoc(fs.doc(db, 'collectors', u, 'moments', id)); for (const ext of ['jpg', 'mp4', 'webm']) { try { await st.deleteObject(st.ref(storage, `users/${u}/moments/${id}.${ext}`)); } catch {} } },
    async publishProfile(p) { const u = uid(); if (!u) return; await fs.setDoc(fs.doc(db, 'collectors', u), { ...p, uid: u, updatedAt: fs.serverTimestamp() }, { merge: true }); },
    async listCollectors(limit) { const q = fs.query(fs.collection(db, 'collectors'), fs.where('public', '==', true), fs.orderBy('codexCount', 'desc'), fs.limit(limit)); const snap = await fs.getDocs(q); return snap.docs.map(d => ({ uid: d.id, ...d.data() })); },
    async collectorMoments(u, limit) { const q = fs.query(fs.collection(db, 'collectors', u, 'moments'), fs.orderBy('ts', 'desc'), fs.limit(limit)); const snap = await fs.getDocs(q); return snap.docs.map(d => ({ id: d.id, ...d.data() })); },
    async saveState(state) { const u = uid(); if (!u) return; await fs.setDoc(fs.doc(db, 'saves', u), { json: JSON.stringify(state), updatedAt: fs.serverTimestamp() }); },
    async loadState() { const u = uid(); if (!u) return null; const d = await fs.getDoc(fs.doc(db, 'saves', u)); return d.exists() ? JSON.parse(d.data().json) : null; },
  };
}
