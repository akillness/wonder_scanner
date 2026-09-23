import { BALANCE, gradeCapture } from './balance.js';

/** 포획 타이밍 링 상태 머신. start() → tick(now) → tap(now) */
export function createCapture() {
  const C = BALANCE.capture;
  let t0 = 0, active = false, cycle = 0;
  return {
    get active() { return active; },
    start(now) { t0 = now; active = true; cycle = 0; },
    stop() { active = false; },
    /** 현재 링 반경 비율(1→0)과 사이클. 사이클 초과 시 { auto:true } */
    tick(now) {
      if (!active) return null;
      const el = now - t0, c = Math.floor(el / C.cycleMs);
      if (c >= C.cycles) return { r: 0, cycle: C.cycles, auto: true };
      cycle = c;
      return { r: 1 - (el % C.cycleMs) / C.cycleMs, cycle: c, auto: false };
    },
    tap(now) {
      const s = this.tick(now); if (!s || s.auto) return null;
      active = false;
      return { grade: gradeCapture(s.r), r: s.r };
    },
  };
}
