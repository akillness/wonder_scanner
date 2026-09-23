import './styles.css';
import { WONDERS, RARITY } from './data/wonders.js';
import { CHAPTERS, chapterLabels } from './data/chapters.js';
import { BALANCE, resonanceFillRate, rollVariant } from './game/balance.js';
import { state, save, resetAll, owned, ownedCount, totalCount, rank, chapterProgress, canRescan, discover } from './game/state.js';
import { say, LUPE } from './game/narrative.js';
import { loadDetector, detectTarget } from './scanner/detector.js';
import { hasCamera, startCamera, stopCamera, flipCamera, snapshot } from './scanner/camera.js';
import * as fx from './ui/fx.js';
import { renderCard, shareCard } from './ui/card.js';

const app = document.getElementById('app');
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = app) => root.querySelector(sel);
let modelPromise = null;
const warmModel = () => (modelPromise ??= loadDetector());

// 타이핑 효과
function typeInto(el, text, speed = 22) {
  return new Promise(res => { let i = 0; el.textContent = ''; el.classList.add('cursor');
    const t = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) { clearInterval(t); el.classList.remove('cursor'); res(); } }, speed); });
}
function hudHtml() {
  const r = rank();
  return `<span class="pill">Lv.${r.level} ${esc(r.title)} <span class="xp"><i style="width:${Math.round(r.progress * 100)}%"></i></span></span>
          <span class="pill">📖 ${ownedCount()}/${totalCount()}</span>
          <span class="pill">✨ <b>${state.dust}</b></span>`;
}

/* ═══════════════ TITLE ═══════════════ */
function showTitle() {
  stopScan();
  const r = rank();
  app.innerHTML = `
  <section class="screen title">
    <div class="stars"></div>
    <div class="logo-emoji">🔭</div>
    <h1 class="logo">WONDER SCANNER</h1>
    <p class="tagline">세상은 원더로 가득하다. 당신은 그냥 "컵"이라 부른다.</p>
    <div class="bubble" style="width:min(340px,100%);margin-bottom:18px"><span class="who">LUPE</span><span id="lupe"></span></div>
    <div class="actions">
      <button class="btn primary" id="start">📷 스캔 시작</button>
      <button class="btn ghost" id="codex">📖 원더 도감 (${ownedCount()}/${totalCount()})</button>
    </div>
    <div class="stat-strip"><span>Lv.<b>${r.level}</b> ${esc(r.title)}</span><span>별가루 <b>${state.dust}</b></span><span>스캔 <b>${state.scans}</b></span></div>
    <button class="btn sm ghost" id="sound" style="position:absolute;top:calc(var(--safe-t) + 12px);right:16px">${state.sound ? '🔊' : '🔇'}</button>
  </section>`;
  warmModel();
  const lines = state.onboarded ? [LUPE.intro[1], '오늘은 어떤 원더를 만날까?'] : LUPE.intro;
  (async () => { const el = $('#lupe'); for (const l of lines) { await typeInto(el, l); await new Promise(r => setTimeout(r, 900)); } })();
  $('#start').onclick = () => { fx.unlockAudio(); fx.blip(); state.onboarded = true; save(); showScan(); };
  $('#codex').onclick = () => { fx.blip(); showCodex(); };
  $('#sound').onclick = (e) => { state.sound = !state.sound; save(); e.target.textContent = state.sound ? '🔊' : '🔇'; };
}

