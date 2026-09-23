import { register, go, app, $, esc, hudHtml, lupeHtml, toast, icon, glyph } from '../shell.js';
import { WONDERS, RARITY } from '../../data/wonders.js';
import { BALANCE, resonanceFillRate, rollVariant } from '../../game/balance.js';
import { state, save, owned, canRescan, discover, catchSpirit, recordMiss, closestChapter } from '../../game/state.js';
import { questEvent } from '../../game/quests.js';
import { checkAchievements } from '../../game/achievements.js';
import { say } from '../../game/narrative.js';
import { loadDetector, detectTarget } from '../../scanner/detector.js';
import { hasCamera, startCamera, stopCamera, flipCamera, snapshot, cameraAlive } from '../../scanner/camera.js';
import { startGyro, gyro } from '../../scanner/gyro.js';
import { createCapture } from '../../game/capture.js';
import { createSpirits } from '../../ar/spirits.js';
import { createTracker, coverTransform, drawFrame, drawTarget, drawCaptureRing, drawGradeBurst, gradeInk } from '../../ar/overlay.js';
import * as fx from '../fx.js';
import { createRecorder } from '../../scanner/recorder.js';
import { addMoment, MEDIA } from '../../game/media.js';
import { bumpCombo, claimMilestones } from '../../game/economy.js';
import { advise, eventMod, onDiscoverEvent, markEventSeen, activeEvent } from '../../game/companion.js';
import { createGaze } from '../../scanner/gaze.js';
import { createEyeGauge, drawEyeReticle } from '../../scanner/eye.js';
import { currentFacing } from '../../scanner/camera.js';

let modelPromise = null;
export const warmModel = () => (modelPromise ??= loadDetector());

// 플로팅 텍스트 잉크: 황금 정령 = 황동, 일반 정령 = 녹청
const FLOAT_INK = { golden: '#E2B45A', normal: '#6DB5A0' };
const FLOAT_FONT = '600 15px "IBM Plex Sans KR", sans-serif';

