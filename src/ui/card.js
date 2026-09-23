import { RARITY, ALL_LABELS } from '../data/wonders.js';
import { FRAMES } from '../game/economy.js';
import { state } from '../game/state.js';
import * as staging from './staging.js';

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
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * 사진 좌표계 정규화 박스 [x,y,w,h](0..1, 원본 이미지 기준) → object-fit: cover 로 잘린 표시 영역 기준 정규화 박스.
 * 보이는 영역과 겹치지 않거나 너무 작으면 null. (발견 화면·앨범의 <svg class="etch"> 에도 같은 계산을 쓸 수 있다)
 */
export function coverBox(box, iw, ih, dw, dh) {
  if (!Array.isArray(box) || box.length < 4 || !box.every(Number.isFinite) || !iw || !ih || !dw || !dh) return null;
  const s = Math.max(dw / iw, dh / ih), sw = dw / s, sh = dh / s, sx = (iw - sw) / 2, sy = (ih - sh) / 2;
  const x0 = clamp01((box[0] * iw - sx) / sw), y0 = clamp01((box[1] * ih - sy) / sh);
  const x1 = clamp01(((box[0] + box[2]) * iw - sx) / sw), y1 = clamp01(((box[1] + box[3]) * ih - sy) / sh);
  if (x1 - x0 < 0.02 || y1 - y0 < 0.02) return null;
  return [x0, y0, x1 - x0, y1 - y0];
}

/**
 * 공유용 표본 플레이트 PNG 생성 (1080×1350).
 * wonder == null / label == null 이면 단순 사진 카드: 제목 '스냅'(영상은 '영상'), 희귀도 줄 없음, mono 날짜 + 'Wonder Scanner'.
 * box(정규화 [x,y,w,h]) 가 있으면 사진 위에 각인 윤곽(황동, 선만)을 그린다 — 옛 추억(box 없음)은 그리지 않는다.
 */
export async function renderCard({ label = null, wonder = null, photo = null, isVariant = false, rankTitle = '', date = null, frame = state?.activeFrame ?? 'default', caption = '', filter = 'none', box = null, kind = null } = {}) {
  await Promise.all([document.fonts.load('600 30px Fraunces'), document.fonts.load('700 64px "Gowun Batang"'), document.fonts.load('500 30px "IBM Plex Mono"')]).catch(() => {});
  date = date ?? new Date().toLocaleDateString('ko-KR');
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const R = wonder ? (RARITY[wonder.rarity] ?? RARITY[1]) : null;
  const ink = wonder ? (isVariant ? INK.variant : R.color) : INK.line2;
  // 잉크 플레이트 + 관측실 비네트 (후광 없음)
  x.fillStyle = INK.plate; x.fillRect(0, 0, W, H);
  const vig = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85); vig.addColorStop(0, 'rgba(15,20,30,0)'); vig.addColorStop(1, 'rgba(15,20,30,.9)');
  x.fillStyle = vig; x.fillRect(0, 0, W, H);
  // 테두리: 프레임 스킨(FRAMES 색) 또는 희귀도 잉크 1px(=3px) 선 (단순 사진은 hairline)
  // 프레임 스킨은 CSS .frame-* 와 같은 두 겹 단색 각인 링 — 바깥 12px(colors[0]) → 3px 잉크 틈 → 안쪽 4px(colors[1]). 그라데이션 금지 (DESIGN 7.4, 8)
  const F = (Array.isArray(FRAMES) ? FRAMES : []).find(f => f.id === frame);
  if (F?.colors) { x.strokeStyle = F.colors[0]; x.lineWidth = 12; roundRect(x, 34, 34, W - 68, H - 68, 52); x.stroke(); x.strokeStyle = F.colors[1]; x.lineWidth = 4; roundRect(x, 45, 45, W - 90, H - 90, 41); x.stroke(); }
  else { x.strokeStyle = ink; x.lineWidth = 3; roundRect(x, 40, 40, W - 80, H - 80, 42); x.stroke(); }
  // 각인 황동 코너 틱 (플레이트 네 모서리, 뷰파인더 브래킷과 같은 언어)
  cornerTicks(x, 18, 18, W - 36, H - 36, 36);
  // 사진: 반경 10px(=30px) + hairline, cover 맞춤. 사진 위에 글자를 올리지 않는다 (윤곽 선만 허용)
  const P = { x: 120, y: 190, w: 840, h: 800 };
  let img = null;
  if (photo) { try { img = await loadImg(photo); } catch { img = null; } }
  if (img) { x.save(); roundRect(x, P.x, P.y, P.w, P.h, 30); x.clip(); x.filter = filter || 'none'; drawCover(x, img, P.x, P.y, P.w, P.h); x.filter = 'none'; x.restore(); }
  else { x.fillStyle = INK.deep; roundRect(x, P.x, P.y, P.w, P.h, 30); x.fill(); }
  // 각인 윤곽 (GAMEPLAY_V7 1.3): 포획 시점 bbox 를 cover 크롭에 맞춰 사진 위에 황동 선으로
  if (img && box) {
    const nb = coverBox(box, img.naturalWidth || img.width, img.naturalHeight || img.height, P.w, P.h);
    if (nb) { x.save(); roundRect(x, P.x, P.y, P.w, P.h, 30); x.clip(); drawEtch(x, nb, P.x, P.y, P.w, P.h, INK.brass); x.restore(); }
  }
  x.strokeStyle = INK.line2; x.lineWidth = 3; roundRect(x, P.x, P.y, P.w, P.h, 30); x.stroke();
  if (wonder) {
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
    x.font = FONT.emoji(84); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = INK.bone; x.filter = 'saturate(.85)'; x.fillText(wonder.emoji ?? '', gx, gy + 4); x.filter = 'none';
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = INK.bone;
    fitText(x, wonder.name ?? String(label ?? ''), 256, 1104, W - 96 - 256, 64, 40, FONT.title);
    x.fillStyle = INK.mute; x.font = FONT.mono(30); x.letterSpacing = '2px';
    x.fillText(label ? `${catalogNo(label)} · ${label}` : date, 256, 1160);
    x.letterSpacing = '0px';
  } else {
    // 단순 사진 카드: 제목 '스냅' / '영상', 희귀도 줄 없음, mono 날짜(+태그 라벨)
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = INK.bone;
    fitText(x, kind === 'video' ? '영상' : '스냅', 96, 1104, W - 192, 64, 40, FONT.title);
    x.fillStyle = INK.mute; x.font = FONT.mono(30); x.letterSpacing = '2px';
    x.fillText(`${date}${label ? ` · ${label}` : ''}`, 96, 1160);
    x.letterSpacing = '0px';
  }
  if (caption) { x.fillStyle = INK.bone2; fitText(x, `“${caption.slice(0, 40)}”`, 96, 1214, W - 192, 28, 20, FONT.quote); }
  // 푸터: hairline 위에 워드마크(좌, Fraunces) · 등급·날짜(우, Mono)
  x.strokeStyle = INK.line; x.lineWidth = 3; x.beginPath(); x.moveTo(96, 1240); x.lineTo(W - 96, 1240); x.stroke();
  x.font = FONT.display(30); x.fillStyle = INK.bone2; x.textAlign = 'left'; x.fillText('Wonder Scanner', 96, 1294);
  const foot = wonder ? [rankTitle, date].filter(Boolean).join(' · ') : (rankTitle || '');
  if (foot) { x.font = FONT.mono(30); x.fillStyle = INK.mute; x.textAlign = 'right'; x.fillText(foot, W - 96, 1294); }
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

