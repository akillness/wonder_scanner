// 아이 게이지 정밀도 검증 (노드, DOM 없음): v8.1(HEAD) vs v8.2(작업 트리) — docs/GAMEPLAY_V7.md §3.2 / §5
import { createEyeGauge as NEW } from '../src/scanner/eye.js';
import { createEyeGauge as OLD } from './eye.v8.1.mjs';
const E = { holdMs: 900, spiritHoldMs: 600, decayPerS: 1.5, gazeGain: 1.4, headGain: 0.6, smoothK: 8, openMin: 0.5, boxPad: 0.2, minHitPx: 44, spiritRadiusPx: 60, steady: { PERFECT: 8, GREAT: 18 }, jitterEmaK: 6, rearmMs: 400,
  blinkGraceMs: 300, switchGraceMs: 150, exitPad: 0.35, spiritExitMul: 1.3, filter: { minCutoff: 0.6, beta: 0.007, dCutoff: 1.0 } };
const cw = 390, ch = 844, DT = 1 / 60, BOX = [95, 322, 200, 200]; // 화면 중앙 200px 박스
// 시선 샘플 생성기: 화면 점 → gx,gy (cal 0,0). 20Hz 샘플 갱신을 흉내 내기 위해 50ms마다만 새 샘플
const toG = (x, y) => ({ gx: (x - cw / 2) / (E.gazeGain * cw / 2), gy: (y - ch / 2) / (E.gazeGain * ch / 2) });
function run(make, scenario, ms = 3000) {
  const eye = make(E); let now = 0, fired = [], last = null, smp = null, nextS = 0, fills = [];
  for (let i = 0; i * DT * 1000 <= ms; i++) {
    now = i * DT * 1000; const s = scenario(now); if (now >= nextS || s?.force) { smp = s; nextS = now + 50; } else if (smp && s) smp = { ...smp, open: s.open, present: s.present };
    last = eye.update({ now, dt: DT, sample: smp, cal: null, cw, ch, targetBox: BOX, mode: 'capture', spirits: s?.spirits ?? [], enabled: true });
    fills.push(last.fill); if (last.fired) fired.push({ t: now, ...last.fired });
  }
  return { fired, last, fills, eye };
}
const center = (jit = 0, seed = 1) => { let r = seed; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280 - 0.5; }; return (t) => ({ ...toG(cw / 2 + rnd() * 2 * jit, ch / 2 + rnd() * 2 * jit), open: 1, present: true }); };
const results = []; const rec = (name, v8_1, v8_2, pass) => results.push({ name, 'v8.1': v8_1, 'v8.2': v8_2, pass });
// 1) 정지 홀드 → 900ms ±50 에 1회 발동, PERFECT
for (const [nm, mk] of [['v8.1', OLD], ['v8.2', NEW]]) { const r = run(mk, center(0)); globalThis['t1' + nm] = r.fired.map(f => Math.round(f.t) + ':' + f.grade).join(' '); }
rec('정지 홀드 발동 시각·등급', globalThis['t1v8.1'], globalThis['t1v8.2'], /^9[0-4]\d:PERFECT/.test(globalThis['t1v8.2']));
// 2) 지터 등급 경계 7/9/17/19px
const circ = (r) => (t) => ({ ...toG(cw / 2 + Math.cos(t / 90) * r, ch / 2 + Math.sin(t / 90) * r), open: 1, present: true });
for (const j of [7, 9, 17, 19]) { const a = run(OLD, circ(j)).fired[0]?.grade, b = run(NEW, circ(j)).fired[0]?.grade; rec(`지터 ${j}px 등급`, a, b, b === (j <= 8 ? 'PERFECT' : j <= 18 ? 'GREAT' : 'GOOD')); }
// 3) 홀드 중 자연 깜빡임(200ms) 2회 → 발동해야 함(유예)
const blink = (t) => ({ ...toG(cw / 2, ch / 2), open: (t > 300 && t < 500) || (t > 700 && t < 900) ? 0.1 : 1, present: true });
{ const a = run(OLD, blink, 2500).fired.length, b = run(NEW, blink, 2500); rec('깜빡임 2회 중 발동 횟수(1이 정답)', a, b.fired.length, b.fired.length === 1 && b.fired[0].t < 1500); }
// 4) 단속운동: 100ms 동안 박스 밖(400px 이동) 후 복귀 → 게이지 리셋 없이 발동
const saccade = (t) => (t > 400 && t < 500) ? { ...toG(cw / 2 + 400, ch / 2), open: 1, present: true, force: true } : { ...toG(cw / 2, ch / 2), open: 1, present: true, force: true };
{ const a = run(OLD, saccade, 2500), b = run(NEW, saccade, 2500); rec('100ms 단속운동 후 첫 발동 시각(ms)', a.fired[0] ? Math.round(a.fired[0].t) : 'none', b.fired[0] ? Math.round(b.fired[0].t) : 'none', !!b.fired[0] && b.fired[0].t < 1300); }
// 5) 얼굴 상실 → 감쇠 .8→0 ≈ 533ms
{ const eye = NEW(E); let now = 0; for (let i = 0; i < 45; i++) { now = i * DT * 1000; eye.update({ now, dt: DT, sample: { ...toG(cw / 2, ch / 2), open: 1, present: true }, cal: null, cw, ch, targetBox: BOX, mode: 'capture', enabled: true }); }
  let f = null, t0 = now, tz = null; for (let i = 0; i < 120; i++) { now += DT * 1000; f = eye.update({ now, dt: DT, sample: null, cal: null, cw, ch, targetBox: BOX, mode: 'capture', enabled: true }); if (f.fill === 0 && tz === null) tz = now - t0; }
  rec('상실 후 0 까지(ms, 유예 300 + 감쇠)', '-', Math.round(tz), tz > 300 + 500 - 80 && tz < 300 + 750); }
