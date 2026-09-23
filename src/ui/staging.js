import './staging.css';

/**
 * staging.js — GAMEPLAY_V7 §1 추적 실루엣 · §2 액션 연출 · §4.3 아이 임팩트(드로잉만)
 *
 * 원칙: 시뮬레이션 진실(감지·게이지·등급·보상)은 건드리지 않는다. 여기는 "보이는 층"만.
 *  - 모든 draw* 는 캔버스 한 패스, 프레임당 힙 할당 0 (스크래치 배열·룩업 테이블 재사용).
 *  - 좌표 규약: box = 소스(비디오/이미지) 픽셀 공간 [x,y,w,h], tf = overlay.coverTransform(source, cw, ch) → 화면 = box*s + (ox,oy).
 *  - 모션 줄이기: 잔상·번쩍·프리즈·줌·스피드라인·스트릭·링·스파크 OFF, 각인 윤곽·틱·태그·잔영·도장 고정은 유지.
 *  - 팔레트: DESIGN.md 토큰만.
 */

// ── 잉크 (DESIGN.md §2)
const BONE = '#EDE6D6', BRASS = '#E2B45A', EMBER = '#D2706A', VERDIGRIS = '#6DB5A0', INK0 = '#0F141E', INK1 = '#161D2B';
const BONE_60 = 'rgba(237,230,214,.6)';
const FONT_MONO = '500 12px "IBM Plex Mono", monospace';
const TAU = Math.PI * 2, HALF = Math.PI / 2;

// ── 상수 (연출 — BALANCE 에 넣지 않는다)
export const SILHOUETTE = { trailEveryMs: 80, trailLen: 12, lossLingerMs: 1500, tickAt: [0.25, 0.5, 0.75, 1], snapFlashMs: 120 };
export const STAGING = {
  lockOnMs: 120, pulseMs: 300, spotlightMs: 80, spotlightAlpha: 0.4, freezeMs: 90,
  punch: { PERFECT: 1.06, GREAT: 1.03, GOOD: 1.03, AUTO: 1.0 },
  lines: { PERFECT: 16, GREAT: 8, GOOD: 8, AUTO: 0 }, linesMs: 200,
  missMs: 300, missPx: 60, spiritMs: 250, revealSilhouetteMs: 400,
  eye: { blinkMs: 180, impactMs: 360, rings: 2, sparks: 12, flashMs: 180 },
  shutter: { flashMs: 120, flyMs: 250 },
};

