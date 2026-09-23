import { register, go, app, $, esc, typeInto, lupeHtml, nudgeHtml } from '../shell.js';
import { state, save, rank, ownedCount, totalCount } from '../../game/state.js';
import { questSummary } from '../../game/quests.js';
import { LUPE } from '../../game/narrative.js';
import { streakMultiplier } from '../../game/balance.js';
import { requestGyro } from '../../scanner/gyro.js';
import * as fx from '../fx.js';

register('title', () => {
  const r = rank(), q = questSummary(), sd = state.streak.days;
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
    ${ownedCount() ? nudgeHtml() : ''}
    <div class="actions">
      <button class="btn primary big" id="start">📷 스캔 시작</button>
      <div class="row">
        <button class="btn ghost grow" id="codex">📖 도감 <small>${ownedCount()}/${totalCount()}</small></button>
        <button class="btn ghost grow" id="quests">📋 의뢰</button>
        <button class="btn ghost grow" id="profile">🧭 프로필</button>
      </div>
    </div>
    <div class="stat-strip"><span>Lv.<b>${r.level}</b> ${esc(r.title)}</span><span>별가루 <b>${state.dust}</b></span><span>스캔 <b>${state.scans}</b></span></div>
  </section>`;
  const lines = !state.onboarded ? LUPE.intro : sd >= 2 ? [`${sd}일 연속이야. 오늘도 원더가 기다리고 있어.`, LUPE.intro[1]] : [LUPE.intro[1], '오늘은 어떤 원더를 만날까?'];
  let alive = true;
  (async () => { const el = $('#lupe'); for (const l of lines) { if (!alive) return; await typeInto(el, l); await new Promise(r => setTimeout(r, 1100)); } })();
  $('#start').onclick = async () => { fx.unlockAudio(); fx.blip(); state.onboarded = true; save(); requestGyro(); go('scan'); };
  $('#codex').onclick = () => { fx.blip(); go('codex'); };
  $('#quests').onclick = () => { fx.blip(); go('quests'); };
  $('#profile').onclick = () => { fx.blip(); go('profile'); };
  $('#settings').onclick = () => { fx.blip(); go('profile', true); };
  // 배경 정령 드리프트
  const c = $('.bg-spirits'), x = c.getContext('2d'); let raf = 0; const ps = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.5, s: 0.02 + Math.random() * 0.05, p: Math.random() * 6 }));
  (function loop(t) { if (!alive) return; const W = c.width = c.clientWidth, H = c.height = c.clientHeight; x.clearRect(0, 0, W, H); for (const p of ps) { p.y -= p.s / 60; if (p.y < -0.05) p.y = 1.05; const px = (p.x + Math.sin(t / 1500 + p.p) * 0.02) * W, py = p.y * H; const g = x.createRadialGradient(px, py, 0, px, py, p.r * 5); g.addColorStop(0, 'rgba(143,211,255,.55)'); g.addColorStop(1, 'transparent'); x.fillStyle = g; x.beginPath(); x.arc(px, py, p.r * 5, 0, 7); x.fill(); } raf = requestAnimationFrame(loop); })(0);
  return () => { alive = false; cancelAnimationFrame(raf); };
});
