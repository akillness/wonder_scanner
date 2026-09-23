import { RARITY, ALL_LABELS } from '../data/wonders.js';
import { FRAMES } from '../game/economy.js';
import { state } from '../game/state.js';

// 표본 플레이트 팔레트 (DESIGN.md §2) — 악센트는 황동 하나, 순수 검정·흰색 없음
const INK = { plate: '#161D2B', deep: '#0F141E', bone: '#EDE6D6', bone2: '#CFC7B4', mute: '#8F8A7C', brass: '#E2B45A', line: 'rgba(237,230,214,.10)', line2: 'rgba(237,230,214,.18)', variant: '#E39BC0' };
const FONT = {
  display: (s) => `600 ${s}px Fraunces, "Gowun Batang", serif`,
  title: (s) => `700 ${s}px "Gowun Batang", serif`,
  mono: (s) => `500 ${s}px "IBM Plex Mono", monospace`,
  quote: (s) => `italic 500 ${s}px "Gowun Batang", serif`,
  emoji: (s) => `${s}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,
};
const catalogNo = (label) => `No. ${String(ALL_LABELS.indexOf(label) + 1).padStart(3, '0')}`;

/** 공유용 표본 플레이트 PNG 생성 (1080×1350) */
export async function renderCard({ label, wonder, photo, isVariant, rankTitle, date, frame = state.activeFrame, caption = '', filter = 'none' }) {
  await Promise.all([document.fonts.load('600 30px Fraunces'), document.fonts.load('700 64px "Gowun Batang"'), document.fonts.load('500 30px "IBM Plex Mono"')]).catch(() => {});
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); const R = RARITY[wonder.rarity]; const ink = isVariant ? INK.variant : R.color;
  // 잉크 플레이트 + 관측실 비네트 (후광 없음)
  x.fillStyle = INK.plate; x.fillRect(0, 0, W, H);
  const vig = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85); vig.addColorStop(0, 'rgba(15,20,30,0)'); vig.addColorStop(1, 'rgba(15,20,30,.9)');
  x.fillStyle = vig; x.fillRect(0, 0, W, H);
  // 테두리: 프레임 스킨(FRAMES 색) 또는 희귀도 잉크 1px(=3px) 선
  // 프레임 스킨은 CSS .frame-* 와 같은 두 겹 단색 각인 링 — 바깥 12px(colors[0]) → 3px 잉크 틈 → 안쪽 4px(colors[1]). 그라데이션 금지 (DESIGN 7.4, 8)
  const F = FRAMES.find(f => f.id === frame);
  if (F?.colors) { x.strokeStyle = F.colors[0]; x.lineWidth = 12; roundRect(x, 34, 34, W - 68, H - 68, 52); x.stroke(); x.strokeStyle = F.colors[1]; x.lineWidth = 4; roundRect(x, 45, 45, W - 90, H - 90, 41); x.stroke(); }
  else { x.strokeStyle = ink; x.lineWidth = 3; roundRect(x, 40, 40, W - 80, H - 80, 42); x.stroke(); }
  // 각인 황동 코너 틱 (플레이트 네 모서리, 뷰파인더 브래킷과 같은 언어)
  cornerTicks(x, 18, 18, W - 36, H - 36, 36);
  // 사진: 반경 10px(=30px) + hairline, cover 맞춤. 사진 위에 글자를 올리지 않는다
  const P = { x: 120, y: 190, w: 840, h: 800 };
  if (photo) { const img = await loadImg(photo); x.save(); roundRect(x, P.x, P.y, P.w, P.h, 30); x.clip(); x.filter = filter || 'none'; drawCover(x, img, P.x, P.y, P.w, P.h); x.filter = 'none'; x.restore(); }
  else { x.fillStyle = INK.deep; roundRect(x, P.x, P.y, P.w, P.h, 30); x.fill(); }
  x.strokeStyle = INK.line2; x.lineWidth = 3; roundRect(x, P.x, P.y, P.w, P.h, 30); x.stroke();
  // 희귀도 도장 (좌상단, -6°, 희귀도 잉크 테두리 + 깊은 잉크 채움, 시길은 데이터의 R.stars)
  const stampText = `${R.stars}  ${R.label}${isVariant ? ' · 프리즘 변이체' : ''}`;
  x.font = FONT.display(34); x.textAlign = 'left'; x.textBaseline = 'middle';
  const sw = Math.ceil(x.measureText(stampText).width) + 44, sh = 62, sx = 96, sy = 86;
  x.save(); x.translate(sx + sw / 2, sy + sh / 2); x.rotate(-6 * Math.PI / 180);
  x.fillStyle = INK.deep; roundRect(x, -sw / 2, -sh / 2, sw, sh, 12); x.fill(); x.strokeStyle = ink; x.lineWidth = 3; x.stroke();
  x.fillStyle = ink; x.fillText(stampText, -sw / 2 + 22, 2); x.restore();
  // 글리프 렌즈 접시 (원더 이모지는 §4.11 의 유일한 예외, saturate .85) + 원더 이름 + 카탈로그 번호 · 원래 이름
  const gx = 160, gy = 1112;
  x.fillStyle = INK.deep; x.beginPath(); x.arc(gx, gy, 66, 0, Math.PI * 2); x.fill(); x.strokeStyle = INK.line2; x.lineWidth = 3; x.stroke();
  x.font = FONT.emoji(84); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = INK.bone; x.filter = 'saturate(.85)'; x.fillText(wonder.emoji, gx, gy + 4); x.filter = 'none';
  x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = INK.bone;
  fitText(x, wonder.name, 256, 1104, W - 96 - 256, 64, 40, FONT.title);
  x.fillStyle = INK.mute; x.font = FONT.mono(30); x.letterSpacing = '2px';
  x.fillText(`${catalogNo(label)} · ${label}`, 256, 1160);
  x.letterSpacing = '0px';
  if (caption) { x.fillStyle = INK.bone2; fitText(x, `“${caption.slice(0, 40)}”`, 96, 1214, W - 192, 28, 20, FONT.quote); }
  // 푸터: hairline 위에 워드마크(좌, Fraunces) · 등급·날짜(우, Mono)
  x.strokeStyle = INK.line; x.lineWidth = 3; x.beginPath(); x.moveTo(96, 1240); x.lineTo(W - 96, 1240); x.stroke();
  x.font = FONT.display(30); x.fillStyle = INK.bone2; x.textAlign = 'left'; x.fillText('Wonder Scanner', 96, 1294);
  x.font = FONT.mono(30); x.fillStyle = INK.mute; x.textAlign = 'right'; x.fillText(`${rankTitle} · ${date}`, W - 96, 1294);
  return c;
}

export async function shareCard(canvas, title) {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], `wonder-${Date.now()}.png`, { type: 'image/png' });
  const touch = matchMedia('(pointer: coarse)').matches; // 데스크톱은 공유 시트 대신 즉시 다운로드
  if (touch && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title, text: `${title} — Wonder Scanner` }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000); return 'downloaded';
}

function roundRect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
/** object-fit: cover 로 그리기 (왜곡 없이 중앙 크롭) */
function drawCover(x, img, dx, dy, dw, dh) { const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height; const s = Math.max(dw / iw, dh / ih); const sw = dw / s, sh = dh / s; x.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, dx, dy, dw, dh); }
/** 황동 각인 코너 틱: 네 모서리에 L 길이의 ㄱ자 선 */
function cornerTicks(x, X, Y, W, H, L) {
  x.strokeStyle = INK.brass; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath();
  x.moveTo(X, Y + L); x.lineTo(X, Y); x.lineTo(X + L, Y);
  x.moveTo(X + W - L, Y); x.lineTo(X + W, Y); x.lineTo(X + W, Y + L);
  x.moveTo(X, Y + H - L); x.lineTo(X, Y + H); x.lineTo(X + L, Y + H);
  x.moveTo(X + W - L, Y + H); x.lineTo(X + W, Y + H); x.lineTo(X + W, Y + H - L);
  x.stroke(); x.lineCap = 'butt';
}
/** 폭에 맞을 때까지 글자 크기를 줄여 한 줄로 그린다 (줄바꿈 대신 축소) */
function fitText(x, text, X, Y, maxW, size, min, font) { let s = size; x.font = font(s); while (s > min && x.measureText(text).width > maxW) { s -= 2; x.font = font(s); } x.fillText(text, X, Y, maxW); }

/** 임의 Blob(클립 등) 공유/다운로드 */
export async function shareBlob(blob, filename, title) {
  const file = new File([blob], filename, { type: blob.type });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return 'downloaded';
}
