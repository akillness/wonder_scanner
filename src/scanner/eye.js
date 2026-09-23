// 아이 게이지: 순수 상태 머신 (DOM 없음). docs/GAMEPLAY_V7.md §5
// update(...) → { fill, point:{x,y}|null, present, target:null|{type,id}, fired:null|{type,id,grade}, jitter }
export function createEyeGauge(E) {
  let pt = null, ctr = null, fill = 0, target = null, jitter = 0, lastPt = null, rearmUntil = 0;
  return {
    reset() { pt = null; ctr = null; fill = 0; target = null; jitter = 0; lastPt = null; },
    update({ now, dt, sample, cal, cw, ch, targetBox, mode, spirits = [], enabled = true }) {
      const present = !!(enabled && sample && sample.present && sample.open >= E.openMin);
      let fired = null;
      if (!present) { fill = Math.max(0, fill - E.decayPerS * dt); if (fill === 0) target = null; lastPt = null; ctr = null; return { fill, point: null, present: false, target, fired, jitter }; }
      const c = cal ?? { gx: 0, gy: 0 };
      const rx = cw / 2 + (sample.gx - c.gx) * E.gazeGain * (cw / 2), ry = ch / 2 + (sample.gy - c.gy) * E.gazeGain * (ch / 2);
      const k = Math.min(1, E.smoothK * dt); pt = pt ? { x: pt.x + (rx - pt.x) * k, y: pt.y + (ry - pt.y) * k } : { x: rx, y: ry };
      pt.x = Math.max(0, Math.min(cw, pt.x)); pt.y = Math.max(0, Math.min(ch, pt.y));
      const kc = Math.min(1, 2 * dt); ctr = ctr ? { x: ctr.x + (rx - ctr.x) * kc, y: ctr.y + (ry - ctr.y) * kc } : { x: rx, y: ry };
      if (lastPt) { const dev = Math.hypot(rx - ctr.x, ry - ctr.y); jitter += (dev - jitter) * Math.min(1, E.jitterEmaK * dt); } lastPt = { ...pt }; // 흔들림 = 원시 시선이 느린 중심에서 벗어난 거리의 EMA
      // 대상 판정: 포획 링 활성 시 원더 박스 우선, 아니면 정령
      let hit = null;
      if (mode === 'capture' && targetBox) { const [X, Y, W, H] = targetBox; const px = Math.max(W * E.boxPad, E.minHitPx - W / 2), py = Math.max(H * E.boxPad, E.minHitPx - H / 2); if (pt.x >= X - px && pt.x <= X + W + px && pt.y >= Y - py && pt.y <= Y + H + py) hit = { type: 'wonder', id: 'wonder' }; }
      if (!hit) { const sp = spirits.filter(s => Math.hypot(s.x - pt.x, s.y - pt.y) <= E.spiritRadiusPx).sort((a, b) => Math.hypot(a.x - pt.x, a.y - pt.y) - Math.hypot(b.x - pt.x, b.y - pt.y))[0]; if (sp) hit = { type: 'spirit', id: sp.id }; }
      if (now < rearmUntil) hit = null;
      if (!hit || !target || hit.type !== target.type || hit.id !== target.id) { target = hit; fill = hit ? 0 : Math.max(0, fill - E.decayPerS * dt); if (hit) { jitter = 0; ctr = { x: rx, y: ry }; } }
      else {
        const hold = target.type === 'wonder' ? E.holdMs : E.spiritHoldMs; fill = Math.min(1, fill + (dt * 1000) / hold);
        if (fill >= 1) { const grade = target.type === 'wonder' ? (jitter <= E.steady.PERFECT ? 'PERFECT' : jitter <= E.steady.GREAT ? 'GREAT' : 'GOOD') : null; fired = { type: target.type, id: target.id, grade }; fill = 0; target = null; rearmUntil = now + E.rearmMs; }
      }
      return { fill, point: { ...pt }, present: true, target, fired, jitter };
    },
  };
}

/** 눈 조준점 + 발동 임팩트 (docs/vfx/eye-impact.json 예산: 파티클 12, draw call 3) */
export function drawEyeReticle(x, { cx, cy, fill, target, present, impact, reduceMotion, now }) {
  const BONE = '#EDE6D6', BRASS = '#E2B45A', VERD = '#6DB5A0', col = target?.type === 'spirit' ? VERD : BRASS;
  x.save(); x.globalAlpha = present ? 1 : 0.35;
  let lid = 0; if (impact && !reduceMotion) { const t = (now - impact.t0) / 180; if (t < 1) lid = t < 0.5 ? t * 2 : (1 - t) * 2; }
  const w = 28, h = 14 * (1 - lid);
  x.strokeStyle = BONE; x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx - w, cy); x.quadraticCurveTo(cx, cy - h * 1.6, cx + w, cy); x.quadraticCurveTo(cx, cy + h * 1.6, cx - w, cy); x.stroke();
  if (h > 2) { x.lineWidth = 4; x.strokeStyle = 'rgba(237,230,214,.18)'; x.beginPath(); x.arc(cx, cy, 9, 0, Math.PI * 2); x.stroke(); if (fill > 0) { x.strokeStyle = col; x.beginPath(); x.arc(cx, cy, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill); x.stroke(); } x.fillStyle = '#0B0F1A'; x.beginPath(); x.arc(cx, cy, 4, 0, Math.PI * 2); x.fill(); }
  x.restore();
  if (!present) { x.save(); x.fillStyle = 'rgba(237,230,214,.7)'; x.font = '500 12px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillText('얼굴이 보이지 않아요', cx, cy + 34); x.restore(); }
  if (impact && !reduceMotion) {
    const t = now - impact.t0, icol = impact.color;
    if (t < 420) { x.save(); x.strokeStyle = icol; x.lineWidth = 1.5; x.beginPath(); for (const d of [0, 60]) { const p = (t - d) / 360; if (p > 0 && p < 1) { x.globalAlpha = 1 - p; x.moveTo(impact.x + 90 * p, impact.y); x.arc(impact.x, impact.y, 90 * p, 0, Math.PI * 2); } } x.stroke(); x.restore(); }
    if (t < 240) { const p = t / 240, e = 1 - (1 - p) * (1 - p); x.save(); x.globalAlpha = 1 - p; x.fillStyle = icol; x.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r = 12 + 46 * e; x.moveTo(impact.x + Math.cos(a) * r + 2, impact.y + Math.sin(a) * r); x.arc(impact.x + Math.cos(a) * r, impact.y + Math.sin(a) * r, 2, 0, Math.PI * 2); } x.fill(); x.restore(); }
  }
}