/* ═══════════════ SCAN ═══════════════ */
let scan = null; // { running, video, overlay, target, lock, gauge, lastT, busy, raf }
function stopScan() {
  if (!scan) return; scan.running = false; cancelAnimationFrame(scan.raf);
  stopCamera(scan.video); scan = null;
}
async function showScan() {
  stopScan();
  app.innerHTML = `
  <section class="screen scan">
    <video playsinline muted autoplay></video>
    <img class="still hidden" alt="" />
    <canvas class="overlay"></canvas>
    <div class="hud" id="hud">${hudHtml()}</div>
    <div class="status" id="status"><div class="spinner"></div><div id="statusText">렌즈를 여는 중…</div></div>
    <div class="bottom">
      <div class="bubble"><span class="who">LUPE</span><span id="lupe">물건을 화면 가운데에 두고 가만히 있어 봐.</span></div>
      <div class="controls">
        <button class="btn icon ghost" id="back" title="타이틀">🏠</button>
        <button class="btn icon ghost" id="flip" title="카메라 전환">🔄</button>
        <label class="btn icon ghost" title="사진으로 스캔">🖼️<input type="file" accept="image/*" id="file" hidden></label>
        <button class="btn icon ghost" id="codex" title="도감">📖</button>
      </div>
    </div>
  </section>`;
  const video = $('video'), overlay = $('canvas.overlay'), still = $('img.still'), lupe = $('#lupe'), status = $('#status'), statusText = $('#statusText');
  scan = { running: true, video, overlay, target: null, lock: null, gauge: 0, lastT: performance.now(), busy: false, raf: 0, source: video, lastLupe: 0 };
  $('#back').onclick = showTitle; $('#codex').onclick = () => showCodex();
  $('#flip').onclick = async () => { fx.blip(); try { await flipCamera(video); } catch {} };
  $('#file').onchange = (e) => scanImage(e.target.files[0]);

  try {
    statusText.textContent = '온디바이스 AI 모델 로딩 (첫 실행만 몇 초)…';
    await warmModel();
    if (!scan) return;
    if (hasCamera()) {
      statusText.textContent = '카메라 권한을 허용해 주세요';
      await startCamera(video);
    } else throw new Error('no-camera');
    status.classList.add('hidden');
  } catch (e) {
    if (!scan) return;
    status.innerHTML = `<div style="font-size:40px">🖼️</div><div>카메라를 쓸 수 없어요.<br><small style="color:var(--mute)">사진을 골라 스캔할 수 있습니다.</small></div><label class="btn primary">사진 선택<input type="file" accept="image/*" hidden id="file2"></label><button class="btn ghost" id="back2">돌아가기</button>`;
    $('#file2').onchange = (ev) => scanImage(ev.target.files[0]);
    $('#back2').onclick = showTitle;
    return;
  }
  detectLoop(); scan.raf = requestAnimationFrame(drawLoop);

  async function detectLoop() {
    while (scan?.running) {
      if (scan.source === video && video.readyState >= 2) {
        try { scan.target = await detectTarget(video); } catch { scan.target = null; }
      }
      await new Promise(r => setTimeout(r, 40));
    }
  }
  function drawLoop(t) {
    if (!scan?.running) return;
    const dt = Math.min(0.1, (t - scan.lastT) / 1000); scan.lastT = t;
    const tgt = scan.target; let cooldown = null;
    if (tgt) {
      if (scan.lock !== tgt.label) { scan.lock = tgt.label; scan.gauge = Math.min(scan.gauge, 0.15); }
      const cd = canRescan(tgt.label);
      if (cd.ok) { scan.gauge = Math.min(1, scan.gauge + resonanceFillRate(tgt.score) * dt); fx.tick(scan.gauge); if (t - scan.lastLupe > 3000) { lupe.textContent = say.scanning(); scan.lastLupe = t; } }
      else { cooldown = cd.remainMs; scan.gauge = Math.max(0, scan.gauge - 2 * dt); if (t - scan.lastLupe > 3000) { lupe.textContent = say.cooldown(); scan.lastLupe = t; } }
    } else {
      scan.gauge = Math.max(0, scan.gauge - BALANCE.resonance.decayPerSec * dt);
      if (scan.gauge === 0) scan.lock = null;
    }
    drawOverlay(overlay, video, tgt, scan.gauge, cooldown);
    if (scan.gauge >= 1 && tgt) { finish(tgt, video); return; }
    scan.raf = requestAnimationFrame(drawLoop);
  }
  async function scanImage(file) {
    if (!file || !scan) return;
    fx.unlockAudio();
    const url = URL.createObjectURL(file);
    still.src = url; await new Promise(r => { still.onload = r; });
    still.classList.remove('hidden'); video.classList.add('hidden'); status.classList.add('hidden');
    scan.source = still; scan.target = null;
    lupe.textContent = '사진 속을 들여다보는 중…';
    const tgt = await detectTarget(still);
    if (!tgt) { lupe.textContent = '여기엔 원더가 안 보여. 다른 사진은?'; fx.denied(); setTimeout(() => { still.classList.add('hidden'); video.classList.remove('hidden'); scan.source = video; }, 1500); return; }
    const cd = canRescan(tgt.label);
    if (!cd.ok) { lupe.textContent = `${say.cooldown()} (${Math.ceil(cd.remainMs / 1000)}초)`; fx.denied(); setTimeout(() => { still.classList.add('hidden'); video.classList.remove('hidden'); scan.source = video; }, 1500); return; }
    // 사진은 공명을 1.4초 동안 연출로 채운다
    const t0 = performance.now();
    await new Promise(res => { (function anim(t) { const p = Math.min(1, (t - t0) / 1400); fx.tick(p); drawOverlay(overlay, still, tgt, p, null, true); if (p < 1 && scan) requestAnimationFrame(anim); else res(); })(t0); });
    finish(tgt, still, true);
  }
  function finish(tgt, source, fromImage = false) {
    if (!scan) return;
    const photo = snapshot(source, fromImage ? null : tgt.bbox);
    const isVariant = rollVariant(tgt.score);
    const result = discover(tgt.label, { confidence: tgt.score, isVariant });
    stopScan();
    showReveal({ ...result, photo });
  }
}

