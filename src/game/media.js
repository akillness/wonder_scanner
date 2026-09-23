import { ALL_LABELS } from '../data/wonders.js';
// 추억 앨범 저장소 (IndexedDB) + 압축 정책
// moment = { id, ts, label, grade, variant, frame, photo: Blob(jpeg), clip: Blob|null, clipType, fav, friend: {name}|null, bytes }
export const MEDIA = {
  photoMaxPx: 640, photoQuality: 0.74,          // 카드용 사진: 640px, JPEG 0.74 → 평균 40~60KB
  thumbMaxPx: 160, thumbQuality: 0.6,           // 앨범 그리드 썸네일
  clipWidth: 540, clipFps: 24, clipKbps: 1100,  // 클립: 540p, 24fps, ~1.1Mbps → 5초 ≈ 700KB
  clipMaxMs: 6500, preRollGauge: 0.6,           // 공명 60%부터 녹화 시작, 최대 6.5초
  maxBytes: 160 * 1024 * 1024,                  // 앨범 상한 160MB, 초과 시 즐겨찾기 아닌 오래된 것부터 삭제
};
const DB = 'wonder-album', STORE = 'moments';
let dbp = null;
function db() {
  return dbp ??= new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('no-indexeddb'));
    let r; try { r = indexedDB.open(DB, 1); } catch (e) { return rej(e); }
    r.onupgradeneeded = () => { const s = r.result.createObjectStore(STORE, { keyPath: 'id' }); s.createIndex('ts', 'ts'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode); const out = fn(t.objectStore(STORE)); t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error); }); };
const all = async () => { let d; try { d = await db(); } catch { return []; } return new Promise((res, rej) => { const r = d.transaction(STORE).objectStore(STORE).getAll(); r.onsuccess = () => res(r.result.sort((a, b) => b.ts - a.ts)); r.onerror = () => rej(r.error); }); };

/** dataURL/이미지 → 압축 JPEG Blob (긴 변 maxPx, quality) */
export async function compressImage(src, maxPx, quality) {
  const img = typeof src === 'string' ? await loadImg(src) : src;
  const w = img.naturalWidth || img.videoWidth || img.width, h = img.naturalHeight || img.videoHeight || img.height;
  const s = Math.min(1, maxPx / Math.max(w, h)); const c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', quality));
}
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

export async function addMoment({ label, grade, variant, frame, photoDataUrl, clip = null, clipType = null, friend = null }) {
  const photo = await compressImage(photoDataUrl, MEDIA.photoMaxPx, MEDIA.photoQuality);
  const thumb = await compressImage(photoDataUrl, MEDIA.thumbMaxPx, MEDIA.thumbQuality);
  const m = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ts: Date.now(), label, grade, variant, frame, photo, thumb, clip, clipType, fav: false, friend, stage: 0, caption: '', filter: 'none', recalls: 0, shares: 0, bytes: photo.size + thumb.size + (clip?.size ?? 0) };
  await tx('readwrite', s => s.put(m));
  await enforceCap();
  return m;
}
export const listMoments = all;
export const getMoment = (id) => tx('readonly', s => s.get(id));
export const deleteMoment = (id) => tx('readwrite', s => s.delete(id));
export const updateMoment = (m) => tx('readwrite', s => s.put(m));
export async function toggleFav(id) { const m = await getMoment(id); if (!m) return; m.fav = !m.fav; await tx('readwrite', s => s.put(m)); return m.fav; }
export async function stats() { try { return await statsInner(); } catch { return { count: 0, clips: 0, bytes: 0, cap: MEDIA.maxBytes, pct: 0 }; } }
async function statsInner() { const ms = await all(); const bytes = ms.reduce((a, m) => a + (m.bytes || 0), 0); return { count: ms.length, clips: ms.filter(m => m.clip).length, bytes, cap: MEDIA.maxBytes, pct: Math.min(100, Math.round(bytes / MEDIA.maxBytes * 100)) }; }
async function enforceCap() {
  const ms = await all(); let bytes = ms.reduce((a, m) => a + (m.bytes || 0), 0);
  for (const m of [...ms].reverse()) { if (bytes <= MEDIA.maxBytes) break; if (m.fav) continue; await deleteMoment(m.id); bytes -= m.bytes || 0; }
}
export const fmtBytes = (b) => b > 1e6 ? `${(b / 1e6).toFixed(1)}MB` : `${Math.round(b / 1e3)}KB`;

/** 앨범 콜라주 PNG (최대 9장) — 잉크 플레이트 위 표본 격자. 글자는 사진 위가 아니라 사진 아래 캡션 줄에 둔다 (DESIGN.md 4.2) */
const COLLAGE = { bg: '#161D2B', bone: '#EDE6D6', mute: '#8F8A7C', brass: '#E2B45A', line: 'rgba(237,230,214,.18)', prism: '#E39BC0' };
const FONT_DISPLAY = '"Fraunces", "Gowun Batang", serif', FONT_MONO = '"IBM Plex Mono", ui-monospace, monospace';
export async function renderCollage(moments, { title = 'WONDER ALBUM', sub = '' } = {}) {
  const n = Math.min(9, moments.length), cols = n <= 4 ? 2 : 3, rows = Math.ceil(n / cols), cell = 340, cap = 30, pad = 16, W = cols * cell + pad * (cols + 1), H = rows * (cell + cap) + pad * (rows + 1) + 150;
  try { await Promise.all([`600 40px ${FONT_DISPLAY}`, `700 16px ${FONT_DISPLAY}`, `500 22px ${FONT_MONO}`].map(f => document.fonts.load(f))); } catch {}
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = COLLAGE.bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = COLLAGE.line; x.lineWidth = 1; x.strokeRect(0.5, 0.5, W - 1, H - 1);
  x.fillStyle = COLLAGE.bone; x.font = `600 40px ${FONT_DISPLAY}`; x.textAlign = 'left'; x.fillText(title, pad, 62);
  x.font = `500 22px ${FONT_MONO}`; x.fillStyle = COLLAGE.mute; x.fillText(sub, pad, 98);
  x.fillStyle = COLLAGE.brass; x.fillRect(pad, 112, 48, 2);
  for (let i = 0; i < n; i++) {
    const m = moments[i], img = await loadImg(URL.createObjectURL(m.photo)); const cx = pad + (i % cols) * (cell + pad), cy = 120 + pad + Math.floor(i / cols) * (cell + cap + pad);
    x.save(); rr(x, cx, cy, cell, cell, 10); x.clip(); x.drawImage(img, cx, cy, cell, cell); x.restore();
    x.strokeStyle = m.variant ? COLLAGE.prism : COLLAGE.line; x.lineWidth = m.variant ? 2 : 1; rr(x, cx + 0.5, cy + 0.5, cell - 1, cell - 1, 10); x.stroke();
    const no = ALL_LABELS.indexOf(m.label) + 1;
    x.font = `500 16px ${FONT_MONO}`; x.fillStyle = COLLAGE.mute; x.textAlign = 'left'; x.fillText(`No. ${String(no).padStart(3, '0')} · ${m.label}`, cx + 2, cy + cell + 21);
    if (m.grade === 'PERFECT') { x.font = `700 16px ${FONT_DISPLAY}`; x.fillStyle = COLLAGE.brass; x.textAlign = 'right'; x.fillText('PERFECT', cx + cell - 2, cy + cell + 21); }
  }
  return c;
}
function rr(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