// ── 공용 헬퍼 (할당 없음)
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const easeOut = t => 1 - (1 - t) * (1 - t) * (1 - t);           // ≈ --ease-out
const RM_MQ = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
/** 호출자 플래그 + prefers-reduced-motion + :root.reduce-motion 모두 존중 (DESIGN 6) */
const rm = flag => !!flag || !!(RM_MQ && RM_MQ.matches) || (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion'));
const SCR = [0, 0, 0, 0];                                        // 화면 좌표 스크래치 [X,Y,W,H]
const DASH = [0, 0], DASH_66 = [6, 6], DASH_NONE = [];
function toScreen(box, tf, out = SCR) {
  const s = tf?.s ?? 1, ox = tf?.ox ?? 0, oy = tf?.oy ?? 0;
  out[0] = box[0] * s + ox; out[1] = box[1] * s + oy; out[2] = box[2] * s; out[3] = box[3] * s; return out;
}
/** 반경 r 둥근 사각 경로 (시계 방향, 시작점 = 좌상단 코너 직후). 둘레 = 2(W+H) − 8r + 2πr */
function etchPath(x, X, Y, W, H, r) {
  x.beginPath(); x.moveTo(X + r, Y);
  x.lineTo(X + W - r, Y); x.arc(X + W - r, Y + r, r, -HALF, 0);
  x.lineTo(X + W, Y + H - r); x.arc(X + W - r, Y + H - r, r, 0, HALF);
  x.lineTo(X + r, Y + H); x.arc(X + r, Y + H - r, r, HALF, Math.PI);
  x.lineTo(X, Y + r); x.arc(X + r, Y + r, r, Math.PI, Math.PI + HALF);
  x.closePath();
}
const etchRadius = (W, H, want = 14) => Math.max(0, Math.min(want, W / 2, H / 2));
const perimeter = (W, H, r) => 2 * (W + H) - 8 * r + TAU * r;
/** 코너 틱 (10px L 자) — 시계 순서 TR, BR, BL, TL (둘레 채움 방향과 일치) */
function cornerTick(x, X, Y, W, H, i, L) {
  if (i === 0) { x.moveTo(X + W - L, Y); x.lineTo(X + W, Y); x.lineTo(X + W, Y + L); }
  else if (i === 1) { x.moveTo(X + W, Y + H - L); x.lineTo(X + W, Y + H); x.lineTo(X + W - L, Y + H); }
  else if (i === 2) { x.moveTo(X + L, Y + H); x.lineTo(X, Y + H); x.lineTo(X, Y + H - L); }
  else { x.moveTo(X, Y + L); x.lineTo(X, Y); x.lineTo(X + L, Y); }
}
// 결정적 지터·길이 테이블 (스피드라인·스파크 — Math.random 없음, 프레임당 할당 0)
const LOSS_TXT = '놓침 · 다시 비춰 봐'; let lossTw = 0;                 // 태그 폭은 첫 측정 후 캐시 (프레임당 measureText 없음)
const JIT = [0.13, -0.21, 0.07, 0.18, -0.09, 0.22, -0.15, 0.04, 0.19, -0.11, 0.08, -0.2, 0.16, -0.05, 0.11, -0.17];
const LEN = [26, 18, 34, 22, 30, 20, 28, 24, 32, 19, 27, 21, 33, 23, 29, 25];

// ═══════════════════════════════════════════════════════════════════════════
// §1 추적 실루엣
// ═══════════════════════════════════════════════════════════════════════════
/**
 * createSilhouette() → 각인 윤곽 + 잔상 궤적(링 버퍼 12) + 상실 잔영.
 *  push(box, now)          80ms 마다 링 버퍼에 저장 (draw 가 내부에서도 호출하므로 생략 가능, 중복 호출 무해)
 *  setLoss(box, now)       타겟 상실: 마지막 bbox 를 1.5s 점선 잔영으로 (box 생략 시 last)
 *  clearLoss() / reset()
 *  get last                마지막 소스 박스 (내부 배열 참조 — 복사해서 쓸 것) | null
 *  snapshot()              { trail:[[x,y,w,h]…oldest→newest], last, loss } (디버그용, 복사본)
 *  draw(x, { box, gauge, color, now, mode, reduceMotion, tf })
 *  drawLoss(x, { now, reduceMotion, tf }) → boolean (아직 그리는 중이면 true)
 */
export function createSilhouette() {
  const N = SILHOUETTE.trailLen;
  const trail = new Float64Array(N * 4), trailTs = new Float64Array(N);
  let head = 0, count = 0, lastPush = -Infinity;
  const last = [0, 0, 0, 0]; let hasLast = false;
  const loss = [0, 0, 0, 0]; let lossAt = 0;
  let wasFull = false, snapAt = 0;

  function push(box, now) {
    if (!box) return;
    last[0] = box[0]; last[1] = box[1]; last[2] = box[2]; last[3] = box[3]; hasLast = true;
    if (now - lastPush < SILHOUETTE.trailEveryMs) return;
    const o = head * 4; trail[o] = box[0]; trail[o + 1] = box[1]; trail[o + 2] = box[2]; trail[o + 3] = box[3]; trailTs[head] = now;
    head = (head + 1) % N; if (count < N) count++; lastPush = now;
  }
  function reset() { head = 0; count = 0; lastPush = -Infinity; hasLast = false; lossAt = 0; wasFull = false; snapAt = 0; }

  return {
    push,
    setLoss(box, now) { const b = box ?? (hasLast ? last : null); if (!b) return; loss[0] = b[0]; loss[1] = b[1]; loss[2] = b[2]; loss[3] = b[3]; lossAt = now ?? performance.now(); head = 0; count = 0; lastPush = -Infinity; wasFull = false; snapAt = 0; },
    clearLoss() { lossAt = 0; },
    reset,
    get last() { return hasLast ? last : null; },
    snapshot() {
      const t = [];
      for (let i = 0; i < count; i++) { const idx = (head - count + i + N) % N, o = idx * 4; t.push([trail[o], trail[o + 1], trail[o + 2], trail[o + 3]]); }
      return { trail: t, last: hasLast ? [...last] : null, loss: lossAt ? { box: [...loss], at: lossAt } : null };
    },
    /** 각인 윤곽(둘레 = gauge) + 코너 틱 + 잔상 궤적 + 100% 황동 번쩍. 캔버스 한 패스, 할당 0 */
    draw(x, { box, gauge = 0, color, now = performance.now(), mode = 'scan', reduceMotion = false, tf } = {}) {
      if (!box) return false;
      push(box, now);
      const quiet = rm(reduceMotion);
      const s = tf?.s ?? 1, ox = tf?.ox ?? 0, oy = tf?.oy ?? 0;
      // ① 잔상 궤적: 오래된 것 → 최신 순으로 alpha 0 → .30 (꼬리), Bone 1px. 모션 줄이기면 생략
      if (!quiet && count > 1) {
        x.lineWidth = 1; x.strokeStyle = BONE; x.setLineDash(DASH_NONE);
        for (let i = 0; i < count - 1; i++) {
          const idx = (head - count + i + N) % N, o = idx * 4;
          const X = trail[o] * s + ox, Y = trail[o + 1] * s + oy, W = trail[o + 2] * s, H = trail[o + 3] * s;
          x.globalAlpha = 0.30 * (i + 1) / count; etchPath(x, X, Y, W, H, etchRadius(W, H)); x.stroke();
        }
        x.globalAlpha = 1;
      }
      // ② 각인 윤곽
      const b = toScreen(box, tf); const X = b[0], Y = b[1], W = b[2], H = b[3];
      const r = etchRadius(W, H), len = perimeter(W, H, r), g = clamp01(gauge);
      const full = g >= 1 || mode === 'capture' || mode === 'grade';
      if (full && !wasFull) snapAt = now; wasFull = full;
      const flash = full && !quiet && snapAt > 0 && now - snapAt < SILHOUETTE.snapFlashMs;
      const ink = color || BONE_60;
      x.lineWidth = flash ? 3 : 1.5; x.strokeStyle = flash ? BRASS : ink; x.lineCap = 'round'; x.lineJoin = 'round';
      if (full) x.setLineDash(DASH_NONE); else { DASH[0] = len * g; DASH[1] = len; x.setLineDash(DASH); }
      etchPath(x, X, Y, W, H, r); x.stroke(); x.setLineDash(DASH_NONE);
      // ③ 코너 틱: 25/50/75/100% 에서 하나씩 (한 번의 stroke)
      const L = Math.max(0, Math.min(10, W / 2, H / 2)); let any = false;
      x.beginPath();
      for (let i = 0; i < 4; i++) if (full || g >= SILHOUETTE.tickAt[i]) { cornerTick(x, X, Y, W, H, i, L); any = true; }
      if (any) { x.lineWidth = flash ? 3 : 2; x.stroke(); }
      x.lineCap = 'butt'; x.lineJoin = 'miter';
      return true;
    },
    /** 상실 잔영: 마지막 bbox 점선 [6,6] alpha .6→0 (1.5s) + mono 태그 `놓침 · 다시 비춰 봐`. 모션 줄이기에서도 유지 */
    drawLoss(x, { now = performance.now(), reduceMotion = false, tf } = {}) {
      if (!lossAt) return false;
      const p = (now - lossAt) / SILHOUETTE.lossLingerMs;
      if (p >= 1) { lossAt = 0; return false; }
      const a = 0.6 * (1 - p);
      const b = toScreen(loss, tf); const X = b[0], Y = b[1], W = b[2], H = b[3];
      x.globalAlpha = a; x.lineWidth = 1; x.strokeStyle = BONE; x.setLineDash(DASH_66);
      etchPath(x, X, Y, W, H, etchRadius(W, H)); x.stroke(); x.setLineDash(DASH_NONE);
      // 태그 (잉크 플레이트 + mono) — 박스 위 중앙
      const cx = X + W / 2, ty = Y - 30; x.font = FONT_MONO; x.textAlign = 'center';
      if (!lossTw) lossTw = x.measureText(LOSS_TXT).width + 24; const tw = lossTw; x.fillStyle = INK1; x.globalAlpha = a * 1.4 > 0.9 ? 0.9 : a * 1.4;
      etchPath(x, cx - tw / 2, ty, tw, 24, 8); x.fill();
      x.globalAlpha = a * 1.5 > 1 ? 1 : a * 1.5; x.fillStyle = BONE; x.fillText(LOSS_TXT, cx, ty + 16);
      x.globalAlpha = 1; void reduceMotion;
      return true;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// §2 액션 연출 — scan.js 는 이벤트 지점에서 호출만 한다 (t = 0..1 정규화 시간)
// ═══════════════════════════════════════════════════════════════════════════
/** 잠금: 뷰파인더 브래킷 4개가 화면 모서리(뷰파인더 여백)에서 bbox 코너로 수렴. t 0→1 (120ms, --ease-out) */
export function drawLockOn(x, cw, ch, box, t, tf) {
  if (!box) return;
  const e = easeOut(clamp01(t)), b = toScreen(box, tf); const X = b[0], Y = b[1], W = b[2], H = b[3];
  const m = Math.min(cw, ch) * 0.1, L = 14 + (1 - e) * 14;
  x.lineWidth = 1.5; x.strokeStyle = BONE; x.globalAlpha = 0.3 + 0.6 * e; x.lineCap = 'round';
  x.beginPath();
  // TL
  let px = m + (X - m) * e, py = m + (Y - m) * e; x.moveTo(px, py + L); x.lineTo(px, py); x.lineTo(px + L, py);
  // TR
  px = (cw - m) + (X + W - (cw - m)) * e; py = m + (Y - m) * e; x.moveTo(px - L, py); x.lineTo(px, py); x.lineTo(px, py + L);
  // BR
  px = (cw - m) + (X + W - (cw - m)) * e; py = (ch - m) + (Y + H - (ch - m)) * e; x.moveTo(px, py - L); x.lineTo(px, py); x.lineTo(px - L, py);
  // BL
  px = m + (X - m) * e; py = (ch - m) + (Y + H - (ch - m)) * e; x.moveTo(px + L, py); x.lineTo(px, py); x.lineTo(px, py - L);
  x.stroke(); x.globalAlpha = 1; x.lineCap = 'butt';
}

/** 공명 50%·100%: bbox 중심에서 얇은 링 1개가 퍼진다 (Bone 25%, 1px, 300ms). center = { cx, cy, r } */
export function drawPulseRing(x, center, t, color) {
  if (!center) return;
  const p = clamp01(t), e = easeOut(p);
  x.lineWidth = 1; x.strokeStyle = color || BONE; x.globalAlpha = 0.25 * (1 - p);
  x.beginPath(); x.arc(center.cx, center.cy, Math.max(1, center.r * (1 + e * 1.4)), 0, TAU); x.stroke(); x.globalAlpha = 1;
}

/** 스포트라이트: bbox 밖을 잉크로 어둡게 (even-odd 한 번). alpha 는 호출자가 0→.4 로 램프(80ms). pointer-events 없음(캔버스) */
export function drawSpotlight(x, cw, ch, box, alpha, tf) {
  if (!box || !(alpha > 0)) return;
  const b = toScreen(box, tf); const pad = 8, X = b[0] - pad, Y = b[1] - pad, W = b[2] + pad * 2, H = b[3] + pad * 2;
  x.fillStyle = INK0; x.globalAlpha = alpha > 1 ? 1 : alpha;
  x.beginPath(); x.rect(0, 0, cw, ch);
  const r = etchRadius(W, H, 22);
  x.moveTo(X + r, Y); x.lineTo(X + W - r, Y); x.arc(X + W - r, Y + r, r, -HALF, 0); x.lineTo(X + W, Y + H - r); x.arc(X + W - r, Y + H - r, r, 0, HALF);
  x.lineTo(X + r, Y + H); x.arc(X + r, Y + H - r, r, HALF, Math.PI); x.lineTo(X, Y + r); x.arc(X + r, Y + r, r, Math.PI, Math.PI + HALF); x.closePath();
  x.fill('evenodd'); x.globalAlpha = 1;
}

// ── 프리즈 프레임 (§2 PERFECT ①): 등급 확정 시점(t0)에 소스 한 장을 풀링 캔버스에 잡아 두고, 90ms 동안 그 캔버스를 블릿한다.
//    <video> 는 오버레이 아래에서 계속 재생되므로 매 프레임 drawImage(video) 로는 아무것도 고정되지 않는다 — 캡처 1회(할당은 최초 1회), 블릿 N회.
let FROZEN = null, frozenAt = -1e9;
const FREEZE_STALE_MS = 250;                                    // freezeMs(90) + 여유 — 이보다 오래된 캡처는 지난 연출로 본다
const srcSize = (s) => [s?.videoWidth || s?.naturalWidth || s?.width || 0, s?.videoHeight || s?.naturalHeight || s?.height || 0];
/** 소스(비디오/이미지/캔버스)의 현재 프레임을 1회 캡처 (등급 이벤트 t0 에서 호출). 성공 시 true */
export function captureFreeze(source, now = performance.now()) {
  try {
    const [sw, sh] = srcSize(source); if (!sw || !sh) return false;
    FROZEN ??= document.createElement('canvas');
    if (FROZEN.width !== sw || FROZEN.height !== sh) { FROZEN.width = sw; FROZEN.height = sh; }
    FROZEN.getContext('2d').drawImage(source, 0, 0); frozenAt = now; return true;
  } catch { return false; }
}
/** 잡아 둔 프레임이 아직 이번 연출 것인지 (≤ 250ms) */
export const hasFrozen = (now = performance.now()) => !!FROZEN && now - frozenAt <= FREEZE_STALE_MS;
/** 프리즈 창이 끝났을 때 — 다음 freezeFrame 첫 호출이 새로 캡처하도록 */
export function releaseFreeze() { frozenAt = -1e9; }
/**
 * 프리즈 프레임: captureFreeze 로 잡아 둔 마지막 프레임을 오버레이 캔버스에 cover 변환으로 블릿 (90ms 동안 매 프레임 호출). 성공 시 true
 *  - 캡처가 없거나 지난 것이면 첫 호출에서 `source` 를 1회 캡처하고, 이후 호출은 살아 있는 비디오가 아니라 고정된 캔버스를 그린다.
 *  - 호환: freezeFrame(x, tf, cw, ch) 형태(소스 생략)도 받는다 — 그때는 captureFreeze 가 먼저 불려 있어야 한다.
 *  - now(선택, 마지막 인자) = 프레임 시각. captureFreeze 에 준 시계와 같아야 한다 (주입 시간 QA). 생략 시 performance.now()
 */
export function freezeFrame(x, source, tf, cw, ch, now) {
  if (source && typeof source === 'object' && typeof source.s === 'number' && !('videoWidth' in source) && !('naturalWidth' in source) && typeof source.getContext !== 'function') { now = ch; ch = cw; cw = tf; tf = source; source = null; }
  try {
    if (!tf) return false;
    cw = cw ?? x.canvas?.width ?? 0; ch = ch ?? x.canvas?.height ?? 0;
    const t = now ?? performance.now();
    if (!hasFrozen(t) && !(source && captureFreeze(source, t))) return false;
    x.save(); x.beginPath(); x.rect(0, 0, cw, ch); x.clip();
    x.drawImage(FROZEN, tf.ox, tf.oy, FROZEN.width * tf.s, FROZEN.height * tf.s);
    x.restore(); return true;
  } catch { return false; }
}

/** 줌 펀치: .overlay-wrap 을 bbox 중심 기준 scale 1→punch[grade]→1 스프링 복귀 (transform 만). 시각 전용, 입력은 막지 않는다 */
export function punch(el, { grade = 'GOOD', cx, cy, reduceMotion = false } = {}) {
  const sc = STAGING.punch[grade] ?? 1;
  if (!el || rm(reduceMotion) || !(sc > 1) || typeof el.animate !== 'function') return Promise.resolve(false);
  const dur = grade === 'PERFECT' ? 320 : 240;
  if (Number.isFinite(cx) && Number.isFinite(cy)) el.style.transformOrigin = `${cx}px ${cy}px`;
  let anim;
  try {
    anim = el.animate([
      { transform: 'scale(1)', easing: 'cubic-bezier(.2,.8,.2,1)' },
      { transform: `scale(${sc})`, offset: 0.22, easing: 'cubic-bezier(.2,1.4,.4,1)' },
      { transform: 'scale(1)' },
    ], { duration: dur, fill: 'none' });
  } catch { el.style.transformOrigin = ''; return Promise.resolve(false); }
  // finish 이벤트는 렌더링과 함께 전달되므로(숨은 탭에서는 지연) finished 프라미스 + 타이머 폴백으로 원점 복구를 보장한다 (1회만)
  return new Promise(res => {
    let did = false; const done = () => { if (did) return; did = true; el.style.transformOrigin = ''; res(true); };
    anim.onfinish = done; anim.oncancel = done;
    if (anim.finished && typeof anim.finished.then === 'function') anim.finished.then(done, done);
    setTimeout(done, dur + 80);
  });
}

/** 스피드라인: bbox 중심에서 황동 선 N개(PERFECT 16 / GREAT·GOOD 8) 가 바깥으로 달리며 페이드 (200ms). 한 패스 */
export function drawSpeedLines(x, center, grade, t) {
  const n = STAGING.lines[grade] ?? 0; if (!n || !center) return;
  const p = clamp01(t), e = easeOut(p), r0 = center.r * 1.1 + 90 * e;
  x.lineWidth = 1.5; x.strokeStyle = BRASS; x.globalAlpha = 1 - p; x.lineCap = 'round';
  x.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + JIT[i & 15] * 0.25, len = LEN[i & 15] * (1 - p * 0.6);
    const ca = Math.cos(a), sa = Math.sin(a);
    x.moveTo(center.cx + ca * r0, center.cy + sa * r0); x.lineTo(center.cx + ca * (r0 + len), center.cy + sa * (r0 + len));
  }
  x.stroke(); x.globalAlpha = 1; x.lineCap = 'butt';
}

/** MISS 비네트 (§2): 화면 가장자리 Ember 120ms — `.vignette` 요소(scan.js #vig)에 .miss 를 토글한다 (staging.css). styles.css 의 .vignette.on(전설 황동 심장박동)과 별개. 모션 줄이기면 생략 → false */
export function missVignette(el, reduceMotion = false) {
  if (!el || rm(reduceMotion)) return false;
  el.classList.remove('miss'); void el.offsetWidth; el.classList.add('miss');
  setTimeout(() => el.classList.remove('miss'), 140); return true;
}

/** MISS: 실루엣이 `from`(보통 화면 중심) 반대 방향으로 60px 튀어 나가며 잔상 3장(모션 스트릭) 남기고 fade (300ms, Ember). 가장자리 비네트는 missVignette(el) — createStaging().miss 가 함께 부른다 */
export function drawMissFlee(x, box, from, t, tf) {
  if (!box) return;
  const p = clamp01(t), e = easeOut(p), b = toScreen(box, tf); const X = b[0], Y = b[1], W = b[2], H = b[3];
  const cx = X + W / 2, cy = Y + H / 2, fx = from?.x ?? from?.cx ?? (x.canvas ? x.canvas.width / 2 : cx), fy = from?.y ?? from?.cy ?? (x.canvas ? x.canvas.height / 2 : cy - 1);
  let dx = cx - fx, dy = cy - fy; const d = Math.hypot(dx, dy);
  if (d < 1e-3) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
  const r = etchRadius(W, H), D = STAGING.missPx * e;
  x.strokeStyle = EMBER; x.lineWidth = 1.5;
  // 스트릭 3장 (뒤에 남는 잔상, 옅게)
  for (let i = 1; i <= 3; i++) { const k = i / 4, off = D * k; x.globalAlpha = (0.08 + 0.06 * i) * (1 - p); etchPath(x, X + dx * off, Y + dy * off, W, H, r); x.stroke(); }
  // 본체
  x.globalAlpha = 0.9 * (1 - p); etchPath(x, X + dx * D, Y + dy * D, W, H, r); x.stroke(); x.globalAlpha = 1;
}

/** 정령 포획: 팝 링(1px 확장) + 스파크 6개 (250ms). 일반 = 녹청, 황금 = 황동 */
export function drawSpiritPop(x, pt, t, golden = false) {
  if (!pt) return;
  const p = clamp01(t), e = easeOut(p), col = golden ? BRASS : VERDIGRIS;
  x.strokeStyle = col; x.lineWidth = 1; x.globalAlpha = 1 - p;
  x.beginPath(); x.arc(pt.x, pt.y, 8 + e * 36, 0, TAU); x.stroke();
  const dist = 10 + e * 30, sz = 0.6 + 2 * (1 - p); x.fillStyle = col;
  x.beginPath();
  for (let i = 0; i < 6; i++) { const a = i * (TAU / 6) + 0.3 + JIT[i] * 0.2, px = pt.x + Math.cos(a) * dist, py = pt.y + Math.sin(a) * dist; x.moveTo(px + sz, py); x.arc(px, py, sz, 0, TAU); }
  x.fill(); x.globalAlpha = 1;
}

/** 아이 임팩트(§4.3 ②③): 조준점에서 충격파 링 2개(1.5px, 0→90px, 두 번째 +60ms) + 방사 스파크 12개(240ms 감속 페이드). t = 경과/impactMs. 눈꺼풀·배지·플래시는 eye.js/scan.js 몫 */
export function drawEyeImpact(x, pt, t, color) {
  if (!pt) return;
  const p = clamp01(t), col = color || BRASS, E = STAGING.eye;
  x.lineWidth = 1.5; x.strokeStyle = col;
  for (let k = 0; k < E.rings; k++) {
    const d = (k * 60) / E.impactMs, tk = d >= 1 ? 0 : clamp01((p - d) / (1 - d)); if (tk <= 0) continue;
    x.globalAlpha = 1 - tk; x.beginPath(); x.arc(pt.x, pt.y, Math.max(1, 90 * easeOut(tk)), 0, TAU); x.stroke();
  }
  const ts = clamp01(p * E.impactMs / 240); if (ts < 1) {
    const dist = 14 + 52 * easeOut(ts), len = 2 + 6 * (1 - ts), n = E.sparks;
    x.globalAlpha = 1 - ts; x.lineCap = 'round';
    // 짝수 = 스킨 색, 홀수 = Bone — 색별 한 stroke
    for (let pass = 0; pass < 2; pass++) {
      x.strokeStyle = pass ? BONE : col; x.beginPath();
      for (let i = pass; i < n; i += 2) { const a = (i / n) * TAU + JIT[i & 15] * 0.15, ca = Math.cos(a), sa = Math.sin(a); x.moveTo(pt.x + ca * dist, pt.y + sa * dist); x.lineTo(pt.x + ca * (dist + len), pt.y + sa * (dist + len)); }
      x.stroke();
    }
    x.lineCap = 'butt';
  }
  x.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// §2 오케스트레이션 — createStaging(): scan.js 는 이벤트 지점에서 stg.lock / gauge / capture / grade / miss / spirit 만 부르고,
// 프레임마다 drawTarget 뒤에 stg.draw 를 한 번 부른다. 타임라인(120ms 잠금 · 300ms 펄스 링 · 80ms 스포트라이트 램프 ·
// 90ms 프리즈 → 펀치 → 200ms 스피드라인 · 300ms MISS 스트릭 + 120ms 비네트 · 250ms 정령 팝)은 여기서 STAGING 상수로만 돈다.
// ═══════════════════════════════════════════════════════════════════════════
/**
 * createStaging({ el, vig, quiet } = {})
 *  el     .overlay-wrap (줌 펀치 대상). grade() 의 4번째 인자로 매번 줘도 된다
 *  vig    .vignette 요소 (MISS Ember 비네트). miss() 의 4번째 인자로 줘도 된다
 *  quiet  boolean | () => boolean — state.settings.reduceMotion 등. prefers-reduced-motion · :root.reduce-motion 은 자동으로 OR 된다
 * 이벤트 (now = 프레임 시각 ms, box = 소스 좌표 [x,y,w,h] — sil.draw 에 주는 것과 같은 박스):
 *  lock(box, now)                        잠금 — 브래킷 수렴 120ms
 *  track(box)                            매 프레임 최신 bbox (gauge/capture 에 box 를 주면 생략 가능)
 *  gauge(g, now, box?)                   공명값 — 50%·100% 를 넘는 순간 펄스 링 300ms
 *  capture(now, box?)                    포획 링 등장 — 스포트라이트 0→.4 (80ms), grade/miss/release 까지 유지
 *  grade(gr, center, now, el?, source?)  등급 확정 — MISS 가 아니면 프리즈 90ms(source 를 그 자리에서 1회 캡처) + 줌 펀치 + 스피드라인 200ms → Promise(펀치 종료).
 *                                        center = drawTarget 반환값 { cx, cy, r }. 'MISS' 면 miss() 로 위임
 *  miss(box?, from?, now, vig?)          달아남 — 스트릭 300ms + Ember 비네트 120ms. box 생략 시 마지막 track 박스, from 생략 시 화면 중심
 *  spirit(pt, golden, now)               정령 포획 팝 250ms (pt = 화면 좌표 { x, y })
 *  release()                             상실·화면 이탈: 스포트라이트·잠금 해제 (진행 중 연출은 자연 소멸)
 *  reset()                               모든 타임라인 즉시 종료
 *  draw(x, cw, ch, now, tf, opts?)       프레임당 1회 (drawTarget 뒤). opts = boolean(quiet) | { quiet, shade, source }
 *                                        shade: drawTarget 에 shade:true 를 준 경우 true — 스포트라이트는 auras.drawTrackingShade(mode:'capture') 가 그리므로 여기서는 생략
 *                                        source: grade() 에 source 를 안 줬을 때 프리즈 첫 프레임에서 캡처할 소스
 *  isActive(now?) / get active           진행 중 연출이 하나라도 있으면 true (QA)
 *  snapshot()                            { ev, grade, spot, box } (QA · 복사본)
 * 모션 줄이기: 프리즈·펀치·스피드라인·스트릭·비네트·잠금 수렴·펄스·정령 팝 OFF, 스포트라이트(정적 상태 표시)는 유지 (§2).
 */
export function createStaging({ el = null, vig = null, quiet = false } = {}) {
  const S = STAGING;
  const ev = { lock: -1, pulse: -1, spot: -1, grade: -1, miss: -1, spirit: -1 };
  const box = [0, 0, 0, 0]; let hasBox = false;
  const missBox = [0, 0, 0, 0], missFrom = { x: 0, y: 0 }; let hasFrom = false;
  const center = { cx: 0, cy: 0, r: 0 }, pulseC = { cx: 0, cy: 0, r: 0 }, spiritPt = { x: 0, y: 0 };
  let grade = 'GOOD', lastG = 0, spotOn = false, golden = false;
  const isQuiet = (o) => rm(typeof quiet === 'function' ? quiet() : quiet) || rm(o);
  const setBox = (b, out = box) => { if (!b || b.length < 4) return false; out[0] = b[0]; out[1] = b[1]; out[2] = b[2]; out[3] = b[3]; return true; };
  const within = (at, ms, now) => at >= 0 && now - at < ms;
  const api = {
    lock(b, now = performance.now()) { if (setBox(b)) hasBox = true; ev.lock = now; lastG = 0; },
    track(b) { if (setBox(b)) hasBox = true; },
    gauge(g, now = performance.now(), b) { if (b && setBox(b)) hasBox = true; const v = clamp01(g || 0); if ((lastG < 0.5 && v >= 0.5) || (lastG < 1 && v >= 1)) ev.pulse = now; lastG = v; },
    capture(now = performance.now(), b) { if (b && setBox(b)) hasBox = true; if (!spotOn) { spotOn = true; ev.spot = now; } },
    grade(gr, c, now = performance.now(), wrap = el, source = null) {
      grade = gr || 'GOOD'; spotOn = false; ev.spot = -1;
      if (c) { center.cx = c.cx ?? c.x ?? center.cx; center.cy = c.cy ?? c.y ?? center.cy; center.r = c.r ?? center.r; }
      if (grade === 'MISS') { api.miss(null, null, now); return Promise.resolve(false); }
      ev.grade = now;
      if (source) captureFreeze(source, now);
      return punch(wrap, { grade, cx: center.cx, cy: center.cy, reduceMotion: isQuiet() });
    },
    miss(b, from, now = performance.now(), vigEl = vig) {
      if (!setBox(b, missBox) && !(hasBox && setBox(box, missBox))) return false;
      hasFrom = !!from; if (from) { missFrom.x = from.x ?? from.cx ?? 0; missFrom.y = from.y ?? from.cy ?? 0; }
      spotOn = false; ev.spot = -1; ev.miss = now; missVignette(vigEl, isQuiet()); return true;
    },
    spirit(pt, g = false, now = performance.now()) { if (!pt) return; spiritPt.x = pt.x ?? pt.cx ?? 0; spiritPt.y = pt.y ?? pt.cy ?? 0; golden = !!g; ev.spirit = now; },
    release() { spotOn = false; ev.spot = -1; ev.lock = -1; lastG = 0; },
    reset() { for (const k in ev) ev[k] = -1; spotOn = false; hasBox = false; hasFrom = false; lastG = 0; releaseFreeze(); },
    isActive(now = performance.now()) { return spotOn || within(ev.lock, S.lockOnMs, now) || within(ev.pulse, S.pulseMs, now) || within(ev.grade, S.freezeMs + S.linesMs, now) || within(ev.miss, S.missMs, now) || within(ev.spirit, S.spiritMs, now); },
    get active() { return api.isActive(); },
    snapshot() { return { ev: { ...ev }, grade, spot: spotOn, box: hasBox ? [...box] : null }; },
    /** 프레임당 1회 — 각 타임라인을 STAGING 지속시간으로 정규화해 기본 draw* 에 넘긴다. 할당 0 */
    draw(x, cw, ch, now = performance.now(), tf, o) {
      const q = isQuiet(typeof o === 'boolean' ? o : o?.quiet), shade = !!(o && typeof o === 'object' && o.shade), source = o && typeof o === 'object' ? o.source : null;
      // 스포트라이트 — 정적 상태 표시라 모션 줄이기에서도 유지(램프만 생략). shade 가 켜져 있으면 명암이 대신 그린다
      if (spotOn && hasBox && !shade) drawSpotlight(x, cw, ch, box, S.spotlightAlpha * (q ? 1 : clamp01((now - ev.spot) / S.spotlightMs)), tf);
      if (q) return;
      // 잠금 브래킷 수렴 120ms
      if (hasBox && within(ev.lock, S.lockOnMs, now)) drawLockOn(x, cw, ch, box, (now - ev.lock) / S.lockOnMs, tf);
      // 펄스 링 300ms — bbox 중심, 반지름은 overlay 의 공명 링과 같은 규칙
      if (hasBox && within(ev.pulse, S.pulseMs, now)) { const b = toScreen(box, tf); pulseC.cx = b[0] + b[2] / 2; pulseC.cy = b[1] + b[3] / 2; pulseC.r = Math.max(30, Math.min(b[2], b[3]) * 0.32); drawPulseRing(x, pulseC, (now - ev.pulse) / S.pulseMs); }
      // 등급: 프리즈 90ms → 스피드라인 200ms (펀치는 grade() 에서 이미 출발)
      if (ev.grade >= 0) {
        const e = now - ev.grade;
        if (e < S.freezeMs) freezeFrame(x, source, tf, cw, ch, now);
        else if (e < S.freezeMs + S.linesMs) drawSpeedLines(x, center, grade, (e - S.freezeMs) / S.linesMs);
        else { ev.grade = -1; releaseFreeze(); }
      }
      // MISS 스트릭 300ms
      if (within(ev.miss, S.missMs, now)) drawMissFlee(x, missBox, hasFrom ? missFrom : null, (now - ev.miss) / S.missMs, tf);
      // 정령 팝 250ms
      if (within(ev.spirit, S.spiritMs, now)) drawSpiritPop(x, spiritPt, (now - ev.spirit) / S.spiritMs, golden);
    },
  };
  return api;
}

// ═══════════════════════════════════════════════════════════════════════════
// §1.3 기록으로 남기기 — 사진 좌표계(0..1) 윤곽
// ═══════════════════════════════════════════════════════════════════════════
const f2 = v => (Math.round(v * 100) / 100).toString();
/** 발견 화면·앨범 상세: `.photo-wrap` 위 <svg class="etch"> (황동 1.5px, 둥근 사각, 코너 틱 4개, 글자 없음). box = 정규화 [x,y,w,h]. 유효하지 않으면 '' */
export function etchSvg(box, { cls = 'etch' } = {}) {
  if (!Array.isArray(box) || box.length < 4 || !box.every(Number.isFinite)) return '';
  const bx = clamp01(box[0]), by = clamp01(box[1]);
  const bw = clamp(box[2], 0.02, 1 - bx), bh = clamp(box[3], 0.02, 1 - by);
  const X = bx * 100, Y = by * 100, W = bw * 100, H = bh * 100;
  const r = Math.min(4.5, W / 2, H / 2), L = Math.min(3.5, W / 2, H / 2);
  const ve = 'vector-effect="non-scaling-stroke"';
  const ticks = `M${f2(X + W - L)} ${f2(Y)}L${f2(X + W)} ${f2(Y)}L${f2(X + W)} ${f2(Y + L)}` +
    `M${f2(X + W)} ${f2(Y + H - L)}L${f2(X + W)} ${f2(Y + H)}L${f2(X + W - L)} ${f2(Y + H)}` +
    `M${f2(X + L)} ${f2(Y + H)}L${f2(X)} ${f2(Y + H)}L${f2(X)} ${f2(Y + H - L)}` +
    `M${f2(X)} ${f2(Y + L)}L${f2(X)} ${f2(Y)}L${f2(X + L)} ${f2(Y)}`;
  return `<svg class="${cls}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" fill="none" stroke="${BRASS}" stroke-linecap="round" stroke-linejoin="round">` +
    `<rect x="${f2(X)}" y="${f2(Y)}" width="${f2(W)}" height="${f2(H)}" rx="${f2(r)}" stroke-width="1.5" ${ve}/>` +
    `<path d="${ticks}" stroke-width="2" ${ve}/></svg>`;
}

/** 공유 카드(card.js 1080×1350)·캔버스 썸네일: 사진 사각형 (X,Y,W,H) 안에 같은 윤곽. 사진은 정사각 스냅샷이 cover 로 들어간다고 가정 */
export function drawEtchCanvas(ctx, box, X, Y, W, H, color = BRASS) {
  if (!ctx || !Array.isArray(box) || box.length < 4 || !(W > 0) || !(H > 0)) return false;
  const S = Math.max(W, H), ox = X - (S - W) / 2, oy = Y - (S - H) / 2;      // 정사각 원본 cover-fit 오프셋
  const bx = clamp01(box[0]), by = clamp01(box[1]), bw = clamp(box[2], 0.02, 1 - bx), bh = clamp(box[3], 0.02, 1 - by);
  const px = ox + bx * S, py = oy + by * S, pw = bw * S, ph = bh * S;
  const lw = Math.max(1.5, S / 220), r = Math.min(S * 0.047, pw / 2, ph / 2), L = Math.min(S * 0.033, pw / 2, ph / 2);
  ctx.save(); ctx.beginPath(); ctx.rect(X, Y, W, H); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash(DASH_NONE);
  etchPath(ctx, px, py, pw, ph, r); ctx.stroke();
  ctx.lineWidth = lw * 1.33; ctx.beginPath(); for (let i = 0; i < 4; i++) cornerTick(ctx, px, py, pw, ph, i, L); ctx.stroke();
  ctx.restore(); return true;
}

/**
 * 소스 픽셀 bbox → camera.snapshot(source, crop) 결과(정사각) 좌표계의 정규화 [x,y,w,h] (0..1).
 * snapshot 과 같은 크롭 규칙: crop 있으면 물체 주변 정사각(여백 ×1.7, 경계 클램프), 없으면 중앙 정사각. 보이는 부분만 남기며 1% 미만이면 null.
 */
export function normalizeBox(bbox, source, crop = null) {
  if (!bbox || bbox.length < 4) return null;
  const sw = source?.videoWidth || source?.naturalWidth || source?.width || 0, sh = source?.videoHeight || source?.naturalHeight || source?.height || 0;
  if (!sw || !sh) return null;
  let sx = 0, sy = 0, s = Math.min(sw, sh);
  if (crop && crop.length >= 4) {
    const cx = crop[0], cy = crop[1], cw = crop[2], ch = crop[3];
    s = Math.min(Math.max(cw, ch) * 1.7, sw, sh);
    sx = Math.max(0, Math.min(sw - s, cx + cw / 2 - s / 2));
    sy = Math.max(0, Math.min(sh - s, cy + ch / 2 - s / 2));
  } else { sx = (sw - s) / 2; sy = (sh - s) / 2; }
  if (!(s > 0)) return null;
  const x0 = clamp01((bbox[0] - sx) / s), y0 = clamp01((bbox[1] - sy) / s);
  const x1 = clamp01((bbox[0] + bbox[2] - sx) / s), y1 = clamp01((bbox[1] + bbox[3] - sy) / s);
  if (x1 - x0 < 0.01 || y1 - y0 < 0.01) return null;
  const r4 = v => Math.round(v * 1e4) / 1e4;
  return [r4(x0), r4(y0), r4(x1 - x0), r4(y1 - y0)];
}