register('scan', () => {
  const nudge = closestChapter();
  app.innerHTML = `
  <section class="screen scan">
    <video playsinline muted autoplay></video>
    <img class="still hidden" alt="" />
    <canvas class="overlay"></canvas>
    <div class="hud-stack">
      <div class="hud" id="hud">${hudHtml()}</div>
      <div class="hud2" id="hud2"></div>
      <div class="hint-chip">${nudge.missing.length ? `<span class="pill">${icon('ch-' + nudge.chapter.id)} ${esc(nudge.chapter.title)} ${nudge.remain}개 남음 · ${nudge.missing.slice(0, 3).map(l => `${glyph(WONDERS[l].emoji)} ${esc(l)}`).join(' · ')}</span>` : ''}</div>
      <div class="rec hidden" id="rec">${icon('rec', { size: 12 })} REC</div>
    </div>
    <div class="vignette" id="vig"></div>
    <button class="companion" id="comp" title="루페에게 묻기"><img src="/img/lupe.svg" alt="루페"/><span class="dot"></span></button>
    <button class="eye-hud" id="eyeHud" title="아이 게이지 (탭: 보정 · 길게: 켜기/끄기)">${icon('eye', { size: 22 })}<small id="eyeText">시선</small></button><div class="eye-flash" id="eyeFlash"></div>
    <div class="status" id="status"><div class="spinner"></div><div id="statusText">렌즈를 여는 중…</div></div>
    <div class="bottom">
      ${lupeHtml('물건을 화면 가운데에 두고 가만히 있어 봐. 떠다니는 정령은 탭!')}
      <div class="controls">
        <button class="btn icon ghost side" id="back" title="타이틀">${icon('home', { label: '타이틀' })}</button>
        <label class="btn icon ghost side" title="사진으로 스캔">${icon('image', { label: '사진으로 스캔' })}<input type="file" accept="image/*" id="file" hidden></label>
        <button class="shutter" id="shutter" title="탭: 스냅 · 길게: 영상" aria-label="셔터"><i></i></button>
        <button class="btn icon ghost side" id="flip" title="카메라 전환">${icon('flip', { label: '카메라 전환' })}</button>
      </div>
      <small class="shutter-hint">탭 = 스냅 · 길게 = 영상</small>
    </div>
    ${!state.tutorialSeen ? `<div class="tutorial" id="tut"><div class="steps"><h3>${icon('scope')} 렌즈 사용법</h3>
      <div class="step"><span>${icon('camera', { size: 24 })}</span><div>물건을 가운데에 두면 <b>공명 링</b>이 차오릅니다<small>신뢰도가 높을수록 빨리 찹니다</small></div></div>
      <div class="step"><span>${icon('target', { size: 24 })}</span><div>링이 다 차면 <b>줄어드는 링</b>이 나타납니다. 노란 선에 닿는 순간 <b>탭!</b><small>퍼펙트 = 변이체 확률 3배 · 별가루 2배</small></div></div>
      <div class="step"><span>${icon('fragment', { size: 24 })}</span><div>화면을 떠다니는 <b>정령</b>을 탭하면 조각을 얻습니다<small>폰을 돌려 주변을 둘러보세요 · 5개 = 공명 부스트</small></div></div>
      <button class="btn primary" id="tutOk" style="margin-top:8px;width:100%">시작!</button><small class="tut-note">시작을 누르면 카메라 권한 창이 떠요. <b>허용</b>을 눌러 주세요 — 권한 창이 떠 있는 동안에는 화면이 눌리지 않아요.</small></div></div>` : ''}
  </section>`;
  const video = $('video'), overlay = $('canvas.overlay'), still = $('img.still'), lupe = $('#lupe'), status = $('#status'), statusText = $('#statusText'), hud2 = $('#hud2');
  const S = { alive: true, mode: 'scan', source: video, target: null, fixedTarget: null, lock: null, gauge: 0, lastT: performance.now(), raf: 0, lastLupe: 0, center: null, capTarget: null, lostSince: 0, gradeAnim: null, armPrism: false, floats: [] };
  const tracker = createTracker(), spirits = createSpirits(), capture = createCapture(), recorder = createRecorder(); let lastBeat = 0, recBadge = null;
  let gaze = null, manualRec = false, eyeImpact = null, gazeInject; const eye = createEyeGauge(BALANCE.eye); let eyeState = { fill: 0, point: null, present: false, target: null, jitter: 0 };
  startGyro();
  const setLupe = (t) => { if (lupe) lupe.textContent = t; S.lastLupe = performance.now(); };
  // 루페 조언(아이콘 이름 + 문장): 아이콘은 icon() SVG, 문장은 이스케이프
  const setLupeTip = (tip) => { if (lupe) lupe.innerHTML = `${icon(tip.icon)} ${esc(tip.text)}`; S.lastLupe = performance.now(); };
  const renderHud2 = () => { hud2.innerHTML = `<span class="pill">${icon('fragment')} ${state.fragments}/${BALANCE.spirits.fragmentsPerBoost}</span>${state.boost ? `<span class="pill gold">${icon('boost')} 부스트 ${state.boost}</span>` : ''}${state.prismTokens ? `<button class="pill ${S.armPrism ? 'armed' : 'prism'}" id="arm">${icon('prism')} 토큰 ${state.prismTokens} ${S.armPrism ? '장착됨 · 변이체 확정' : '장착'}</button>` : ''}${gyro().active ? `<span class="pill">${icon('ar')} AR</span>` : ''}`; const a = $('#arm'); if (a) a.onclick = () => { S.armPrism = !S.armPrism; fx.blip(); renderHud2(); }; };
  renderHud2();
  // ── 아이 게이지 (시선 추적): 전면 카메라 + settings.eyeGauge 일 때만 로드
  const eyeWanted = () => state.settings.eyeGauge !== false && S.source === video && currentFacing() === 'user';
  function eyeText(t) { const el = $('#eyeText'); if (el) el.textContent = t; }
  async function syncEye() {
    const hud = $('#eyeHud'); if (hud) hud.classList.toggle('off', state.settings.eyeGauge === false);
    if (!eyeWanted()) { gaze?.close(); gaze = null; eye.reset(); eyeText(state.settings.eyeGauge === false ? '시선 OFF' : '전면 카메라에서 시선 추적이 켜져요'); return; }
    if (gaze) return; gaze = createGaze({ headGain: BALANCE.eye.headGain });
    try { await gaze.load(eyeText); eyeText(state.eyeCal ? '시선 ON' : '시선 ON · 탭해서 보정'); } catch { eyeText('시선 모델 로드 실패'); gaze = null; }
  }
  function calibrate() { const smp = gazeInject !== undefined ? gazeInject : gaze?.sample(video, performance.now()); if (!smp?.present) { toast('얼굴이 보여야 보정할 수 있어요', 1800); return false; } state.eyeCal = { gx: smp.gx, gy: smp.gy }; save(); eye.reset(); fx.blip(); toast('시선 보정 완료 · 지금 보는 곳이 화면 중앙', 1800); eyeText('시선 ON'); return true; }
  { let pressT = 0; const hud = $('#eyeHud'); hud.onpointerdown = () => { pressT = performance.now(); }; hud.onpointerup = () => { if (performance.now() - pressT > 600) { state.settings.eyeGauge = state.settings.eyeGauge === false; save(); fx.blip(); syncEye(); } else if (eyeWanted()) calibrate(); else toast(state.settings.eyeGauge === false ? '길게 눌러 아이 게이지 켜기' : '전면 카메라로 전환하면 시선 추적이 켜져요', 2000); }; }
  function eyeFire(f, now) {
    const pt = eyeState.point ?? { x: overlay.clientWidth / 2, y: overlay.clientHeight / 2 };
    eyeImpact = { t0: now, x: pt.x, y: pt.y, color: f.type === 'spirit' ? '#6DB5A0' : '#E2B45A' };
    const hud = $('#eyeHud'); hud?.classList.remove('impact'); void hud?.offsetWidth; hud?.classList.add('impact');
    if (!state.settings.reduceMotion) { const fl = $('#eyeFlash'); fl?.classList.remove('on'); void fl?.offsetWidth; fl?.classList.add('on'); }
    fx.vibrate([20, 40, 60]); fx.comboTone(3);
    if (f.type === 'wonder' && S.mode === 'capture') { capture.stop(); S.mode = 'grade'; S.gradeAnim = { grade: f.grade, t0: now }; const G = BALANCE.capture.grades[f.grade]; flashGrade(G.color); if (f.grade === 'PERFECT') fx.chime(3, false); setLupe(`눈으로 붙잡았어! ${G.label}`); }
    else if (f.type === 'spirit') { const sp = spirits.list.find(x => x.id === f.id && !x.popped); if (!sp) return; sp.popped = now; const r = catchSpirit(sp.golden); S.floats.push({ x: sp.x, y: sp.y, t0: now, text: sp.golden ? '프리즘 +1' : '조각 +1', color: sp.golden ? FLOAT_INK.golden : FLOAT_INK.normal }); if (r.boostGained) toast(`${icon('boost')} 공명 부스트 획득!`, 2000); afterEvent({ type: 'spirit' }); renderHud2(); }
  }
  // ── 촬영 · 스냅 (제스처 대신 버튼)
  const toggleRec = () => { if (S.source !== video) return toast('영상 촬영은 카메라 모드에서 돼요', 1800); if (!recorder.supported) return setLupe('이 브라우저는 영상 녹화를 지원하지 않아.');
    if (recorder.recording) { manualRec = false; $('#shutter').classList.remove('on'); recorder.stop().then(async clip => { $('#rec')?.classList.add('hidden'); if (!clip) return; const lbl = S.lock ?? S.target?.label; if (!lbl) { toast('원더를 비춘 상태의 클립만 저장돼요', 2000); return; } const photo = snapshot(video, null); await addMoment({ label: lbl, grade: 'AUTO', variant: false, frame: state.activeFrame, photoDataUrl: photo, clip, clipType: clip.type }); state.stats.clips += 1; save(); toast(`${icon('film')} 자유 클립을 앨범에 저장했어요`, 2200); }); }
    else { recorder.manual = true; if (recorder.start(video, overlay)) { manualRec = true; $('#shutter').classList.add('on'); $('#rec')?.classList.remove('hidden'); setLupe('촬영 중… 다시 누르면 정지 (최대 20초).'); } } };
  const doSnap = () => { const lbl = S.lock ?? S.target?.label ?? S.fixedTarget?.label; if (!lbl) return setLupe('원더를 비춘 채로 스냅하자.'); const photo = snapshot(S.source, S.source === video ? (S.target?.bbox ?? null) : null); fx.flash(); fx.blip(); addMoment({ label: lbl, grade: 'AUTO', variant: false, frame: state.activeFrame, photoDataUrl: photo }).then(() => toast(`${icon('camera')} 스냅 저장 → 앨범`, 1800)); };
  { let hold = null, held = false; const sh = $('#shutter');
    sh.onpointerdown = () => { held = false; hold = setTimeout(() => { held = true; fx.vibrate([30]); toggleRec(); }, 500); };
    sh.onpointerup = sh.onpointerleave = sh.onpointercancel = (e) => { clearTimeout(hold); if (e.type === 'pointerup' && !held) { if (recorder.recording) toggleRec(); else doSnap(); } held = e.type === 'pointerup' ? false : held; }; }
  setTimeout(syncEye, 1200);
  const ev = activeEvent(); if (ev && !ev.done) $('#hud2').insertAdjacentHTML('beforeend', `<span class="pill event">${icon('event')} ${esc(ev.title)}</span>`);
  $('#comp').onclick = () => { fx.blip(); const tip = advise({ screen: 'scan', armed: S.armPrism }); setLupeTip(tip); markEventSeen(); $('#comp .dot')?.remove(); if (tip.action === 'arm' && $('#arm')) { S.armPrism = true; renderHud2(); } };
  setTimeout(() => { if (S.alive) { const tip = advise({ screen: 'scan', armed: S.armPrism }); if (tip.action === 'event') { setLupeTip(tip); markEventSeen(); } } }, 2500);
  $('#back').onclick = () => go('title');
  $('#flip').onclick = async () => { fx.blip(); try { await flipCamera(video); } catch {} syncEye(); };
  $('#file').onchange = (e) => scanImage(e.target.files[0]);
  let tutResolve = null; const tutDone = $('#tut') ? new Promise(r => { tutResolve = r; }) : Promise.resolve();
  $('#tutOk') && ($('#tutOk').onclick = () => { state.tutorialSeen = true; save(); fx.unlockAudio(); fx.blip(); $('#tut').remove(); tutResolve?.(); });

  // 탭: 포획 판정 또는 정령 포획
  overlay.onpointerdown = (e) => {
    const now = performance.now(), rect = overlay.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (S.mode === 'capture') {
      const res = capture.tap(now); if (!res) return;
      S.mode = 'grade'; S.gradeAnim = { grade: res.grade, t0: now };
      const G = BALANCE.capture.grades[res.grade];
      if (res.grade === 'MISS') { recordMiss(); fx.denied(); fx.vibrate([60, 40, 60]); setLupe('도망쳤어! 공명을 다시 모아.'); }
      else { flashGrade(gradeInk(res.grade, G.color)); fx.vibrate(res.grade === 'PERFECT' ? [30, 30, 30, 30, 80] : [40]); if (res.grade === 'PERFECT') fx.chime(3, false); else fx.blip(); }
      return;
    }
    const hit = spirits.tap(x, y, now);
    if (hit) {
      const r = catchSpirit(hit.golden); fx.vibrate([20]); hit.golden ? fx.chime(2, true) : fx.blip();
      S.floats.push({ x, y, t0: now, text: hit.golden ? '프리즘 토큰 +1' : `조각 +1 · 별가루 +${BALANCE.reward.spiritDust}`, color: hit.golden ? FLOAT_INK.golden : FLOAT_INK.normal });
      if (r.boostGained) { toast(`${icon('boost')} 공명 부스트 획득! 다음 공명이 2배 빨라져`, 2500); setLupe('조각이 모였어. 다음 공명은 훨씬 빨라질 거야.'); }
      afterEvent({ type: 'spirit' }); renderHud2();
    }
  };
  function flashGrade(color) { if (state.settings.reduceMotion) return; const d = document.createElement('div'); d.className = 'grade-flash'; d.style.setProperty('--gc', color); app.appendChild(d); setTimeout(() => d.remove(), 650); }
  function afterEvent(ev) {
    for (const q of questEvent(ev)) toast(`${icon('quest')} 의뢰 완료! +${q.reward.xp} XP · 별가루 +${q.reward.dust}${q.reward.prism ? ` · ${icon('prism')} 프리즘 토큰` : ''}`, 3500, 'quest');
    for (const a of checkAchievements()) toast(`${icon('medal')} 업적 「${esc(a.title)}」 ${icon(a.icon)} ${esc(a.desc)}`, 3500, 'ach');
    $('#hud').innerHTML = hudHtml();
  }

  (async () => {
    try {
      statusText.textContent = '온디바이스 AI 모델 로딩 (첫 실행만 몇 초)…';
      await warmModel(); if (!S.alive) return;
      if (!hasCamera()) throw new Error('no-camera');
      if ($('#tut')) statusText.textContent = '사용법을 읽고 시작을 누르면 카메라를 열어요';
      await tutDone; if (!S.alive) return;
      statusText.innerHTML = '카메라 권한 창에서 <b>허용</b>을 눌러 주세요<br><small>권한 창이 떠 있는 동안에는 화면이 눌리지 않아요</small>';
      await startCamera(video); if (!S.alive) return;
      status.classList.add('hidden');
    } catch {
      if (!S.alive) return;
      status.innerHTML = `<div style="color:var(--mute)">${icon('image', { size: 40 })}</div><div>카메라를 쓸 수 없어요.<br><small style="color:var(--mute)">사진을 골라 같은 방식으로 스캔할 수 있습니다.</small></div><label class="btn primary">사진 선택<input type="file" accept="image/*" hidden id="file2"></label><button class="btn ghost" id="back2">돌아가기</button>`;
      $('#file2').onchange = (ev) => scanImage(ev.target.files[0]); $('#back2').onclick = () => go('title');
    }
    detectLoop(); S.raf = requestAnimationFrame(drawLoop);
  })();

  // 잠금 히스테리시스: 라벨이 프레임마다 흔들려도 게이지가 리셋되지 않도록 (GAMEPLAY_V7 §3.2)
  let held = null, heldAt = 0, cand = null, candN = 0;
  function stabilize(det) {
    const now = performance.now();
    if (!det) { if (held && now - heldAt < 450) return held; held = null; cand = null; candN = 0; return null; }
    if (!held || det.label === held.label) { held = det; heldAt = now; cand = null; candN = 0; return det; }
    if (cand === det.label) candN++; else { cand = det.label; candN = 1; }
    if (candN >= 4 || det.score - held.score >= 0.15) { held = det; heldAt = now; cand = null; candN = 0; return det; }
    return now - heldAt < 450 ? held : (held = det, heldAt = now, det);
  }
  async function detectLoop() {
    while (S.alive) {
      if (document.visibilityState === 'visible' && S.source === video && video.readyState >= 2 && !S.fixedTarget) { try { const d = await detectTarget(video); if (location.search.includes('debug')) window.__lastDet = d ? `${d.label}:${d.score.toFixed(2)}` : null; S.target = stabilize(d); } catch (e) { if (location.search.includes('debug')) window.__lastDet = 'ERR ' + e.message; S.target = null; } }
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
        if (S.lock !== tgt.label) { S.lock = tgt.label; S.gauge = Math.min(S.gauge, 0.15); if (state.hints.includes(tgt.label) && !owned(tgt.label)) setLupe('친구가 보여준 그 원더야!'); }
        const cd = canRescan(tgt.label);
        if (cd.ok) { S.gauge = Math.min(1, S.gauge + resonanceFillRate(tgt.score, boosted) * eventMod('fill') * dt); fx.tick(S.gauge); if (t - S.lastLupe > 3500) setLupe(say.scanning());
          if (S.gauge >= MEDIA.preRollGauge && state.settings.recordClips && S.source === video && !recorder.recording && recorder.supported && document.visibilityState === 'visible') { if ((recorder.manual = false, recorder.start(S.source, overlay))) $('#rec')?.classList.remove('hidden'); }
          if (WONDERS[tgt.label].rarity === 4 && !owned(tgt.label)) { $('#vig')?.classList.add('on'); if (t - lastBeat > 900) { fx.heartbeat(); fx.vibrate([15]); lastBeat = t; } } else $('#vig')?.classList.remove('on'); }
        else { cooldown = cd.remainMs; S.gauge = Math.max(0, S.gauge - 2 * dt); if (t - S.lastLupe > 3500) setLupe(say.cooldown()); }
      } else { S.gauge = Math.max(0, S.gauge - BALANCE.resonance.decayPerSec * dt); if (S.gauge === 0) { S.lock = null; if (recorder.recording) { recorder.cancel(); $('#rec')?.classList.add('hidden'); } } $('#vig')?.classList.remove('on'); }
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
      if (S.mode === 'capture') { const ring = capture.tick(t); if (ring?.auto) return finish('AUTO'); if (ring) { const rr = Math.min(S.center.r, Math.min(cw, ch) * 0.12); drawCaptureRing(x, { ...S.center, r: rr, cx: Math.max(rr * 3.3, Math.min(cw - rr * 3.3, S.center.cx)), cy: Math.max(rr * 3.3 + 40, Math.min(ch - rr * 3.3 - 170, S.center.cy)) }, ring, t); } }
      else { const p = (t - S.gradeAnim.t0) / 750; drawGradeBurst(x, S.center, S.gradeAnim.grade, Math.min(1, p)); if (p >= 1) { if (S.gradeAnim.grade === 'MISS') { S.mode = 'scan'; S.gauge = BALANCE.capture.missGaugeReset; } else return finish(S.gradeAnim.grade); } }
    }
    // AR 정령 + 플로팅 텍스트
    spirits.update(t, dt * eventMod('spirit'), cw, ch, S.center ? { x: S.center.cx, y: S.center.cy } : null); spirits.draw(x);
    S.floats = S.floats.filter(f => t - f.t0 < 900);
    for (const f of S.floats) { const p = (t - f.t0) / 900; x.globalAlpha = 1 - p; x.font = FLOAT_FONT; x.textAlign = 'center'; x.fillStyle = f.color; x.fillText(f.text, f.x, f.y - 20 - p * 50); x.globalAlpha = 1; }
    { const smp = gazeInject !== undefined ? gazeInject : (gaze?.ready && eyeWanted() ? gaze.sample(video, t) : null);
      const active = gazeInject !== undefined || (!!gaze && eyeWanted());
      if (active) { const box = S.mode === 'capture' && S.center && tracker.box ? (() => { const [bx, by, bw, bh] = tracker.box; return [bx * tf.s + tf.ox, by * tf.s + tf.oy, bw * tf.s, bh * tf.s]; })() : null;
        eyeState = eye.update({ now: t, dt, sample: smp, cal: state.eyeCal, cw, ch, targetBox: box, mode: S.mode, spirits: spirits.list.filter(sp => !sp.popped && sp.alpha > 0.3).map(sp => ({ id: sp.id, x: sp.x, y: sp.y, golden: sp.golden })), enabled: true });
        if (eyeState.fired) eyeFire(eyeState.fired, t);
        const p = eyeState.point ?? { x: cw / 2, y: ch / 2 };
        drawEyeReticle(x, { cx: p.x, cy: p.y, fill: eyeState.fill, target: eyeState.target, present: eyeState.present, impact: eyeImpact, reduceMotion: state.settings.reduceMotion, now: t });
        if (eyeImpact && t - eyeImpact.t0 > 1260) eyeImpact = null; } }
    if (recorder.recording && !manualRec && recorder.elapsed > MEDIA.clipMaxMs) {} if (recorder.recording) recorder.frame();
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
  async function finish(grade) {
    if (!S.alive) return; S.alive = false; cancelAnimationFrame(S.raf); // 이중 호출 방지
    const tgt = S.capTarget, fromImage = S.source === still;
    const photo = snapshot(S.source, fromImage ? null : tgt.bbox);
    const usedToken = S.armPrism && state.prismTokens > 0;
    const isVariant = rollVariant(tgt.score, BALANCE.capture.grades[grade].variantMul, usedToken);
    const combo = bumpCombo(grade);
    const result = discover(tgt.label, { confidence: tgt.score, isVariant, grade, usedToken });
    const evDust = eventMod('dust', { chapter: result.wonder.chapter }); if (evDust > 1) { const extra = result.reward.dust * (evDust - 1); state.dust += extra; result.reward.dust += extra; save(); }
    const errand = onDiscoverEvent(tgt.label);
    const questsDone = questEvent({ type: 'discover', isNew: result.isNew, chapter: result.wonder.chapter, rarity: result.wonder.rarity, grade });
    const milestones = claimMilestones();
    const achs = checkAchievements();
    // 클립: 등급 연출이 담기도록 잠깐 더 녹화 후 종료
    let clip = null; if (recorder.recording) { await new Promise(r => setTimeout(r, 350)); clip = await recorder.stop(); if (clip) { state.stats.clips += 1; save(); } }
    stopCamera(video);
    let momentId = null; try { const m = await addMoment({ label: tgt.label, grade, variant: isVariant, frame: state.activeFrame, photoDataUrl: photo, clip, clipType: clip?.type ?? null }); momentId = m.id; } catch {}
    go('reveal', { ...result, photo, questsDone, achs, usedToken, combo, milestones, clip, momentId, errand });
  }
  if (location.search.includes('debug')) window.__scan = { S, capture, spirits, ring: () => capture.tick(performance.now()), injectGaze: (smp) => { gazeInject = smp; }, eye: () => eyeState, calibrate: () => calibrate(), injectDetection: (d) => { S.fixedTarget = d; }, setGauge: (v) => { S.gauge = v; } };
  const onVis = async () => {
    if (!S.alive) return;
    if (document.visibilityState === 'hidden') { if (recorder.recording) { recorder.cancel(); $('#rec')?.classList.add('hidden'); } if (S.mode === 'capture') { capture.stop(); S.mode = 'scan'; S.gauge = 0.5; } return; }
    if (S.source === video && !cameraAlive()) { try { await startCamera(video); setLupe('다시 왔네! 렌즈를 다시 열었어.'); } catch { status.classList.remove('hidden'); } }
    else video.play?.().catch(() => {});
  };
  document.addEventListener('visibilitychange', onVis);
  return () => { S.alive = false; document.removeEventListener('visibilitychange', onVis); cancelAnimationFrame(S.raf); recorder.cancel(); gaze?.close(); stopCamera(video); };
});