// 6) 정령 반지름 59/61px 및 유지 히스테리시스
for (const d of [59, 61]) { const sp = [{ id: 7, x: cw / 2 + d, y: ch / 2, golden: false }]; const sc = (t) => ({ ...toG(cw / 2, ch / 2), open: 1, present: true, spirits: sp });
  const eye = NEW(E); let now = 0, fired = null; for (let i = 0; i < 60; i++) { now = i * DT * 1000; const r = eye.update({ now, dt: DT, sample: sc(now), cal: null, cw, ch, targetBox: null, mode: 'scan', spirits: sp, enabled: true }); if (r.fired) fired = r; }
  rec(`정령 ${d}px 600ms 홀드 발동`, '-', fired ? 'fired@' + Math.round(now) : 'none', d < 60 ? !!fired : !fired); }
// 7) 재무장 400ms: 발동 직후 같은 대상 재발동 없음
{ const r = run(NEW, center(0), 2000); rec('2초 동안 발동 횟수(재무장·재홀드 포함 ≤2)', '-', r.fired.map(f => Math.round(f.t)).join(','), r.fired.length <= 2 && (r.fired.length < 2 || r.fired[1].t - r.fired[0].t >= 400 + 900 - 50)); }
// 8) 필터 안정성: 20Hz 계단 입력에서 조준점 떨림(프레임 간 이동량) 비교
{ const jit = center(12, 5); const meas = (mk) => { const eye = mk(E); let now = 0, smp = null, nextS = 0, prev = null, mv = []; for (let i = 0; i < 180; i++) { now = i * DT * 1000; if (now >= nextS) { smp = jit(now); nextS = now + 50; } const r = eye.update({ now, dt: DT, sample: smp, cal: null, cw, ch, targetBox: BOX, mode: 'capture', enabled: true }); if (prev && r.point) mv.push(Math.hypot(r.point.x - prev.x, r.point.y - prev.y)); prev = r.point; } return +(mv.reduce((a, b) => a + b, 0) / mv.length).toFixed(2); };
  const a = meas(OLD), b = meas(NEW); rec('12px 지터 입력의 조준점 프레임당 이동(px, 낮을수록 안정)', a, b, b <= a); }
// 9) 응답성: 300px 점프 후 조준점이 90% 도달하는 시간
{ const meas = (mk) => { const eye = mk(E); let now = 0, smp = null, nextS = 0, t90 = null; for (let i = 0; i < 120; i++) { now = i * DT * 1000; const s = now < 300 ? toG(cw / 2, ch / 2) : toG(cw / 2 + 150, ch / 2 + 250); if (now >= nextS) { smp = { ...s, open: 1, present: true }; nextS = now + 50; } const r = eye.update({ now, dt: DT, sample: smp, cal: null, cw, ch, targetBox: BOX, mode: 'capture', enabled: true }); if (now >= 300 && t90 === null && r.point && Math.hypot(r.point.x - (cw / 2 + 150), r.point.y - (ch / 2 + 250)) < 0.1 * Math.hypot(150, 250)) t90 = now - 300; } return t90; };
  const a = meas(OLD), b = meas(NEW); rec('300px 점프 90% 도달(ms, 낮을수록 즉응)', a, b, b !== null && b <= 400); }
// 10) 인식률 통계
{ const r = run(NEW, blink, 2500); rec('stats.presentRate (깜빡임 시나리오)', '-', r.eye.stats().presentRate.toFixed(2), r.eye.stats().presentRate > 0.8); }
console.table(results);
const fails = results.filter(r => !r.pass); console.log(fails.length ? `FAIL ${fails.length}` : 'ALL PASS'); process.exit(fails.length ? 1 : 0);
