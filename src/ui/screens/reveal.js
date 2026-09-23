import { register, go, app, $, esc, typeInto, lupeHtml, toast, nudgeHtml } from '../shell.js';
import { RARITY } from '../../data/wonders.js';
import { CHAPTERS } from '../../data/chapters.js';
import { BALANCE, streakMultiplier } from '../../game/balance.js';
import { state, rank } from '../../game/state.js';
import { LUPE, say } from '../../game/narrative.js';
import { notesFor } from '../../game/notes.js';
import { renderCard, shareCard } from '../card.js';
import * as fx from '../fx.js';

register('reveal', (res) => {
  const { wonder, label, isNew, isVariant, reward, rankUp, chapterCompleted, allComplete, photo, grade, entry, depthUnlocked, questsDone = [], achs = [], usedToken } = res;
  const R = RARITY[wonder.rarity], G = BALANCE.capture.grades[grade] ?? BALANCE.capture.grades.GOOD, ch = CHAPTERS.find(c => c.id === wonder.chapter);
  const rm = state.settings.reduceMotion;
  document.documentElement.style.setProperty('--r-color', isVariant ? '#ff8ad4' : R.color);
  document.documentElement.style.setProperty('--r-glow', isVariant ? 'rgba(255,138,212,.7)' : R.glow);
  const date = new Date().toLocaleDateString('ko-KR'), sm = streakMultiplier(state.streak.days);
  const notes = notesFor(label, wonder, entry.count);
  app.innerHTML = `
  <section class="screen reveal ${!rm && (wonder.rarity >= 3 || isVariant) ? 'slowmo' : ''}">
    ${!rm && (wonder.rarity === 4 || isVariant) ? '<div class="rays"></div>' : ''}
    <div class="card ${isVariant ? 'variant' : ''} ${entry.count >= BALANCE.depth.note2 ? 'master' : ''}">
      <span class="stamp ${isVariant ? 'var' : isNew ? 'new' : 'dup'}">${isVariant ? '✨ 변이체' : isNew ? 'NEW!' : `×${entry.count}`}</span>
      <img class="photo" src="${photo}" alt="" />
      <div class="rar"><span>${R.stars} ${R.label}${isVariant ? ' · 프리즘' : ''}</span><span><img src="/img/ch/${ch.id}.svg" alt="" style="width:14px;height:14px;vertical-align:-2px"/> ${esc(ch.title)}</span></div>
      <div class="name">${wonder.emoji} ${esc(wonder.name)}</div>
      <div class="orig">원래 이름: ${esc(label)}</div>
      <div class="lore">${esc(wonder.lore)}</div>
      ${depthUnlocked ? `<div class="note">📝 관찰 노트 해금: ${esc(notes[notes.length - 1])}</div>` : ''}
      <div class="foot"><span>신뢰도 ${Math.round(res.confidence * 100)}%</span><span>${date}</span></div>
    </div>
    <div class="rewards">
      <span>${grade !== 'AUTO' ? `<b style="color:${G.color}">${G.label}</b>` : '포획'}</span>
      <span>XP <b>+${reward.xp}</b></span><span>별가루 <b>+${reward.dust}</b></span>
    </div>
    <div class="multi">${[grade === 'PERFECT' ? '퍼펙트 ×1.5 XP · ×2 별가루' : grade === 'GREAT' ? '그레이트 ×1.2 XP · ×1.5 별가루' : '', sm > 1 ? `🔥 연속 출석 ×${sm.toFixed(1)} XP` : '', usedToken ? '✨ 프리즘 토큰 사용' : ''].filter(Boolean).join(' · ')}</div>
    ${lupeHtml('', 'lupe', 'wide')}
    <div id="toasts" style="width:min(340px,100%)"></div>
    ${!allComplete ? nudgeHtml() : ''}
    <div class="actions">
      <button class="btn primary" id="again">📷 계속 스캔</button>
      <button class="btn ghost" id="share">🖼️ 카드 저장</button>
      <button class="btn ghost" id="codex">📖 도감</button>
    </div>
  </section>`;
  fx.flash(); fx.vibrate(isVariant || wonder.rarity === 4 ? [40, 60, 40, 60, 120] : [30, 40, 30]);
  if (isNew || isVariant) { fx.chime(wonder.rarity, isVariant); setTimeout(() => fx.burst(wonder.rarity, isVariant), 350); } else fx.thud();
  if (wonder.rarity >= 3 || isVariant) { setTimeout(() => fx.glitch(), 80); setTimeout(() => fx.shake(), 300); } else if (isNew) setTimeout(() => fx.shake(), 300);
  (async () => {
    const el = $('#lupe'); await typeInto(el, grade === 'PERFECT' ? `완벽한 타이밍이었어! ${say.discover(res)}` : say.discover(res));
    const toasts = $('#toasts'); if (!toasts) return;
    if (rankUp) { toasts.insertAdjacentHTML('beforeend', `<div class="toast">🏅 ${esc(LUPE.rankUp(rankUp.title))}</div>`); fx.chime(3, false); }
    if (chapterCompleted) { toasts.insertAdjacentHTML('beforeend', `<div class="toast">${chapterCompleted.icon} 챕터 완성: ${esc(chapterCompleted.title)} (+${BALANCE.reward.chapterBonusXp} XP)</div><div class="story">${esc(chapterCompleted.story)}</div>`); setTimeout(() => fx.burst(4, false), 300); }
    if (allComplete) toasts.insertAdjacentHTML('beforeend', `<div class="story">${esc(LUPE.allComplete)}</div>`);
    questsDone.forEach((q, i) => setTimeout(() => toast(`📋 의뢰 완료! +${q.reward.xp} XP · +${q.reward.dust} ✨${q.reward.prism ? ' · ✨ 프리즘 토큰' : ''}`, 3500, 'quest'), 300 * i));
    achs.forEach((a, i) => setTimeout(() => toast(`🏅 업적 「${esc(a.title)}」 ${a.icon} ${esc(a.desc)}`, 3500, 'ach'), 600 + 300 * i));
  })();
  $('#again').onclick = () => { fx.blip(); go('scan'); };
  $('#codex').onclick = () => { fx.blip(); go('codex', wonder.chapter); };
  $('#share').onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = '생성 중…';
    try { const c = await renderCard({ label, wonder, photo, isVariant, rankTitle: rank().title, date }); const r = await shareCard(c, wonder.name); e.target.textContent = r === 'downloaded' ? '✅ 저장됨' : r === 'shared' ? '✅ 공유됨' : '🖼️ 카드 저장'; }
    catch { e.target.textContent = '실패… 다시'; }
    e.target.disabled = false;
  };
});
