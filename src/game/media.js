import { ALL_LABELS } from '../data/wonders.js';
// 추억 앨범 저장소 (IndexedDB) + 압축 정책
// moment = { id, ts, kind, label, grade, variant, frame, photo: Blob(jpeg), thumb, clip: Blob|null, clipType, duration, poster, box, alts, edited, fav, friend: {name}|null, bytes }
//   v7 추가 필드(없으면 기본값으로 읽음 — 옛 추억 호환): kind 'wonder'|'photo'|'video'(없으면 'wonder'), label string|null, box [x,y,w,h] 0..1|null,
//   alts Blob[] ≤3, duration ms, poster Blob(영상 = 카드 사진과 동일 참조), edited boolean
export const MEDIA = {
  photoMaxPx: 640, photoQuality: 0.74,          // 카드용 사진: 640px, JPEG 0.74 → 평균 40~60KB
  thumbMaxPx: 160, thumbQuality: 0.6,           // 앨범 그리드 썸네일
  clipWidth: 540, clipFps: 24, clipKbps: 1100,  // 클립: 540p, 24fps, ~1.1Mbps → 5초 ≈ 700KB
  clipMaxMs: 6500, preRollGauge: 0.6,           // 공명 60%부터 녹화 시작, 최대 6.5초
  maxBytes: 160 * 1024 * 1024,                  // 앨범 상한 160MB, 초과 시 즐겨찾기 아닌 오래된 것부터 삭제
  altMaxPx: 240, altQuality: 0.72, altMax: 3,   // 대안 컷(alts): 240px ≤ 3장
  videoMax: 10, videoMaxMs: 30000,              // 촬영 영상(kind 'video') 최근 10개 상한, 30초
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
const all = async () => { let d; try { d = await db(); } catch { return []; } return new Promise((res, rej) => { const r = d.transaction(STORE).objectStore(STORE).getAll(); r.onsuccess = () => res(r.result.map(normalizeMoment).sort((a, b) => b.ts - a.ts)); r.onerror = () => rej(r.error); }); };

/** 종류 해석 — 옛 추억(kind 없음)은 'wonder' */
export const momentKind = (m) => (m?.kind === 'photo' || m?.kind === 'video') ? m.kind : 'wonder';
/** 읽기 시 기본값 채움 (저장하지 않음 — 스키마 호환) */
export function normalizeMoment(m) {
  if (!m || typeof m !== 'object') return m;
  m.kind = momentKind(m);
  if (m.label === undefined) m.label = null;
  if (!Array.isArray(m.alts)) m.alts = [];
  if (!Array.isArray(m.box) || m.box.length !== 4 || !m.box.every(Number.isFinite)) m.box = null;
  if (!Number.isFinite(m.duration)) m.duration = 0;
  if (typeof m.edited !== 'boolean') m.edited = false;
  if (m.poster === undefined) m.poster = null;
  return m;
}

/** dataURL/Blob/이미지·비디오·캔버스 → 압축 JPEG Blob (긴 변 maxPx, quality). 실패 시 null */
export async function compressImage(src, maxPx, quality) {
  let url = null;
  try {
    if (typeof Blob !== 'undefined' && src instanceof Blob) { url = URL.createObjectURL(src); src = url; }
    const img = typeof src === 'string' ? await loadImg(src) : src;
    const w = img.naturalWidth || img.videoWidth || img.width, h = img.naturalHeight || img.videoHeight || img.height;
    if (!w || !h) return null;
    const s = Math.min(1, maxPx / Math.max(w, h)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(b => r(b ?? null), 'image/jpeg', quality));
  } catch { return null; }
  finally { if (url) URL.revokeObjectURL(url); }
}
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
/** 사진이 전혀 없을 때(영상 포스터 실패 등) 잉크 플레이트 자리표 */
async function placeholderBlob() {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 320; const x = c.getContext('2d');
    x.fillStyle = '#161D2B'; x.fillRect(0, 0, 320, 320); x.strokeStyle = 'rgba(237,230,214,.18)'; x.lineWidth = 2; x.strokeRect(1, 1, 318, 318);
    x.strokeStyle = '#E2B45A'; x.lineWidth = 3; x.beginPath(); x.arc(160, 160, 48, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(160, 160, 28, 0, Math.PI * 2); x.stroke();
    const b = await new Promise(r => c.toBlob(b => r(b ?? null), 'image/jpeg', 0.6)); if (b) return b;
  } catch {}
  return new Blob([], { type: 'image/jpeg' });
}
const sanitizeBox = (box) => (Array.isArray(box) && box.length === 4 && box.every(Number.isFinite)) ? box.map(v => Math.round(v * 1e4) / 1e4) : null;
async function normalizeAlts(alts) {
  const out = [];
  for (const a of (Array.isArray(alts) ? alts : [])) {
    if (out.length >= MEDIA.altMax) break;
    if (!a) continue;
    const b = (typeof Blob !== 'undefined' && a instanceof Blob) ? a : await compressImage(a, MEDIA.altMaxPx, MEDIA.altQuality);
    if (b && b.size) out.push(b);
  }
  return out;
}
const bytesOf = (m) => (m.photo?.size ?? 0) + (m.thumb?.size ?? 0) + (m.clip?.size ?? 0) + (m.alts || []).reduce((a, b) => a + (b?.size ?? 0), 0) + (m.photoOrig && m.photoOrig !== m.photo ? m.photoOrig.size : 0);

/**
 * 추억 저장. 옛 호출({label, grade, variant, frame, photoDataUrl, clip, clipType, friend})은 그대로 동작(kind 'wonder').
 * kind 'photo'(셔터 탭, label 은 태그일 뿐 — 도감·보상 없음) / 'video'(길게 녹화: clip + duration + poster).
 * photoDataUrl 은 dataURL·Blob·img/canvas/video 모두 허용. 영상은 poster 로 사진·썸네일을 만든다.
 */
export async function addMoment({ label = null, kind = 'wonder', grade = 'AUTO', variant = false, frame = 'default', photoDataUrl, clip = null, clipType = null, duration = 0, poster = null, friend = null, box = null, alts = [] } = {}) {
  const k = kind === 'photo' || kind === 'video' ? kind : 'wonder';
  const src = photoDataUrl ?? poster ?? null;
  let photo = src ? await compressImage(src, MEDIA.photoMaxPx, MEDIA.photoQuality) : null;
  if (!photo) photo = await placeholderBlob();
  const thumb = (src ? await compressImage(src, MEDIA.thumbMaxPx, MEDIA.thumbQuality) : null) ?? (await compressImage(photo, MEDIA.thumbMaxPx, MEDIA.thumbQuality)) ?? photo;
  const altBlobs = await normalizeAlts(alts);
  const m = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ts: Date.now(),
    kind: k, label: label ?? null, grade: grade || 'AUTO', variant: !!variant, frame: frame || 'default',
    photo, thumb, clip: clip ?? null, clipType: clipType ?? clip?.type ?? null,
    duration: Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0,
    poster: k === 'video' ? photo : null, box: sanitizeBox(box), alts: altBlobs, edited: false,
    fav: false, friend, stage: 0, caption: '', filter: 'none', recalls: 0, shares: 0, bytes: 0,
  };
  m.bytes = bytesOf(m);
  await tx('readwrite', s => s.put(m));
  await enforceCap();
  if (k === 'video') await enforceVideoCap();
  return m;
}
/** 목록 (최신순). filter = { kind:'wonder'|'photo'|'video', fav:true, friend:true|false, perfect:true, clip:true } — 인자 없으면 전체 */
export async function listMoments(filter = {}) {
  const ms = await all();
  const { kind, fav, friend, perfect, clip } = filter || {};
  return ms.filter(m =>
    (kind == null || momentKind(m) === kind) &&
    (fav == null || !!m.fav === !!fav) &&
    (friend == null || !!m.friend === !!friend) &&
    (perfect == null || (m.grade === 'PERFECT') === !!perfect) &&
    (clip == null || !!m.clip === !!clip));
}
export const getMoment = async (id) => normalizeMoment(await tx('readonly', s => s.get(id)));
/** 삭제 — 삭제된 레코드를 돌려준다 (실행 취소용: undeleteMoment(record)) */
export async function deleteMoment(id) { let rec = null; try { rec = await getMoment(id); } catch {} await tx('readwrite', s => s.delete(id)); return rec ?? null; }
/** 삭제 취소: 레코드를 그대로 다시 넣는다 */
export async function undeleteMoment(record) { if (!record?.id) return null; await tx('readwrite', s => s.put(record)); return record; }
export const updateMoment = (m) => tx('readwrite', s => s.put(m));
export async function toggleFav(id) { const m = await getMoment(id); if (!m) return; m.fav = !m.fav; await tx('readwrite', s => s.put(m)); return m.fav; }
export async function stats() { try { return await statsInner(); } catch { return { count: 0, clips: 0, videos: 0, photos: 0, wonders: 0, bytes: 0, cap: MEDIA.maxBytes, pct: 0 }; } }
async function statsInner() { const ms = await all(); const bytes = ms.reduce((a, m) => a + (m.bytes || 0), 0); const by = (k) => ms.filter(m => momentKind(m) === k).length; return { count: ms.length, clips: ms.filter(m => m.clip).length, videos: by('video'), photos: by('photo'), wonders: by('wonder'), bytes, cap: MEDIA.maxBytes, pct: Math.min(100, Math.round(bytes / MEDIA.maxBytes * 100)) }; }
async function enforceCap() {
  const ms = await all(); let bytes = ms.reduce((a, m) => a + (m.bytes || 0), 0);
  for (const m of [...ms].reverse()) { if (bytes <= MEDIA.maxBytes) break; if (m.fav) continue; await deleteMoment(m.id); bytes -= m.bytes || 0; }
}
/** 촬영 영상(kind 'video')은 최근 10개만 — 오래된 것부터, 즐겨찾기 아닌 것 우선 (원더 포획 클립은 세지 않음) */
async function enforceVideoCap() {
  const vids = (await all()).filter(m => momentKind(m) === 'video');
  let over = vids.length - MEDIA.videoMax; if (over <= 0) return;
  const oldest = [...vids].reverse();
  for (const m of oldest) { if (over <= 0) break; if (m.fav) continue; await deleteMoment(m.id); over--; }
  for (const m of oldest) { if (over <= 0) break; if (!m.fav) continue; await deleteMoment(m.id); over--; }
}
export const fmtBytes = (b) => b > 1e6 ? `${(b / 1e6).toFixed(1)}MB` : `${Math.round(b / 1e3)}KB`;
/** ms → mono 경과 `00:07` */
export const fmtDuration = (ms) => { const s = Math.max(0, Math.round((ms || 0) / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

const safeName = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');
const dateStamp = (ts) => { const d = new Date(ts || Date.now()); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
/** 꺼내기: 사진은 JPEG(편집 전 원본 우선), 영상(kind 'video')은 클립 webm/mp4 → { blob, filename, type } */
export async function exportMoment(m) {
  if (typeof m === 'string') m = await getMoment(m);
  if (!m) return null;
  const k = momentKind(m), tag = safeName(m.label) || (k === 'video' ? 'clip' : 'snap'), stamp = dateStamp(m.ts);
  if (k === 'video' && m.clip) {
    const type = m.clipType || m.clip.type || 'video/webm', ext = type.includes('mp4') ? 'mp4' : 'webm';
    return { blob: m.clip, filename: `wonder-${tag}-${stamp}.${ext}`, type };
  }
  const blob = m.photoOrig || m.photo; if (!blob) return null;
  return { blob, filename: `wonder-${tag}-${stamp}.jpg`, type: blob.type || 'image/jpeg' };
}
/** 다른 컷 고르기: alts[index] 를 카드 사진으로, 기존 사진은 같은 자리로(화질 유지 — 되돌리기 가능). 썸네일 재생성 후 저장, moment 리턴 */
export async function swapAlt(m, index) {
  if (typeof m === 'string') m = await getMoment(m);
  if (!m) return null;
  const alts = Array.isArray(m.alts) ? m.alts : [];
  const alt = alts[index]; if (!alt || !(alt instanceof Blob)) return m;
  const thumb = await compressImage(alt, MEDIA.thumbMaxPx, MEDIA.thumbQuality);
  const prevOrig = m.photoOrig ?? null;
  alts[index] = prevOrig ?? m.photo; // 편집 전 원본을 보관
  m.photo = alt; if (thumb) m.thumb = thumb; if (prevOrig) m.photoOrig = alt;
  if (momentKind(m) === 'video') m.poster = alt;
  m.alts = alts; m.bytes = bytesOf(m);
  await tx('readwrite', s => s.put(m));
  return m;
}

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
    const m = moments[i], cx = pad + (i % cols) * (cell + pad), cy = 120 + pad + Math.floor(i / cols) * (cell + cap + pad);
    const src = m.photo || m.thumb || m.poster;
    x.save(); rr(x, cx, cy, cell, cell, 10); x.clip();
    if (src) { let u = null; try { u = URL.createObjectURL(src); const img = await loadImg(u); const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, s = Math.max(cell / iw, cell / ih), sw = cell / s, sh = cell / s; x.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, cx, cy, cell, cell); } catch { x.fillStyle = '#0F141E'; x.fillRect(cx, cy, cell, cell); } finally { if (u) URL.revokeObjectURL(u); } }
    else { x.fillStyle = '#0F141E'; x.fillRect(cx, cy, cell, cell); }
    x.restore();
    x.strokeStyle = m.variant ? COLLAGE.prism : COLLAGE.line; x.lineWidth = m.variant ? 2 : 1; rr(x, cx + 0.5, cy + 0.5, cell - 1, cell - 1, 10); x.stroke();
    const k = momentKind(m), no = m.label ? ALL_LABELS.indexOf(m.label) + 1 : 0;
    const capText = no > 0 && k === 'wonder' ? `No. ${String(no).padStart(3, '0')} · ${m.label}` : k === 'video' ? `영상 · ${fmtDuration(m.duration)}${m.label ? ` · ${m.label}` : ''}` : `스냅 · ${new Date(m.ts).toLocaleDateString('ko-KR')}${m.label ? ` · ${m.label}` : ''}`;
    x.font = `500 16px ${FONT_MONO}`; x.fillStyle = COLLAGE.mute; x.textAlign = 'left'; x.fillText(capText, cx + 2, cy + cell + 21, cell - 90);
    if (m.grade === 'PERFECT' && k === 'wonder') { x.font = `700 16px ${FONT_DISPLAY}`; x.fillStyle = COLLAGE.brass; x.textAlign = 'right'; x.fillText('PERFECT', cx + cell - 2, cy + cell + 21); }
  }
  return c;
}
function rr(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
