import { RARITY } from '../data/wonders.js';
import { FRAMES } from '../game/economy.js';
import { state } from '../game/state.js';

/** 공유용 카드 PNG 생성 (1080×1350) */
export async function renderCard({ label, wonder, photo, isVariant, rankTitle, date, frame = state.activeFrame, caption = '', filter = 'none' }) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); const R = RARITY[wonder.rarity];
  const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#1a2338'); bg.addColorStop(1, '#0b0f1a');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  // 후광
  const glow = x.createRadialGradient(W / 2, 520, 50, W / 2, 520, 700); glow.addColorStop(0, R.glow); glow.addColorStop(1, 'transparent');
  x.fillStyle = glow; x.fillRect(0, 0, W, H);
  // 프레임
  const F = FRAMES.find(f => f.id === frame);
  if (F?.colors) { const fg = x.createLinearGradient(0, 0, W, H); F.colors.forEach((c, i) => fg.addColorStop(i / (F.colors.length - 1), c)); x.strokeStyle = fg; x.lineWidth = 16; roundRect(x, 34, 34, W - 68, H - 68, 52); x.stroke(); x.lineWidth = 4; x.strokeStyle = 'rgba(255,255,255,.6)'; roundRect(x, 52, 52, W - 104, H - 104, 40); x.stroke(); }
  else { x.strokeStyle = isVariant ? '#ff8ad4' : R.color; x.lineWidth = 10; roundRect(x, 40, 40, W - 80, H - 80, 48); x.stroke(); }
  // 사진
  if (photo) { const img = await loadImg(photo); x.save(); roundRect(x, 120, 200, 840, 840, 36); x.clip(); x.filter = filter || 'none'; x.drawImage(img, 120, 200, 840, 840); x.filter = 'none'; x.restore(); }
  if (caption) { x.font = 'italic 500 30px system-ui'; x.fillStyle = '#f3e7c4'; x.textAlign = 'center'; x.fillText(`“${caption.slice(0, 40)}”`, W / 2, 1235); }
  x.fillStyle = '#fff'; x.textAlign = 'center';
  x.font = '700 40px system-ui'; x.fillStyle = R.color; x.fillText(`${R.stars}  ${R.label}${isVariant ? ' · ✨프리즘 변이체' : ''}`, W / 2, 150);
  x.font = '900 64px system-ui'; x.fillStyle = '#fff'; wrap(x, wonder.name, W / 2, 1120, 900, 72);
  x.font = '400 30px system-ui'; x.fillStyle = '#8b95ad'; x.fillText(`(원래 이름: ${label})`, W / 2, 1195);
  x.font = '700 28px system-ui'; x.fillStyle = '#c9d1e3'; x.textAlign = 'left'; x.fillText(`🔭 WONDER SCANNER`, 90, 1275);
  x.textAlign = 'right'; x.fillStyle = '#8b95ad'; x.fillText(`${rankTitle} · ${date}`, W - 90, 1275);
  x.font = '120px system-ui'; x.textAlign = 'center'; x.fillText(wonder.emoji, W / 2, 1040);
  return c;
}

export async function shareCard(canvas, title) {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], `wonder-${Date.now()}.png`, { type: 'image/png' });
  const touch = matchMedia('(pointer: coarse)').matches; // 데스크톱은 공유 시트 대신 즉시 다운로드
  if (touch && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title, text: `${title} — 🔭 WONDER SCANNER` }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000); return 'downloaded';
}

function roundRect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function wrap(x, text, cx, y, maxW, lh) { const words = text.split(' '); let line = '', lines = []; for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; } lines.push(line); lines.forEach((l, i) => x.fillText(l, cx, y + i * lh)); }

/** 임의 Blob(클립 등) 공유/다운로드 */
export async function shareBlob(blob, filename, title) {
  const file = new File([blob], filename, { type: blob.type });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return 'downloaded';
}
