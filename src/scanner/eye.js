// 아이 게이지: 순수 상태 머신 (DOM 없음). docs/GAMEPLAY_V7.md §5
// update(...) → { fill, point:{x,y}|null, present, target:null|{type,id}, fired:null|{type,id,grade}, jitter }
export function createEyeGauge(E) {
  // 추가 파라미터(없으면 기본값): 깜빡임 유예·이탈 유예·히스테리시스·One Euro 필터
  const P = { blinkGraceMs: 300, switchGraceMs: 150, exitPad: 0.35, spiritExitMul: 1.3, filter: { minCutoff: 0.6, beta: 0.007, dCutoff: 1.0 }, ...E };
  const fx = oneEuro(P.filter), fy = oneEuro(P.filter);
  let pt = null, ctr = null, fill = 0, target = null, jitter = 0, rearmUntil = 0, lastGoodT = 0, offSince = 0, held = 0, blinks = 0, samples = 0, wasGood = false;
  const hitTest = (p, targetBox, mode, spirits) => {
    let hit = null;
    if (mode === 'capture' && targetBox) {
      const [X, Y, W, H] = targetBox, pad = target?.type === 'wonder' ? P.exitPad : P.boxPad; // 유지 중엔 넓게(히스테리시스)
      const px = Math.max(W * pad, P.minHitPx - W / 2), py = Math.max(H * pad, P.minHitPx - H / 2);
      if (p.x >= X - px && p.x <= X + W + px && p.y >= Y - py && p.y <= Y + H + py) hit = { type: 'wonder', id: 'wonder' };
    }
    if (!hit) {
      let best = null, bd = Infinity;
      for (const s of spirits) { const d = Math.hypot(s.x - p.x, s.y - p.y), r = target?.type === 'spirit' && target.id === s.id ? P.spiritRadiusPx * P.spiritExitMul : P.spiritRadiusPx; if (d <= r && d < bd) { bd = d; best = s; } }
      if (best) hit = { type: 'spirit', id: best.id };
    }
    return hit;
  };
  return {
    reset() { pt = null; ctr = null; fill = 0; target = null; jitter = 0; offSince = 0; lastGoodT = 0; fx.reset(); fy.reset(); },
    /** 인식률 통계(세션): 샘플 수, 유효 샘플 수, 깜빡임 유예 횟수 */
    stats() { return { samples, held, blinks, presentRate: samples ? held / samples : 0 }; },
    update({ now, dt, sample, cal, cw, ch, targetBox, mode, spirits = [], enabled = true }) {
      samples++;
      const good = !!(enabled && sample && sample.present && sample.open >= P.openMin);
      let fired = null;
      if (!good) {
        // 깜빡임·순간 유실 유예: 마지막 조준점과 게이지를 그대로 유지 (감쇠 없음)
        if (pt && lastGoodT && now - lastGoodT <= P.blinkGraceMs && enabled) { if (wasGood) blinks++; wasGood = false; return { fill, point: { ...pt }, present: true, target, fired, jitter, blink: true }; }
        wasGood = false;
        fill = Math.max(0, fill - P.decayPerS * dt); if (fill === 0) target = null; pt = null; ctr = null; offSince = 0; fx.reset(); fy.reset();
        return { fill, point: null, present: false, target, fired, jitter, blink: false };
      }
      held++; lastGoodT = now; wasGood = true;
      const c = cal ?? { gx: 0, gy: 0 };
      const rx = cw / 2 + (sample.gx - c.gx) * P.gazeGain * (cw / 2), ry = ch / 2 + (sample.gy - c.gy) * P.gazeGain * (ch / 2);
      const sdt = Math.max(1 / 240, dt);
      pt = { x: Math.max(0, Math.min(cw, fx.filter(rx, sdt))), y: Math.max(0, Math.min(ch, fy.filter(ry, sdt))) };
      const kc = Math.min(1, 2 * dt); ctr = ctr ? { x: ctr.x + (rx - ctr.x) * kc, y: ctr.y + (ry - ctr.y) * kc } : { x: rx, y: ry };
      const dev = Math.hypot(rx - ctr.x, ry - ctr.y); if (!offSince) jitter += (dev - jitter) * Math.min(1, P.jitterEmaK * dt); // 흔들림 = 원시 시선이 느린 중심에서 벗어난 거리의 EMA (이탈 유예 중엔 집계 제외)
      let hit = now < rearmUntil ? null : hitTest(pt, targetBox, mode, spirits);
      const same = hit && target && hit.type === target.type && hit.id === target.id;
      if (same) {
        offSince = 0;
        const hold = target.type === 'wonder' ? P.holdMs : P.spiritHoldMs; fill = Math.min(1, fill + (dt * 1000) / hold);
        if (fill >= 1) { const grade = target.type === 'wonder' ? (jitter <= P.steady.PERFECT ? 'PERFECT' : jitter <= P.steady.GREAT ? 'GREAT' : 'GOOD') : null; fired = { type: target.type, id: target.id, grade }; fill = 0; target = null; rearmUntil = now + P.rearmMs; }
      } else if (target) {
        // 이탈 유예: 잠깐 벗어난 것(단속운동)은 무시하고 게이지 동결
        offSince ||= now;
        if (now - offSince > P.switchGraceMs) { target = hit; offSince = 0; if (hit) { fill = 0; jitter = 0; ctr = { x: rx, y: ry }; } else fill = Math.max(0, fill - P.decayPerS * dt); }
      } else {
        target = hit; if (hit) { fill = 0; jitter = 0; ctr = { x: rx, y: ry }; offSince = 0; } else fill = Math.max(0, fill - P.decayPerS * dt);
      }
      return { fill, point: { ...pt }, present: true, target, fired, jitter, blink: false };
    },
  };
}

