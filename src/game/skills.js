// 렌즈 스킬: 추억 사진에 쓰는 편집 능력. 랭크로 해금되거나 상점에서 구매. 사용하면 추억 성장 포인트.
import { state, save, rank } from './state.js';

export const SKILLS = [
  { id: 'emoji',  icon: '😄', name: '이모티콘',  desc: '사진 위에 이모지를 붙인다',            unlockLevel: 1, price: 0 },
  { id: 'tone',   icon: '🎨', name: '톤보정',    desc: '밝기·대비·채도·온도 슬라이더',        unlockLevel: 2, price: 120 },
  { id: 'shape',  icon: '🔷', name: '쉐입',      desc: '스포트라이트·말풍선·별 버스트·폴라로이드', unlockLevel: 3, price: 180 },
  { id: 'warp',   icon: '🌀', name: '왜곡',      desc: '볼록·오목·소용돌이 렌즈',             unlockLevel: 4, price: 240 },
  { id: 'hidden', icon: '🫥', name: '숨은사진',  desc: '작은 이모지를 숨기거나 사진을 가려 찾게 한다', unlockLevel: 5, price: 300 },
  { id: 'glow',   icon: '✨', name: '광채',      desc: '비네트 + 반짝이 입자',                unlockLevel: 6, price: 200 },
];
export const ownsSkill = (id) => { const s = SKILLS.find(s => s.id === id); return !!s && (rank().level >= s.unlockLevel || (state.skills || []).includes(id)); };
export const ownedSkills = () => SKILLS.filter(s => ownsSkill(s.id));
export function buySkill(id) { const s = SKILLS.find(x => x.id === id); if (!s) return { ok: false, msg: '없는 스킬' }; if (ownsSkill(id)) return { ok: false, msg: '이미 보유' }; if (state.dust < s.price) return { ok: false, msg: `별가루 ${s.price - state.dust} 부족` }; state.dust -= s.price; (state.skills ||= []).push(id); save(); return { ok: true, item: s }; }