// 오버레이: 브래킷 + 공명 링 + 라벨(???)
function drawOverlay(canvas, source, tgt, gauge, cooldownMs, isImage = false) {
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  const x = canvas.getContext('2d'); x.clearRect(0, 0, cw, ch);
  // 뷰파인더
  x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 1; const m = Math.min(cw, ch) * 0.12;
  x.beginPath(); x.moveTo(m, m + 30); x.lineTo(m, m); x.lineTo(m + 30, m); x.moveTo(cw - m - 30, m); x.lineTo(cw - m, m); x.lineTo(cw - m, m + 30);
  x.moveTo(m, ch - m - 30); x.lineTo(m, ch - m); x.lineTo(m + 30, ch - m); x.moveTo(cw - m - 30, ch - m); x.lineTo(cw - m, ch - m); x.lineTo(cw - m, ch - m - 30); x.stroke();
  // 스캔 라인
  const ly = (performance.now() / 12) % ch; const g = x.createLinearGradient(0, ly - 40, 0, ly + 40); g.addColorStop(0, 'transparent'); g.addColorStop(.5, 'rgba(110,231,255,.18)'); g.addColorStop(1, 'transparent');
  x.fillStyle = g; x.fillRect(0, ly - 40, cw, 80);
  if (!tgt) return;
  // object-fit: cover 좌표 변환
  const sw = source.videoWidth || source.naturalWidth || source.width, sh = source.videoHeight || source.naturalHeight || source.height;
  const s = Math.max(cw / sw, ch / sh), ox = (cw - sw * s) / 2, oy = (ch - sh * s) / 2;
  const [bx, by, bw, bh] = tgt.bbox; const X = bx * s + ox, Y = by * s + oy, W = bw * s, H = bh * s;
  const rar = RARITY[WONDERS[tgt.label].rarity]; const col = cooldownMs != null ? '#8b95ad' : rar.color;
  // 브래킷
  x.strokeStyle = col; x.lineWidth = 3; x.shadowColor = col; x.shadowBlur = 12; const L = Math.min(W, H) * 0.25;
  x.beginPath(); x.moveTo(X, Y + L); x.lineTo(X, Y); x.lineTo(X + L, Y); x.moveTo(X + W - L, Y); x.lineTo(X + W, Y); x.lineTo(X + W, Y + L);
  x.moveTo(X, Y + H - L); x.lineTo(X, Y + H); x.lineTo(X + L, Y + H); x.moveTo(X + W - L, Y + H); x.lineTo(X + W, Y + H); x.lineTo(X + W, Y + H - L); x.stroke();
  x.shadowBlur = 0;
  // 공명 링
  const cx = X + W / 2, cy = Y + H / 2, r = Math.max(28, Math.min(W, H) * 0.32);
  x.lineWidth = 6; x.strokeStyle = 'rgba(255,255,255,.15)'; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = col; x.shadowColor = col; x.shadowBlur = 16 + gauge * 24; x.beginPath(); x.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * gauge); x.stroke(); x.shadowBlur = 0;
  // 라벨
  x.font = '700 14px system-ui'; x.textAlign = 'center'; x.fillStyle = '#fff';
  const label = cooldownMs != null ? `쿨다운 ${Math.ceil(cooldownMs / 1000)}s` : owned(tgt.label) ? `${WONDERS[tgt.label].name}` : `??? ${rar.stars}`;
  const tw = x.measureText(label).width + 20; x.fillStyle = 'rgba(11,15,26,.8)'; x.fillRect(cx - tw / 2, Y - 30, tw, 24); x.fillStyle = col; x.fillText(label, cx, Y - 13);
  x.fillStyle = '#fff'; x.font = '600 12px system-ui'; x.fillText(`공명 ${Math.round(gauge * 100)}%  ·  신뢰도 ${Math.round(tgt.score * 100)}%`, cx, cy + r + 20);
}

