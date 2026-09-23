import { register, go, app, $, $$, esc, typeInto, lupeHtml, goalsHtml } from '../shell.js';
import { goals } from '../../game/economy.js';
import { recallCandidate, daysAgo, STAGES } from '../../game/memories.js';
import { advise, activeEvent, markEventSeen } from '../../game/companion.js';
import { listMoments } from '../../game/media.js';
import { WONDERS } from '../../data/wonders.js';
import { state, save, rank, ownedCount, totalCount } from '../../game/state.js';
import { questSummary } from '../../game/quests.js';
import { LUPE } from '../../game/narrative.js';
import { streakMultiplier } from '../../game/balance.js';
import { requestGyro } from '../../scanner/gyro.js';
import * as fx from '../fx.js';

register('title', () => {
  const r = rank(), q = questSummary(), sd = state.streak.days, ev = activeEvent();
  app.innerHTML = `
  <section class="screen title">
    <canvas class="bg-spirits"></canvas>
    <button class="btn icon ghost gear" id="settings" title="설정">⚙️</button>
    <img class="logo-img" src="/img/logo.svg" alt="" />
    <h1 class="logo">WONDER SCANNER</h1>
    <p class="tagline">세상은 원더로 가득하다. 당신은 그냥 "컵"이라 부른다.</p>
    ${lupeHtml('', 'lupe', 'wide')}
    <div class="chips">
      <span class="pill ${sd >= 2 ? 'fire' : ''}">🔥 ${sd}일 연속 ${sd >= 2 ? `· XP ×${streakMultiplier(sd).toFixed(1)}` : ''}</span>
      <span class="pill ${q.done === q.total ? 'gold' : ''}">📋 오늘의 의뢰 ${q.done}/${q.total}</span>
      ${state.prismTokens ? `<span class="pill prism">✨ 프리즘 토큰 ${state.prismTokens}</span>` : ''}
    </div>
    <div id="recall"></div>
    ${ev && !ev.done ? `<div class="event-card"><span>⚡</span><div><b>오늘의 사건 · ${esc(ev.title)}</b><small>${esc(ev.desc)}</small></div></div>` : ''}
    ${ownedCount() ? goalsHtml(goals()) : ''}
    <div class="actions">
      <button class="btn primary big" id="start">📷 스캔 시작</button>
      <div class="row">
        <button class="btn ghost grow" data-go="codex">📖 도감 <small>${ownedCount()}/${totalCount()}</small></button>
        <button class="btn ghost grow" data-go="album">📸 앨범</button>
        <button class="btn ghost grow" data-go="quests">📋 의뢰</button>
        <button class="btn ghost grow" data-go="shop">🏪 상점</button>
      </div>
    </div>
    <div class="stat-strip"><span>Lv.<b>${r.level}</b> ${esc(r.title)}</span><span>별가루 <b>${state.dust}</b></span><span>스캔 <b>${state.scans}</b></span></div>
  </section>`;
  const lines = !state.onboarded ? LUPE.intro : [ev && !ev.done ? `⚡ 오늘의 사건: ${ev.title} — ${ev.desc}` : null, (() => { const t = advise({ screen: 'title' }); return `${t.icon} ${t.text}`; })()].filter(Boolean);
  if (ev) markEventSeen();
  let alive = true;
  (async () => { const el = $('#lupe'); for (const l of lines) { if (!alive) return; await typeInto(el, l); await new Promise(r => setTimeout(r, 1100)); } })();
  $('#start').onclick = async () => { fx.unlockAudio(); fx.blip(); state.onboarded = true; save(); requestGyro(); go('scan'); };
  $$('[data-go]').forEach(b => b.onclick = () => { fx.blip(); go(b.dataset.go); });
  $('#settings').onclick = () => { fx.blip(); go('profile', true); };
  recallCandidate().then(m => { if (!m || !alive) return; const w = WONDERS[m.label], u = URL.createObjectURL(m.thumb || m.photo); const el = $('#recall'); if (!el) return; el.innerHTML = `<button class="recall"><img src="${u}" alt=""/><div><small>📸 ${daysAgo(m.ts)}의 추억 · ${STAGES[m.stage || 0].icon} ${STAGES[m.stage || 0].name}</small><b>${w.emoji} ${esc(w.name)}</b><small>회상하면 추억이 자라고 별가루 +10</small></div><span>회상 →</span></button>`; el.querySelector('.recall').onclick = () => { fx.blip(); go('album', 'all', m.id); }; });
  // 배경 정령 드리프트
  const c = $('.bg-spirits'), x = c.getContext('2d'); let raf = 0; const ps = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.5, s: 0.02 + Math.random() * 0.05, p: Math.random() * 6 }));
  (function loop(t) { if (!alive) return; const W = c.width = c.clientWidth, H = c.height = c.clientHeight; x.clearRect(0, 0, W, H); for (const p of ps) { p.y -= p.s / 60; if (p.y < -0.05) p.y = 1.05; const px = (p.x + Math.sin(t / 1500 + p.p) * 0.02) * W, py = p.y * H; const g = x.createRadialGradient(px, py, 0, px, py, p.r * 5); g.addColorStop(0, 'rgba(143,211,255,.55)'); g.addColorStop(1, 'transparent'); x.fillStyle = g; x.beginPath(); x.arc(px, py, p.r * 5, 0, 7); x.fill(); } raf = requestAnimationFrame(loop); })(0);
  return () => { alive = false; cancelAnimationFrame(raf); };
});
