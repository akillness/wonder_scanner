import { register, go, app, $, $$, esc, tabsHtml, bindTabs, toast } from '../shell.js';
import { state, save, rank, resetAll, ownedCount, totalCount } from '../../game/state.js';
import { ensureDailyQuests, questText } from '../../game/quests.js';
import { ACHIEVEMENTS } from '../../game/achievements.js';
import { BALANCE, streakMultiplier } from '../../game/balance.js';
import * as fx from '../fx.js';

function untilMidnight() { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); const s = Math.floor((m - n) / 1000); return `${Math.floor(s / 3600)}시간 ${Math.floor(s % 3600 / 60)}분`; }

register('quests', () => {
  const items = ensureDailyQuests(), sd = state.streak.days;
  app.innerHTML = `
  <section class="screen meta">
    <header><button class="btn icon ghost" id="back">←</button><h2>📋 오늘의 의뢰</h2><span class="pill">⏳ ${untilMidnight()}</span></header>
    <div class="streak-card"><div class="fire">🔥</div><div><b>${sd}일 연속 출석</b><small>XP 배율 ×${streakMultiplier(sd).toFixed(1)} · 내일 접속하면 ×${streakMultiplier(sd + 1).toFixed(1)}</small></div><div class="days">${Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.min(sd, 5) ? 'on' : ''}"></i>`).join('')}</div></div>
    <div class="quest-list">${items.map((q, i) => `<div class="quest ${q.done ? 'done' : ''}">
      <div class="qi">${q.done ? '✅' : ['①', '②', '③'][i]}</div>
      <div class="grow"><b>${esc(questText(q))}</b><div class="progress sm"><i style="width:${q.progress / q.goal * 100}%"></i></div><small>${q.progress}/${q.goal}</small></div>
      <div class="qr">+${q.reward.xp} XP<br>+${q.reward.dust} ✨${q.reward.prism ? '<br><span class="prism">✨ 프리즘 토큰</span>' : ''}</div>
    </div>`).join('')}</div>
    <div class="info-card"><b>✨ 프리즘 토큰 ${state.prismTokens}개</b><small>스캔 화면에서 토큰을 장착하면 다음 포획이 <b>변이체 확정</b>. 3번째 의뢰 보상과 황금 정령에게서 얻습니다.</small></div>
    <div class="info-card"><b>◇ 정령 조각 ${state.fragments}/${BALANCE.spirits.fragmentsPerBoost} · ⚡ 공명 부스트 ${state.boost}</b><small>카메라 화면에 떠다니는 정령을 탭하면 조각을 얻고, ${BALANCE.spirits.fragmentsPerBoost}개마다 다음 공명이 2배 빨라집니다.</small></div>
    ${tabsHtml('quests')}
  </section>`;
  $('#back').onclick = () => go('title'); bindTabs();
});

register('profile', (openSettings = false) => {
  const r = rank(), s = state.stats;
  app.innerHTML = `
  <section class="screen meta">
    <header><button class="btn icon ghost" id="back">←</button><h2>🧭 탐험가 프로필</h2><span class="pill">Lv.${r.level}</span></header>
    <div class="rank-card"><div class="rk">${r.level}</div><div class="grow"><b>${esc(r.title)}</b><div class="progress sm"><i style="width:${r.progress * 100}%"></i></div><small>${state.xp} XP${r.next ? ` · 다음 「${esc(r.next.title)}」까지 ${r.next.xp - state.xp}` : ' · 최고 랭크'}</small></div></div>
    <div class="stats"><div><b>${ownedCount()}</b><small>/${totalCount()} 수집</small></div><div><b>${state.scans}</b><small>스캔</small></div><div><b>${s.perfects}</b><small>🎯 퍼펙트</small></div><div><b>${s.variants}</b><small>✨ 변이체</small></div><div><b>${s.spirits}</b><small>🫧 정령</small></div><div><b>${state.completedChapters.length}</b><small>/6 챕터</small></div><div><b>${state.streak.days}</b><small>🔥 연속일</small></div><div><b>${state.dust}</b><small>✨ 별가루</small></div></div>
    <div class="row" style="margin:10px 0"><button class="btn ghost sm grow" id="shop">🏪 별가루 상점 · 보물상자</button><button class="btn ghost sm grow" id="album">📸 앨범 · 🎁 선물</button><button class="btn ghost sm grow" id="plaza">🌐 광장</button></div>
    <div class="stats" style="grid-template-columns:repeat(3,1fr)"><div><b>${s.bestCombo || 0}</b><small>🔥 최고 콤보</small></div><div><b>${s.giftsSent || 0}</b><small>🎁 보낸 선물</small></div><div><b>${s.giftsGot || 0}</b><small>🎁 받은 선물</small></div></div>
    <h3>🏅 업적 <small>${state.achievements.length}/${ACHIEVEMENTS.length}</small></h3>
    <div class="ach-grid">${ACHIEVEMENTS.map(a => { const on = state.achievements.includes(a.id); return `<div class="ach ${on ? 'on' : ''}" title="${esc(a.desc)}"><span>${a.icon}</span><b>${esc(a.title)}</b><small>${esc(a.desc)}</small></div>`; }).join('')}</div>
    <h3 id="settings">⚙️ 설정</h3>
    <div class="settings">
      ${[['sound', '🔊 효과음', '공명 틱, 발견 차임'], ['haptics', '📳 햅틱', '포획·발견 시 진동'], ['reduceMotion', '🌙 모션 줄이기', '흔들림·글리치·플래시·후광을 끄고 안정된 표시로 대체'], ['autoCapture', '🎯 자동 포획', '타이밍 링을 건너뛰고 공명이 차면 바로 포획 (등급 보너스 없음)'], ['recordClips', '🎬 포획 클립 녹화', '공명 60%부터 발견까지 사운드 포함 짧은 영상을 앨범에 저장 (540p, 5초 ≈ 700KB)']].map(([k, t, d]) => `<label class="setting"><div><b>${t}</b><small>${d}</small></div><input type="checkbox" data-k="${k}" ${state.settings[k] ? 'checked' : ''}><i class="sw"></i></label>`).join('')}
      <label class="setting"><div><b>🪪 탐험가 이름</b><small>카드·콜라주·선물 코드에 표시</small></div><input type="text" id="name" maxlength="12" value="${esc(state.name || '')}" placeholder="탐험가" style="width:110px;background:var(--bg);border:1px solid var(--line);color:var(--ink);border-radius:8px;padding:6px 8px"/></label>
      <button class="btn ghost sm" id="reset" style="margin-top:8px">도감·기록 초기화</button>
    </div>
    ${tabsHtml('profile')}
  </section>`;
  $('#back').onclick = () => go('title'); bindTabs();
  $$('input[data-k]').forEach(i => i.onchange = () => { state.settings[i.dataset.k] = i.checked; save(); fx.blip(); });
  $('#reset').onclick = () => { if (confirm('도감·랭크·별가루·업적을 모두 지웁니다. 정말요?')) { resetAll(); go('title'); } };
  $('#shop').onclick = () => { fx.blip(); go('shop'); }; $('#album').onclick = () => { fx.blip(); go('album'); }; $('#plaza').onclick = () => { fx.blip(); go('collectors'); };
  $('#name').onchange = (e) => { state.name = e.target.value.trim(); save(); fx.blip(); };
  if (openSettings) setTimeout(() => $('#settings')?.scrollIntoView({ behavior: 'smooth' }), 50);
});