/** 각인 윤곽: staging.drawEtchCanvas 가 있으면 그것(발견·앨범과 같은 선), 없으면 같은 사양의 폴백 (황동 1.5px×스케일, 반경 14px×스케일, 코너 틱 4개) */
function drawEtch(x, nb, X, Y, W, H, color) {
  if (typeof staging.drawEtchCanvas === 'function') {
    // staging.drawEtchCanvas 는 "정사각 원본이 rect 에 cover" 변환을 스스로 적용하므로, 이미 cover 보정된 nb 를 그 역변환으로 되돌려 넘긴다 (정사각 스냅샷이면 원래 box 와 동일)
    const S = Math.max(W, H), inv = [(nb[0] * W + (S - W) / 2) / S, (nb[1] * H + (S - H) / 2) / S, nb[2] * W / S, nb[3] * H / S];
    try { if (staging.drawEtchCanvas(x, inv, X, Y, W, H, color) !== false) return; } catch {}
  }
  const k = W / 390, bx = X + nb[0] * W, by = Y + nb[1] * H, bw = nb[2] * W, bh = nb[3] * H, r = Math.min(14 * k, bw / 2, bh / 2), t = Math.min(10 * k, bw / 3, bh / 3);
  x.save(); x.strokeStyle = color; x.lineCap = 'round'; x.lineJoin = 'round';
  x.globalAlpha = 0.9; x.lineWidth = 1.5 * k; roundRect(x, bx, by, bw, bh, r); x.stroke();
  x.globalAlpha = 1; x.lineWidth = 2.5 * k; x.beginPath();
  x.moveTo(bx, by + t); x.lineTo(bx, by + r * 0.35); x.moveTo(bx + r * 0.35, by); x.lineTo(bx + t, by);
  x.moveTo(bx + bw - t, by); x.lineTo(bx + bw - r * 0.35, by); x.moveTo(bx + bw, by + r * 0.35); x.lineTo(bx + bw, by + t);
  x.moveTo(bx, by + bh - t); x.lineTo(bx, by + bh - r * 0.35); x.moveTo(bx + r * 0.35, by + bh); x.lineTo(bx + t, by + bh);
  x.moveTo(bx + bw - t, by + bh); x.lineTo(bx + bw - r * 0.35, by + bh); x.moveTo(bx + bw, by + bh - r * 0.35); x.lineTo(bx + bw, by + bh - t);
  x.stroke(); x.restore();
}
function roundRect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
function loadImg(src) { return new Promise((res, rej) => { if (src && typeof src === 'object' && (src.naturalWidth || src.videoWidth || src.width)) return res(src); const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
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