// ── 이미지 연산 (모두 캔버스 2D, 640px 기준)
export function toneCss({ brightness = 100, contrast = 100, saturate = 100, temp = 0 } = {}) {
  const t = temp; // -100(차갑게) ~ +100(따뜻하게)
  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)${t > 0 ? ` sepia(${t / 250}) saturate(${100 + t / 2}%)` : t < 0 ? ` hue-rotate(${t / 6}deg) brightness(${100 + t / 20}%)` : ''}`;
}
/** 왜곡: 역매핑 픽셀 리샘플 (mode: bulge|pinch|swirl), strength 0~1, 중심 (cx,cy) 0~1 */
export function applyWarp(ctx, w, h, { mode = 'bulge', strength = 0.5, cx = 0.5, cy = 0.5, radius = 0.45 }) {
  const src = ctx.getImageData(0, 0, w, h), out = ctx.createImageData(w, h), s = src.data, d = out.data;
  const CX = cx * w, CY = cy * h, R = radius * Math.min(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let dx = x - CX, dy = y - CY; const dist = Math.hypot(dx, dy); let sx = x, sy = y;
    if (dist < R) {
      const t = dist / R;
      if (mode === 'bulge') { const f = Math.pow(t, 1 + strength * 1.5); sx = CX + dx * (f / (t || 1)); sy = CY + dy * (f / (t || 1)); }
      else if (mode === 'pinch') { const f = Math.pow(t, 1 / (1 + strength * 1.5)); sx = CX + dx * (f / (t || 1)); sy = CY + dy * (f / (t || 1)); }
      else { const a = strength * 3 * (1 - t); const c = Math.cos(a), sn = Math.sin(a); sx = CX + dx * c - dy * sn; sy = CY + dx * sn + dy * c; }
    }
    const ix = Math.max(0, Math.min(w - 1, Math.round(sx))), iy = Math.max(0, Math.min(h - 1, Math.round(sy)));
    const si = (iy * w + ix) * 4, di = (y * w + x) * 4; d[di] = s[si]; d[di + 1] = s[si + 1]; d[di + 2] = s[si + 2]; d[di + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
}
export function drawEmoji(ctx, w, h, { emoji, x, y, size = 0.18, rot = 0 }) { ctx.save(); ctx.translate(x * w, y * h); ctx.rotate(rot); ctx.font = `${Math.round(size * w)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(emoji, 0, 0); ctx.restore(); }
export const SHAPES = [
  { id: 'spot', name: '스포트라이트' }, { id: 'bubble', name: '말풍선' }, { id: 'burst', name: '별 버스트' }, { id: 'polaroid', name: '폴라로이드' }, { id: 'rainbow', name: '무지개 테두리' },
];
export function drawShape(ctx, w, h, { id, x = 0.5, y = 0.5, text = '', color = '#ffd166' }) {
  ctx.save();
  if (id === 'spot') { const g = ctx.createRadialGradient(x * w, y * h, w * 0.12, x * w, y * h, w * 0.6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.75)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  else if (id === 'bubble') { const bw = w * 0.6, bh = h * 0.16, bx = Math.min(Math.max(x * w - bw / 2, 8), w - bw - 8), by = Math.max(8, y * h - bh - h * 0.08); ctx.fillStyle = '#fff'; rr(ctx, bx, by, bw, bh, 18); ctx.fill(); ctx.beginPath(); ctx.moveTo(x * w - 12, by + bh); ctx.lineTo(x * w, by + bh + 22); ctx.lineTo(x * w + 12, by + bh); ctx.fill(); ctx.fillStyle = '#0b0f1a'; ctx.font = `700 ${Math.round(bh * 0.36)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((text || '!!').slice(0, 18), bx + bw / 2, by + bh / 2); }
  else if (id === 'burst') { ctx.translate(x * w, y * h); for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = i % 2 ? color : '#fff'; ctx.beginPath(); ctx.moveTo(0, -w * 0.06); ctx.lineTo(w * 0.02, -w * 0.02); ctx.lineTo(0, w * 0.35); ctx.lineTo(-w * 0.02, -w * 0.02); ctx.closePath(); ctx.globalAlpha = 0.85; ctx.fill(); } }
  else if (id === 'polaroid') { ctx.fillStyle = '#f7f3ea'; ctx.fillRect(0, 0, w, h * 0.06); ctx.fillRect(0, h * 0.86, w, h * 0.14); ctx.fillRect(0, 0, w * 0.06, h); ctx.fillRect(w * 0.94, 0, w * 0.06, h); ctx.fillStyle = '#333'; ctx.font = `italic ${Math.round(h * 0.045)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText((text || 'wonder').slice(0, 24), w / 2, h * 0.945); }
  else if (id === 'rainbow') { const g = ctx.createLinearGradient(0, 0, w, h); ['#ff6ea8', '#ffd166', '#7cf59a', '#6ee7ff', '#a78bfa'].forEach((c, i) => g.addColorStop(i / 4, c)); ctx.strokeStyle = g; ctx.lineWidth = w * 0.035; rr(ctx, ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, w * 0.06); ctx.stroke(); }
  ctx.restore();
}
export function drawGlow(ctx, w, h, { vignette = 0.6, sparkles = 40, seed = 7 }) {
  const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,10,40,${vignette})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  let s = seed; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < sparkles; i++) { const x = r() * w, y = r() * h, sz = 1 + r() * 3.5; ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.6})`; ctx.beginPath(); ctx.moveTo(x, y - sz * 2); ctx.lineTo(x + sz * 0.5, y); ctx.lineTo(x, y + sz * 2); ctx.lineTo(x - sz * 0.5, y); ctx.closePath(); ctx.fill(); ctx.fillRect(x - sz * 2, y - 0.5, sz * 4, 1); }
}
/** 편집 파라미터를 사진에 굽는다 → Blob. edit = { tone, warp, shapes[], emojis[], glow, hidden } */
export async function bakeEdit(photoBlob, edit, maxPx = 640) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(photoBlob); });
  const sc = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight)); const w = Math.round(img.naturalWidth * sc), h = Math.round(img.naturalHeight * sc);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true });
  x.filter = edit.tone ? toneCss(edit.tone) : 'none'; x.drawImage(img, 0, 0, w, h); x.filter = 'none';
  if (edit.warp) applyWarp(x, w, h, edit.warp);
  for (const s of edit.shapes || []) drawShape(x, w, h, s);
  if (edit.glow) drawGlow(x, w, h, edit.glow);
  for (const e of edit.emojis || []) drawEmoji(x, w, h, e);
  if (edit.hidden?.emoji) { x.globalAlpha = 0.55; drawEmoji(x, w, h, { emoji: edit.hidden.emoji, x: edit.hidden.x, y: edit.hidden.y, size: 0.035 }); x.globalAlpha = 1; }
  URL.revokeObjectURL(img.src);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
}
function rr(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
export const EMOJI_PALETTE = ['😄', '😍', '🤩', '😎', '🥳', '😱', '👀', '❤️', '🔥', '⭐', '✨', '💫', '🎉', '👑', '🌈', '🍀', '🔭', '🫧', '💎', '🐾'];