/** One Euro 필터: 정지 시 떨림 억제, 빠른 이동 시 지연 최소화 (Casiez et al. 2012) */
export function oneEuro({ minCutoff = 1.0, beta = 0.0, dCutoff = 1.0 } = {}) {
  let xPrev = null, dxPrev = 0;
  const alpha = (cutoff, dt) => { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); };
  return {
    filter(x, dt) {
      if (xPrev === null) { xPrev = x; dxPrev = 0; return x; }
      const dx = (x - xPrev) / dt, ad = alpha(dCutoff, dt), dxHat = ad * dx + (1 - ad) * dxPrev;
      const a = alpha(minCutoff + beta * Math.abs(dxHat), dt), xHat = a * x + (1 - a) * xPrev;
      xPrev = xHat; dxPrev = dxHat; return xHat;
    },
    reset() { xPrev = null; dxPrev = 0; },
  };
}

/** 눈 조준점 + 발동 임팩트 (docs/vfx/eye-impact.json 예산: 파티클 12, draw call 3) */
export function drawEyeReticle(x, { cx, cy, fill, target, present, impact, reduceMotion, now }) {
  const BONE = '#EDE6D6', BRASS = '#E2B45A', VERD = '#6DB5A0', col = target?.type === 'spirit' ? VERD : BRASS;
  x.save(); x.globalAlpha = present ? 1 : 0.35;
  let lid = 0; if (impact && !reduceMotion) { const t = (now - impact.t0) / 180; if (t < 1) lid = t < 0.5 ? t * 2 : (1 - t) * 2; }
  const w = 34, h = 17 * (1 - lid);
  x.shadowColor = 'rgba(0,0,0,.85)'; x.shadowBlur = 6; x.strokeStyle = BONE; x.lineWidth = 2.5; x.beginPath(); x.moveTo(cx - w, cy); x.quadraticCurveTo(cx, cy - h * 1.6, cx + w, cy); x.quadraticCurveTo(cx, cy + h * 1.6, cx - w, cy); x.stroke();
  if (h > 2) { x.shadowBlur = 0; x.lineWidth = 5; x.strokeStyle = 'rgba(11,15,26,.55)'; x.beginPath(); x.arc(cx, cy, 11, 0, Math.PI * 2); x.stroke(); if (fill > 0) { x.strokeStyle = col; x.beginPath(); x.arc(cx, cy, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill); x.stroke(); } x.fillStyle = '#0B0F1A'; x.beginPath(); x.arc(cx, cy, 5, 0, Math.PI * 2); x.fill(); }
  x.restore();
  if (!present) { x.save(); x.fillStyle = 'rgba(237,230,214,.7)'; x.font = '500 12px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillText('얼굴이 보이지 않아요', cx, cy + 34); x.restore(); }
  if (impact && !reduceMotion) {
    const t = now - impact.t0, icol = impact.color;
    if (t < 420) { x.save(); x.strokeStyle = icol; x.lineWidth = 1.5; x.beginPath(); for (const d of [0, 60]) { const p = (t - d) / 360; if (p > 0 && p < 1) { x.globalAlpha = 1 - p; x.moveTo(impact.x + 90 * p, impact.y); x.arc(impact.x, impact.y, 90 * p, 0, Math.PI * 2); } } x.stroke(); x.restore(); }
    if (t < 240) { const p = t / 240, e = 1 - (1 - p) * (1 - p); x.save(); x.globalAlpha = 1 - p; x.fillStyle = icol; x.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r = 12 + 46 * e; x.moveTo(impact.x + Math.cos(a) * r + 2, impact.y + Math.sin(a) * r); x.arc(impact.x + Math.cos(a) * r, impact.y + Math.sin(a) * r, 2, 0, Math.PI * 2); } x.fill(); x.restore(); }
  }
}
