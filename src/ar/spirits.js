import { BALANCE } from '../game/balance.js';
import { gyro, angleDiff } from '../scanner/gyro.js';

/** AR 정령: 자이로 요/피치에 앵커된 위습. 자이로 없으면 화면 내 드리프트 */
export function createSpirits() {
  const S = BALANCE.spirits;
  let list = [], nextSpawn = performance.now() + 2500, id = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function spawn(now, cw, ch) {
    const g = gyro();
    const golden = Math.random() < S.goldenChance;
    list.push({
      id: ++id, golden, born: now, life: S.lifeMs * (golden ? 0.8 : 1),
      // 월드 앵커(자이로 기준) 또는 화면 좌표(폴백)
      yaw: g.active ? g.yaw + rnd(-28, 28) : 0, pitch: g.active ? g.pitch + rnd(-16, 16) : 0,
      sx: rnd(cw * 0.15, cw * 0.85), sy: rnd(ch * 0.2, ch * 0.7), vx: rnd(-18, 18), vy: rnd(-12, 12),
      phase: rnd(0, Math.PI * 2), r: golden ? 16 : rnd(11, 15), x: 0, y: 0, alpha: 0, popped: 0,
    });
  }

  return {
    get list() { return list; },
    reset() { list = []; nextSpawn = performance.now() + 2000; },
    update(now, dt, cw, ch, attract /* {x,y} | null */) {
      if (now >= nextSpawn && list.filter(s => !s.popped).length < S.maxAlive) { spawn(now, cw, ch); nextSpawn = now + rnd(S.spawnMinMs, S.spawnMaxMs); }
      const g = gyro(), pxPerDeg = cw / S.fovDeg;
      for (const s of list) {
        const age = now - s.born;
        if (s.popped) { s.alpha = Math.max(0, 1 - (now - s.popped) / 350); continue; }
        if (g.active) { s.x = cw / 2 - angleDiff(s.yaw, g.yaw) * pxPerDeg; s.y = ch / 2 + (s.pitch - g.pitch) * pxPerDeg; }
        else { s.sx += s.vx * dt; s.sy += s.vy * dt; if (s.sx < 30 || s.sx > cw - 30) s.vx *= -1; if (s.sy < 80 || s.sy > ch - 160) s.vy *= -1; s.x = s.sx; s.y = s.sy; }
        if (attract) { const k = 0.35; s.x += (attract.x - s.x) * k * Math.min(1, age / 2000) * 0.5; s.y += (attract.y - s.y) * k * Math.min(1, age / 2000) * 0.5; }
        s.x += Math.sin(now / 420 + s.phase) * 6; s.y += Math.cos(now / 360 + s.phase) * 5;
        s.alpha = Math.min(1, age / 500) * Math.min(1, (s.life - age) / 900);
      }
      list = list.filter(s => (!s.popped && now - s.born < s.life) || (s.popped && now - s.popped < 350));
    },
    /** 탭 위치의 정령 반환(팝 처리). 없으면 null */
    tap(x, y, now) {
      const hit = list.find(s => !s.popped && Math.hypot(s.x - x, s.y - y) <= S.tapRadiusPx + s.r);
      if (hit) hit.popped = now;
      return hit ?? null;
    },
    draw(x) {
      for (const s of list) {
        if (s.alpha <= 0) continue;
        const scale = s.popped ? 1 + (1 - s.alpha) * 1.6 : 1, r = s.r * scale;
        x.save(); x.globalAlpha = s.alpha;
        const col = s.golden ? '#ffd166' : '#8fe3ff';
        const g = x.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 2.2); g.addColorStop(0, col); g.addColorStop(0.35, col + 'aa'); g.addColorStop(1, 'transparent');
        x.fillStyle = g; x.beginPath(); x.arc(s.x, s.y, r * 2.2, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(s.x, s.y, r * 0.45, 0, Math.PI * 2); x.fill();
        // 꼬리 파티클
        for (let i = 0; i < 3; i++) { const a = performance.now() / 300 + i * 2.1 + s.phase; x.fillStyle = col; x.globalAlpha = s.alpha * 0.6; x.beginPath(); x.arc(s.x + Math.cos(a) * r * 1.5, s.y + Math.sin(a) * r * 1.5, 2.2, 0, Math.PI * 2); x.fill(); }
        if (s.golden && !s.popped) { x.globalAlpha = s.alpha; x.font = '700 11px system-ui'; x.textAlign = 'center'; x.fillStyle = '#ffd166'; x.fillText('★ 황금 정령', s.x, s.y - r * 2.4); }
        x.restore();
      }
    },
  };
}
