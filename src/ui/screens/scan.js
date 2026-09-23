import { register, go, app, $, esc, hudHtml, lupeHtml, toast } from '../shell.js';
import { WONDERS, RARITY } from '../../data/wonders.js';
import { BALANCE, resonanceFillRate, rollVariant } from '../../game/balance.js';
import { state, save, owned, canRescan, discover, catchSpirit, recordMiss, closestChapter } from '../../game/state.js';
import { questEvent } from '../../game/quests.js';
import { checkAchievements } from '../../game/achievements.js';
import { say } from '../../game/narrative.js';
import { loadDetector, detectTarget } from '../../scanner/detector.js';
import { hasCamera, startCamera, stopCamera, flipCamera, snapshot } from '../../scanner/camera.js';
import { startGyro, gyro } from '../../scanner/gyro.js';
import { createCapture } from '../../game/capture.js';
import { createSpirits } from '../../ar/spirits.js';
import { createTracker, coverTransform, drawFrame, drawTarget, drawCaptureRing, drawGradeBurst } from '../../ar/overlay.js';
import * as fx from '../fx.js';

let modelPromise = null;
export const warmModel = () => (modelPromise ??= loadDetector());

register('scan', () => {
  const nudge = closestChapter();
  app.innerHTML = `
  <section class="screen scan">
    <video playsinline muted autoplay></video>
    <img class="still hidden" alt="" />
    <canvas class="overlay"></canvas>
    <div class="hud" id="hud">${hudHtml()}</div>
    <div class="hud2" id="hud2"></div>
    <div class="hint-chip">${nudge.missing.length ? `<span class="pill">🧭 ${esc(nudge.chapter.title)} ${nudge.remain}개 남음 · ${nudge.missing.slice(0, 3).map(l => `${WONDERS[l].emoji} ${l}`).join(' · ')}</span>` : ''}</div>
    <div class="status" id="status"><div class="spinner"></div><div id="statusText">렌즈를 여는 중…</div></div>
    <div class="bottom">
      ${lupeHtml('물건을 화면 가운데에 두고 가만히 있어 봐. 떠다니는 정령은 탭!')}
      <div class="controls">
        <button class="btn icon ghost" id="back" title="타이틀">🏠</button>
        <button class="btn icon ghost" id="flip" title="카메라 전환">🔄</button>
        <label class="btn icon ghost" title="사진으로 스캔">🖼️<input type="file" accept="image/*" id="file" hidden></label>
        <button class="btn icon ghost" id="codex" title="도감">📖</button>
      </div>
    </div>
    ${!state.tutorialSeen ? `<div class="tutorial" id="tut"><div class="steps"><h3>🔭 렌즈 사용법</h3>
      <div class="step"><span>📷</span><div>물건을 가운데에 두면 <b>공명 링</b>이 차오릅니다<small>신뢰도가 높을수록 빨리 찹니다</small></div></div>
      <div class="step"><span>🎯</span><div>링이 다 차면 <b>줄어드는 링</b>이 나타납니다. 노란 선에 닿는 순간 <b>탭!</b><small>퍼펙트 = 변이체 확률 3배 · 별가루 2배</small></div></div>
      <div class="step"><span>🫧</span><div>화면을 떠다니는 <b>정령</b>을 탭하면 조각을 얻습니다<small>폰을 돌려 주변을 둘러보세요 · 5개 = 공명 부스트</small></div></div>
      <button class="btn primary" id="tutOk" style="margin-top:8px;width:100%">시작!</button></div></div>` : ''}
  </section>`;
  const video = $('video'), overlay = $('canvas.overlay'), still = $('img.still'), lupe = $('#lupe'), status = $('#status'), statusText = $('#statusText'), hud2 = $('#hud2');
  const S = { alive: true, mode: 'scan', source: video, target: null, fixedTarget: null, lock: null, gauge: 0, lastT: performance.now(), raf: 0, lastLupe: 0, center: null, capTarget: null, lostSince: 0, gradeAnim: null, armPrism: false, floats: [] };
  const tracker = createTracker(), spirits = createSpirits(), capture = createCapture();
  startGyro();
  const setLupe = (t) => { if (lupe) lupe.textContent = t; S.lastLupe = performance.now(); };
  const renderHud2 = () => { hud2.innerHTML = `<span class="pill">◇ ${state.fragments}/${BALANCE.spirits.fragmentsPerBoost}</span>${state.boost ? `<span class="pill gold">⚡ 부스트 ${state.boost}</span>` : ''}${state.prismTokens ? `<button class="pill ${S.armPrism ? 'armed' : 'prism'}" id="arm">✨ 토큰 ${state.prismTokens} ${S.armPrism ? '장착됨 · 변이체 확정' : '장착'}</button>` : ''}${gyro().active ? '<span class="pill">🧭 AR</span>' : ''}`; const a = $('#arm'); if (a) a.onclick = () => { S.armPrism = !S.armPrism; fx.blip(); renderHud2(); }; };
  renderHud2();
  $('#back').onclick = () => go('title'); $('#codex').onclick = () => go('codex');
  $('#flip').onclick = async () => { fx.blip(); try { await flipCamera(video); } catch {} };
  $('#file').onchange = (e) => scanImage(e.target.files[0]);
  $('#tutOk') && ($('#tutOk').onclick = () => { state.tutorialSeen = true; save(); fx.blip(); $('#tut').remove(); });

  // 탭: 포획 판정 또는 정령 포획
  overlay.onpointerdown = (e) => {
    const now = performance.now(), rect = overlay.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (S.mode === 'capture') {
      const res = capture.tap(now); if (!res) return;
      S.mode = 'grade'; S.gradeAnim = { grade: res.grade, t0: now };
      const G = BALANCE.capture.grades[res.grade];
      if (res.grade === 'MISS') { recordMiss(); fx.denied(); fx.vibrate([60, 40, 60]); setLupe('도망쳤어! 공명을 다시 모아.'); }
      else { flashGrade(G.color); fx.vibrate(res.grade === 'PERFECT' ? [30, 30, 30, 30, 80] : [40]); if (res.grade === 'PERFECT') fx.chime(3, false); else fx.blip(); }
      return;
    }
    const hit = spirits.tap(x, y, now);
    if (hit) {
      const r = catchSpirit(hit.golden); fx.vibrate([20]); hit.golden ? fx.chime(2, true) : fx.blip();
      S.floats.push({ x, y, t0: now, text: hit.golden ? '✨ 프리즘 토큰 +1' : `◇ +1  ✨+${BALANCE.reward.spiritDust}`, color: hit.golden ? '#ffd166' : '#8fe3ff' });
      if (r.boostGained) { toast('⚡ 공명 부스트 획득! 다음 공명이 2배 빨라져', 2500); setLupe('조각이 모였어. 다음 공명은 훨씬 빨라질 거야.'); }
      afterEvent({ type: 'spirit' }); renderHud2();
    }
  };
  function flashGrade(color) { const d = document.createElement('div'); d.className = 'grade-flash'; d.style.setProperty('--gc', color); app.appendChild(d); setTimeout(() => d.remove(), 650); }
  function afterEvent(ev) {
    for (const q of questEvent(ev)) toast(`📋 의뢰 완료! +${q.reward.xp} XP · +${q.reward.dust} ✨${q.reward.prism ? ' · ✨ 프리즘 토큰' : ''}`, 3500, 'quest');
    for (const a of checkAchievements()) toast(`🏅 업적 「${esc(a.title)}」 ${a.icon} ${esc(a.desc)}`, 3500, 'ach');
    $('#hud').innerHTML = hudHtml();
  }

  (async () => {
    try {
      statusText.textContent = '온디바이스 AI 모델 로딩 (첫 실행만 몇 초)…';
      await warmModel(); if (!S.alive) return;
      if (!hasCamera()) throw new Error('no-camera');
      statusText.textContent = '카메라 권한을 허용해 주세요';
      await startCamera(video); if (!S.alive) return;
      status.classList.add('hidden');
    } catch {
      if (!S.alive) return;
      status.innerHTML = `<div style="font-size:40px">🖼️</div><div>카메라를 쓸 수 없어요.<br><small style="color:var(--mute)">사진을 골라 같은 방식으로 스캔할 수 있습니다.</small></div><label class="btn primary">사진 선택<input type="file" accept="image/*" hidden id="file2"></label><button class="btn ghost" id="back2">돌아가기</button>`;
      $('#file2').onchange = (ev) => scanImage(ev.target.files[0]); $('#back2').onclick = () => go('title');
    }
    detectLoop(); S.raf = requestAnimationFrame(drawLoop);
  })();

  async function detectLoop() {
    while (S.alive) {
      if (S.source === video && video.readyState >= 2 && !S.fixedTarget) { try { S.target = await detectTarget(video); } catch { S.target = null; } }
      await new Promise(r => setTimeout(r, 40));
    }
  }
  function drawLoop(t) {
    if (!S.alive) return;
    const dt = Math.min(0.1, (t - S.lastT) / 1000); S.lastT = t;
    const cw = overlay.clientWidth, ch = overlay.clientHeight; if (overlay.width !== cw || overlay.height !== ch) { overlay.width = cw; overlay.height = ch; }
    const x = overlay.getContext('2d'); x.clearRect(0, 0, cw, ch); drawFrame(x, cw, ch, t);
    const tf = coverTransform(S.source, cw, ch), rm = state.settings.reduceMotion, boosted = state.boost > 0;
    const tgt = S.fixedTarget ?? S.target; let cooldown = null;
    if (S.mode === 'scan') {
      if (tgt) {
        if (S.lock !== tgt.label) { S.lock = tgt.label; S.gauge = Math.min(S.gauge, 0.15); }
        const cd = canRescan(tgt.label);
        if (cd.ok) { S.gauge = Math.min(1, S.gauge + resonanceFillRate(tgt.score, boosted) * dt); fx.tick(S.gauge); if (t - S.lastLupe > 3500) setLupe(say.scanning()); }
        else { cooldown = cd.remainMs; S.gauge = Math.max(0, S.gauge - 2 * dt); if (t - S.lastLupe > 3500) setLupe(say.cooldown()); }
      } else { S.gauge = Math.max(0, S.gauge - BALANCE.resonance.decayPerSec * dt); if (S.gauge === 0) S.lock = null; }
      const box = tracker.update(tgt?.bbox ?? null, dt);
      S.center = box ? drawTarget(x, { box, label: tgt.label, score: tgt.score, gauge: S.gauge, cooldownMs: cooldown, owned: owned(tgt.label), now: t, dt, reduceMotion: rm, boosted }, tf) : null;
      if (S.gauge >= 1 && tgt && cooldown == null) {
        S.capTarget = { ...tgt };
        if (state.settings.autoCapture) return finish('AUTO');
        S.mode = 'capture'; capture.start(t); S.lostSince = 0; fx.chime(1, false); fx.vibrate([30]); setLupe('지금이야! 링이 노란 선에 닿을 때 탭!');
      }
    } else if (S.mode === 'capture' || S.mode === 'grade') {
      const live = S.fixedTarget ?? S.target;
      if (S.mode === 'capture') { if (!live || live.label !== S.capTarget.label) { S.lostSince ||= t; if (t - S.lostSince > 1500) { capture.stop(); S.mode = 'scan'; S.gauge = 0.5; setLupe(say.lost()); } } else S.lostSince = 0; }
      const box = tracker.update(live?.bbox ?? S.capTarget.bbox, dt);
      S.center = drawTarget(x, { box, label: S.capTarget.label, score: S.capTarget.score, gauge: 1, cooldownMs: null, owned: owned(S.capTarget.label), now: t, dt, reduceMotion: rm, boosted }, tf);
      if (S.mode === 'capture') { const ring = capture.tick(t); if (ring?.auto) return finish('AUTO'); if (ring) drawCaptureRing(x, S.center, ring, t); }
      else { const p = (t - S.gradeAnim.t0) / 750; drawGradeBurst(x, S.center, S.gradeAnim.grade, Math.min(1, p)); if (p >= 1) { if (S.gradeAnim.grade === 'MISS') { S.mode = 'scan'; S.gauge = BALANCE.capture.missGaugeReset; } else return finish(S.gradeAnim.grade); } }
    }
    // AR 정령 + 플로팅 텍스트
    spirits.update(t, dt, cw, ch, S.center ? { x: S.center.cx, y: S.center.cy } : null); spirits.draw(x);
    S.floats = S.floats.filter(f => t - f.t0 < 900);
    for (const f of S.floats) { const p = (t - f.t0) / 900; x.globalAlpha = 1 - p; x.font = '800 15px system-ui'; x.textAlign = 'center'; x.fillStyle = f.color; x.fillText(f.text, f.x, f.y - 20 - p * 50); x.globalAlpha = 1; }
    S.raf = requestAnimationFrame(drawLoop);
  }
  async function scanImage(file) {
    if (!file || !S.alive) return;
    fx.unlockAudio();
    const url = URL.createObjectURL(file); still.src = url; await new Promise(r => { still.onload = r; });
    still.classList.remove('hidden'); video.classList.add('hidden'); status.classList.add('hidden');
    S.source = still; S.target = null; S.fixedTarget = null; S.mode = 'scan'; S.gauge = 0; tracker.update(null, 1);
    setLupe('사진 속을 들여다보는 중…');
    const tgt = await detectTarget(still);
    if (!S.alive) return;
    const back = () => { still.classList.add('hidden'); video.classList.remove('hidden'); S.source = video; S.fixedTarget = null; };
    if (!tgt) { setLupe('여기엔 원더가 안 보여. 다른 사진은?'); fx.denied(); setTimeout(back, 1600); return; }
    const cd = canRescan(tgt.label);
    if (!cd.ok) { setLupe(`${say.cooldown()} (${Math.ceil(cd.remainMs / 1000)}초)`); fx.denied(); setTimeout(back, 1600); return; }
    S.fixedTarget = tgt; // 이후 흐름(공명 → 포획 링)은 카메라와 동일
  }
  function finish(grade) {
    if (!S.alive) return;
    const tgt = S.capTarget, fromImage = S.source === still;
    const photo = snapshot(S.source, fromImage ? null : tgt.bbox);
    const usedToken = S.armPrism && state.prismTokens > 0;
    const isVariant = rollVariant(tgt.score, BALANCE.capture.grades[grade].variantMul, usedToken);
    const result = discover(tgt.label, { confidence: tgt.score, isVariant, grade, usedToken });
    const questsDone = questEvent({ type: 'discover', isNew: result.isNew, chapter: result.wonder.chapter, rarity: result.wonder.rarity, grade });
    const achs = checkAchievements();
    go('reveal', { ...result, photo, questsDone, achs, usedToken });
  }
  if (location.search.includes('debug')) window.__scan = { S, capture, spirits, ring: () => capture.tick(performance.now()) };
  return () => { S.alive = false; cancelAnimationFrame(S.raf); stopCamera(video); };
});