/* ═══════════════ REVEAL ═══════════════ */
function showReveal(res) {
  const { wonder, label, isNew, isVariant, reward, rankUp, chapterCompleted, allComplete, photo } = res;
  const R = RARITY[wonder.rarity];
  document.documentElement.style.setProperty('--r-color', isVariant ? '#ff8ad4' : R.color);
  document.documentElement.style.setProperty('--r-glow', isVariant ? 'rgba(255,138,212,.7)' : R.glow);
  const date = new Date().toLocaleDateString('ko-KR');
  app.innerHTML = `
  <section class="screen reveal ${wonder.rarity >= 3 || isVariant ? 'slowmo' : ''}">
    ${wonder.rarity === 4 || isVariant ? '<div class="rays"></div>' : ''}
    <div class="card ${isVariant ? 'variant' : ''}">
      <span class="stamp ${isVariant ? 'var' : isNew ? 'new' : 'dup'}">${isVariant ? '✨ 변이체' : isNew ? 'NEW!' : `×${state.codex[label].count}`}</span>
      <img class="photo" src="${photo}" alt="" />
      <div class="rar"><span>${R.stars} ${R.label}${isVariant ? ' · 프리즘' : ''}</span><span>${esc(CHAPTERS.find(c => c.id === wonder.chapter).icon)} ${esc(CHAPTERS.find(c => c.id === wonder.chapter).title)}</span></div>
      <div class="name">${wonder.emoji} ${esc(wonder.name)}</div>
      <div class="orig">원래 이름: ${esc(label)}</div>
      <div class="lore">${esc(wonder.lore)}</div>
      <div class="foot"><span>신뢰도 ${Math.round(res.confidence * 100)}%</span><span>${date}</span></div>
    </div>
    <div class="rewards"><span>XP <b>+${reward.xp}</b></span><span>별가루 <b>+${reward.dust}</b></span></div>
    <div class="bubble" style="width:min(340px,100%)"><span class="who">LUPE</span><span id="lupe"></span></div>
    <div id="toasts" style="width:min(340px,100%)"></div>
    <div class="actions">
      <button class="btn primary" id="again">📷 계속 스캔</button>
      <button class="btn ghost" id="share">🖼️ 카드 저장</button>
      <button class="btn ghost" id="codex">📖 도감</button>
    </div>
  </section>`;
  // 연출 시퀀스
  fx.flash(); fx.vibrate(isVariant || wonder.rarity === 4 ? [40, 60, 40, 60, 120] : [30, 40, 30]);
  if (isNew || isVariant) { fx.chime(wonder.rarity, isVariant); setTimeout(() => fx.burst(wonder.rarity, isVariant), 350); } else fx.thud();
  if (wonder.rarity >= 3 || isVariant) { setTimeout(() => fx.glitch(), 80); setTimeout(() => fx.shake(), 300); }
  else if (isNew) setTimeout(() => fx.shake(), 300);
  // 대사 + 토스트
  (async () => {
    const el = $('#lupe'); await typeInto(el, say.discover(res));
    const toasts = $('#toasts');
    if (rankUp) { toasts.insertAdjacentHTML('beforeend', `<div class="toast">🏅 ${esc(LUPE.rankUp(rankUp.title))}</div>`); fx.chime(3, false); }
    if (chapterCompleted) { toasts.insertAdjacentHTML('beforeend', `<div class="toast">${chapterCompleted.icon} 챕터 완성: ${esc(chapterCompleted.title)} (+${BALANCE.reward.chapterBonusXp} XP)</div><div class="story">${esc(chapterCompleted.story)}</div>`); setTimeout(() => fx.burst(4, false), 300); }
    if (allComplete) { toasts.insertAdjacentHTML('beforeend', `<div class="story">${esc(LUPE.allComplete)}</div>`); }
  })();
  $('#again').onclick = () => { fx.blip(); showScan(); };
  $('#codex').onclick = () => { fx.blip(); showCodex(wonder.chapter); };
  $('#share').onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = '생성 중…';
    try { const c = await renderCard({ label, wonder, photo, isVariant, rankTitle: rank().title, date }); const r = await shareCard(c, wonder.name); e.target.textContent = r === 'downloaded' ? '✅ 저장됨' : r === 'shared' ? '✅ 공유됨' : '🖼️ 카드 저장'; }
    catch { e.target.textContent = '실패… 다시'; }
    e.target.disabled = false;
  };
}

