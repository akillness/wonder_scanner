// 베스트 포토 프레임 버퍼 (GAMEPLAY_V7 §6.4)
// - 풀링된 오프스크린 캔버스 링 버퍼: push() 는 everyMs 가 지났을 때만 현재 소스 프레임(video/img/canvas)을 긴 변 size 로 축소해 담는다.
// - sharp  = 64px 그레이스케일 라플라시안 분산 (스크래치 캔버스 1개 재사용)
// - score  = 0.5·conf + 0.35·sharpNorm + 0.15·center — sharpNorm 은 버퍼 안 min-max 정규화(단일/동일이면 1), conf 없으면 .5
// - 결정적: 같은 입력 → 같은 선택. 동점이면 최신 프레임.
// - 프레임 객체는 슬롯 재사용 → best()/frames() 결과는 다음 push 전에 frameToDataUrl/frameToBlob 로 소비할 것.
// frame = { ts, canvas, conf, box, sharp, center, score }

export const FRAME_SCORE = { conf: 0.5, sharp: 0.35, center: 0.15 };
const SHARP_PX = 64;

// ── 스크래치 (모듈당 1개, 프레임당 할당 0)
let scratch = null, scratchCtx = null, gray = null;
function scratchCtx2d() {
  if (scratchCtx) return scratchCtx;
  if (typeof document === 'undefined') return null;
  scratch = document.createElement('canvas'); scratch.width = scratch.height = SHARP_PX;
  scratchCtx = scratch.getContext('2d', { willReadFrequently: true });
  gray = new Float32Array(SHARP_PX * SHARP_PX);
  return scratchCtx;
}

/** 64px 그레이 라플라시안 분산 — 클수록 선명. 실패 시 0 */
export function sharpness(canvas) {
  const ctx = scratchCtx2d(); if (!ctx || !canvas) return 0;
  const N = SHARP_PX;
  let data;
  try { ctx.drawImage(canvas, 0, 0, N, N); data = ctx.getImageData(0, 0, N, N).data; } catch { return 0; }
  for (let i = 0, j = 0; j < N * N; i += 4, j++) gray[j] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  let sum = 0, sq = 0, n = 0;
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      const l = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - N] - gray[i + N];
      sum += l; sq += l * l; n++;
    }
  }
  const mean = sum / n;
  return Math.max(0, sq / n - mean * mean);
}

/** 프레임 점수 (결정적). conf 없으면 .5, sharpNorm 없으면 1, center 없으면 .5 */
export function scoreFrame({ conf, sharpNorm, center } = {}) {
  const c = Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0.5;
  const s = Number.isFinite(sharpNorm) ? Math.min(1, Math.max(0, sharpNorm)) : 1;
  const ce = Number.isFinite(center) ? Math.min(1, Math.max(0, center)) : 0.5;
  return FRAME_SCORE.conf * c + FRAME_SCORE.sharp * s + FRAME_SCORE.center * ce;
}

const srcSize = (source) => [source?.videoWidth || source?.naturalWidth || source?.width || 0, source?.videoHeight || source?.naturalHeight || source?.height || 0];

/** center = 1 − (박스 중심↔프레임 중심 거리 / 대각선). box 는 소스 픽셀 [x,y,w,h] 또는 정규화 0..1 (모두 ≤1.5 이면 정규화로 간주). 없으면 .5 */
function centerOf(box, sw, sh) {
  if (!Array.isArray(box) || box.length < 4 || !sw || !sh) return 0.5;
  const [bx, by, bw, bh] = box; if (![bx, by, bw, bh].every(Number.isFinite)) return 0.5;
  const norm = bx <= 1.5 && by <= 1.5 && bw <= 1.5 && bh <= 1.5;
  const cx = norm ? (bx + bw / 2) * sw : bx + bw / 2, cy = norm ? (by + bh / 2) * sh : by + bh / 2;
  const d = Math.hypot(cx - sw / 2, cy - sh / 2), diag = Math.hypot(sw, sh);
  return Math.min(1, Math.max(0, 1 - d / diag));
}

export function createFrameBuffer({ maxFrames = 8, everyMs = 120, size = 640 } = {}) {
  const N = Math.max(1, maxFrames | 0);
  const slots = Array.from({ length: N }, () => ({ ts: -1, canvas: null, ctx: null, conf: 0.5, box: null, sharp: 0, center: 0.5, score: 0, width: 0, height: 0 }));
  let head = 0, count = 0, lastPush = -Infinity, lastNow = 0;

  const active = () => { // 오래된 → 최신
    const out = [];
    for (let i = 0; i < count; i++) out.push(slots[(head - count + i + N) % N]);
    return out;
  };

  return {
    /** everyMs 가 지났을 때만 담는다. 담았으면 frame, 아니면 null */
    push(source, now = performance.now(), { conf, box } = {}) {
      lastNow = now;
      if (!source) return null;
      if (source.readyState !== undefined && source.tagName === 'VIDEO' && source.readyState < 2) return null;
      const [sw, sh] = srcSize(source); if (!sw || !sh) return null;
      if (now - lastPush < everyMs) return null;
      const slot = slots[head];
      const sc = Math.min(1, size / Math.max(sw, sh)), w = Math.max(1, Math.round(sw * sc)), h = Math.max(1, Math.round(sh * sc));
      if (!slot.canvas) { slot.canvas = document.createElement('canvas'); slot.ctx = slot.canvas.getContext('2d'); }
      if (slot.canvas.width !== w || slot.canvas.height !== h) { slot.canvas.width = w; slot.canvas.height = h; }
      try { slot.ctx.drawImage(source, 0, 0, w, h); } catch { return null; }
      lastPush = now; head = (head + 1) % N; count = Math.min(N, count + 1);
      slot.ts = now; slot.width = w; slot.height = h;
      slot.conf = Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0.5;
      slot.box = Array.isArray(box) && box.length >= 4 ? box : null;
      slot.center = centerOf(slot.box, sw, sh);
      slot.sharp = sharpness(slot.canvas);
      slot.score = 0;
      return slot;
    },
    /** 버퍼의 프레임(오래된 → 최신) */
    frames() { return active(); },
    /** 마지막 push 시각 기준 ms 안의 프레임 */
    recent(ms) { return active().filter(f => lastNow - f.ts <= ms); },
    /** 베스트 포토: sharp 를 버퍼 안에서 min-max 정규화 → score 최대, 동점이면 최신 */
    best() {
      const fr = active(); if (!fr.length) return null;
      let lo = Infinity, hi = -Infinity;
      for (const f of fr) { if (f.sharp < lo) lo = f.sharp; if (f.sharp > hi) hi = f.sharp; }
      const range = hi - lo;
      let pick = null;
      for (const f of fr) { // 오래된 → 최신 순회 + >= 로 최신 동점 우선
        const sharpNorm = range > 1e-9 ? (f.sharp - lo) / range : 1;
        f.score = scoreFrame({ conf: f.conf, sharpNorm, center: f.center });
        if (!pick || f.score >= pick.score) pick = f;
      }
      return pick;
    },
    /** 가장 최근 프레임 (settings.bestPhoto=false 일 때 "탭 순간" 용) */
    get last() { return count ? slots[(head - 1 + N) % N] : null; },
    clear() { for (const s of slots) { s.ts = -1; s.box = null; s.score = 0; } head = 0; count = 0; lastPush = -Infinity; },
    get count() { return count; },
    get everyMs() { return everyMs; },
    get size() { return size; },
  };
}

/** 프레임 → JPEG dataURL (카드용 사진, 긴 변 = size) */
export function frameToDataUrl(frame, quality = 0.86) {
  const c = frame?.canvas; if (!c) return null;
  try { return c.toDataURL('image/jpeg', quality); } catch { return null; }
}

/** 프레임 → 축소 JPEG Blob (대안 컷 alts 용, 기본 240px) */
export function frameToBlob(frame, maxPx = 240, quality = 0.72) {
  const c = frame?.canvas; if (!c || !c.width || !c.height) return Promise.resolve(null);
  const s = Math.min(1, maxPx / Math.max(c.width, c.height));
  const o = document.createElement('canvas'); o.width = Math.max(1, Math.round(c.width * s)); o.height = Math.max(1, Math.round(c.height * s));
  try { o.getContext('2d').drawImage(c, 0, 0, o.width, o.height); } catch { return Promise.resolve(null); }
  return new Promise(res => { try { o.toBlob(b => res(b ?? null), 'image/jpeg', quality); } catch { res(null); } });
}