/* ═══════════════ CODEX ═══════════════ */
function showCodex(chapterId = CHAPTERS[0].id) {
  stopScan();
  const total = totalCount(), have = ownedCount();
  const render = () => {
    const ch = CHAPTERS.find(c => c.id === chapterId); const cp = chapterProgress(chapterId);
    app.innerHTML = `
    <section class="screen codex">
      <header><button class="btn icon ghost" id="back">←</button><h2>📖 원더 도감</h2><span class="pill">${have}/${total}</span></header>
      <div class="progress"><i style="width:${(have / total) * 100}%"></i></div>
      <div class="tabs">${CHAPTERS.map(c => { const p = chapterProgress(c.id); return `<button class="tab ${c.id === chapterId ? 'on' : ''} ${p.done ? 'done' : ''}" data-id="${c.id}">${c.icon} ${esc(c.title)} ${p.have}/${p.total}</button>`; }).join('')}</div>
      <div class="chapter-head"><span>${cp.done ? '✅ 완성' : `💡 ${esc(ch.hint)}`}</span><span>${cp.have}/${cp.total}</span></div>
      ${cp.done ? `<div class="story">${esc(ch.story)}</div>` : ''}
      <div class="grid">${chapterLabels(chapterId).sort((a, b) => WONDERS[a].rarity - WONDERS[b].rarity).map(l => {
        const w = WONDERS[l], e = state.codex[l], R = RARITY[w.rarity];
        return `<button class="slot ${e ? 'owned' : 'locked'} ${e?.variant ? 'variant' : ''}" data-l="${esc(l)}" style="--sc:${R.color};--sg:${R.glow}"><span class="e">${w.emoji}</span><span>${e ? esc(w.name) : R.stars}</span>${e ? `<span class="cnt">×${e.count}</span>` : ''}</button>`; }).join('')}</div>
      <div class="foot"><button class="btn primary" id="scan">📷 스캔하러 가기</button><button class="btn ghost sm" id="reset">초기화</button></div>
    </section>`;
    $('#back').onclick = showTitle; $('#scan').onclick = () => { fx.unlockAudio(); showScan(); };
    app.querySelectorAll('.tab').forEach(b => b.onclick = () => { chapterId = b.dataset.id; fx.blip(); render(); });
    app.querySelectorAll('.slot').forEach(b => b.onclick = () => detail(b.dataset.l));
    $('#reset').onclick = () => { if (confirm('도감·랭크·별가루를 모두 지웁니다. 정말요?')) { resetAll(); showTitle(); } };
  };
  const detail = (l) => {
    const w = WONDERS[l], e = state.codex[l], R = RARITY[w.rarity];
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = e
      ? `<div class="card ${e.variant ? 'variant' : ''}" style="--r-color:${R.color};--r-glow:${R.glow};animation:pop .4s both"><div class="rar"><span>${R.stars} ${R.label}${e.variant ? ' · ✨프리즘' : ''}</span><span>×${e.count}</span></div><div style="font-size:72px;text-align:center;margin:10px 0">${w.emoji}</div><div class="name">${esc(w.name)}</div><div class="orig">원래 이름: ${esc(l)}</div><div class="lore">${esc(w.lore)}</div><div class="foot"><span>첫 발견 ${new Date(e.firstAt).toLocaleDateString('ko-KR')}</span><span>최고 신뢰도 ${Math.round(e.bestConf * 100)}%</span></div></div>`
      : `<div class="card" style="--r-color:${R.color};--r-glow:${R.glow};animation:pop .4s both;align-items:center;justify-content:center;text-align:center"><div style="font-size:72px;filter:grayscale(1) brightness(.4)">${w.emoji}</div><div class="name">???</div><div class="orig">${R.stars} ${R.label} 원더</div><div class="lore">힌트: "${esc(l)}"을(를) 카메라에 비춰 보세요.</div></div>`;
    m.onclick = () => m.remove(); app.appendChild(m); fx.blip();
  };
  render();
}

/* ═══════════════ BOOT ═══════════════ */
showTitle();
