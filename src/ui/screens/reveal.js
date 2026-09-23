import { register, go, app, $, esc, typeInto, lupeHtml, toast, nudgeHtml } from '../shell.js';
import { RARITY } from '../../data/wonders.js';
import { CHAPTERS } from '../../data/chapters.js';
import { BALANCE, streakMultiplier } from '../../game/balance.js';
import { state, rank } from '../../game/state.js';
import { LUPE, say } from '../../game/narrative.js';
import { notesFor } from '../../game/notes.js';
import { renderCard, shareCard, shareBlob } from '../card.js';
import * as fx from '../fx.js';
import { mountScratch } from '../scratch.js';
import { markShared } from '../../game/memories.js';
import { cloud, cloudEnabled } from '../../cloud/provider.js';

register('reveal', (res) => {
  const { wonder, label, isNew, isVariant, reward, rankUp, chapterCompleted, allComplete, photo, grade, entry, depthUnlocked, questsDone = [], achs = [], usedToken, combo = 0, milestones = [], clip = null } = res;
  const suspense = !state.settings.reduceMotion && (wonder.rarity >= 3 || isVariant);
  const clipUrl = clip ? URL.createObjectURL(clip) : null;
  const R = RARITY[wonder.rarity], G = BALANCE.capture.grades[grade] ?? BALANCE.capture.grades.GOOD, ch = CHAPTERS.find(c => c.id === wonder.chapter);
  const rm = state.settings.reduceMotion;
  document.documentElement.style.setProperty('--r-color', isVariant ? '#ff8ad4' : R.color);
  document.documentElement.style.setProperty('--r-glow', isVariant ? 'rgba(255,138,212,.7)' : R.glow);
  const date = new Date().toLocaleDateString('ko-KR'), sm = streakMultiplier(state.streak.days);
  const notes = notesFor(label, wonder, entry.count);
  app.innerHTML = `
  <section class="screen reveal ${!rm && (wonder.rarity >= 3 || isVariant) ? 'slowmo' : ''}">
    ${!rm && (wonder.rarity === 4 || isVariant) ? '<div class="rays"></div>' : ''}
    ${suspense ? `<div class="suspense" id="sus"><div class="orb" style="--c:${isVariant ? '#ff8ad4' : R.color}"></div><div class="q">?</div><small>${isVariant ? '색이… 다르다?' : '강한 공명이 느껴진다…'}</small></div>` : ''}
    ${combo >= 2 ? `<div class="combo">🔥 ${combo} COMBO</div>` : ''}
    <div class="card frame-${state.activeFrame} ${isVariant ? 'variant' : ''} ${entry.count >= BALANCE.depth.note2 ? 'master' : ''} ${suspense ? 'hidden' : ''}">
      <span class="stamp ${isVariant ? 'var' : isNew ? 'new' : 'dup'}">${isVariant ? '✨ 변이체' : isNew ? 'NEW!' : `×${entry.count}`}</span>
      ${clipUrl ? `<video class="photo" src="${clipUrl}" playsinline loop muted autoplay poster="${photo}"></video>` : `<img class="photo" src="${photo}" alt="" />`}
      <div class="rar"><span>${R.stars} ${R.label}${isVariant ? ' · 프리즘' : ''}</span><span><img src="/img/ch/${ch.id}.svg" alt="" style="width:14px;height:14px;vertical-align:-2px"/> ${esc(ch.title)}</span></div>
      <div class="scratch-zone" id="sz"><div class="name">${wonder.emoji} ${esc(wonder.name)}</div>
      <div class="orig">원래 이름: ${esc(label)}</div></div>
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
      <button class="btn ghost" id="share">🖼️ 카드 저장</button>${clipUrl ? '<button class="btn ghost" id="clip">🎬 클립 공유</button>' : ''}
      <button class="btn ghost" id="codex">📖 도감</button>
    </div>
  </section>`;
  const revealFx = () => { fx.flash(); fx.vibrate(isVariant || wonder.rarity === 4 ? [40, 60, 40, 60, 120] : [30, 40, 30]);
    if (isNew || isVariant) { fx.chime(wonder.rarity, isVariant); setTimeout(() => fx.burst(wonder.rarity, isVariant), 350); } else fx.thud();
    if (wonder.rarity >= 3 || isVariant) { setTimeout(() => fx.glitch(), 80); setTimeout(() => fx.shake(), 300); } else if (isNew) setTimeout(() => fx.shake(), 300);
    if (combo >= 2) fx.comboTone(combo); };
  // 스크래치: 세계관 이름 + 실제 인식 라벨을 긁어서 확인 (첫 발견만; 재발견은 바로 공개)
  const scratchable = isNew && !state.settings.autoCapture;
  const mount = () => { if (!scratchable) return; const z = $('#sz'); if (!z) return; mountScratch(z, { label: '긁어서 정체 확인', tapOnly: state.settings.reduceMotion, onReveal: () => { fx.chime(1, false); fx.vibrate([20, 30, 20]); const el = $('#lupe'); if (el && !el.textContent) typeInto(el, say.discover(res)); } }); };
  if (suspense) { fx.drumroll(1300); fx.vibrate([20, 80, 20, 80, 20]); setTimeout(() => { $('#sus')?.remove(); $('.card')?.classList.remove('hidden'); revealFx(); requestAnimationFrame(mount); }, 1400); } else { revealFx(); requestAnimationFrame(mount); }
  if (cloudEnabled && res.momentId) (async () => { try { if (await cloud.user()) { const { getMoment, updateMoment } = await import('../../game/media.js'); const m = await getMoment(res.momentId); const r = await cloud.syncMoment(m); if (r) { m.cloud = r; await updateMoment(m); } } } catch {} })();
  if (milestones.length) setTimeout(() => chest(milestones[0]), suspense ? 3200 : 1800);
  function chest(m) { const el = document.createElement('div'); el.className = 'modal chest-modal'; el.innerHTML = `<div class="chest"><div class="box">🎁</div><h3>보물상자 「${esc(m.title)}」</h3><small>${m.at}종 수집 달성</small><div class="loot"><span>✨ ${m.reward.dust}</span>${m.reward.prism ? `<span>프리즘 ×${m.reward.prism}</span>` : ''}<span>+${m.reward.xp} XP</span></div><button class="btn primary" id="chestOk">받기!</button></div>`; app.appendChild(el); fx.chest(); setTimeout(() => { el.querySelector('.box')?.classList.add('open'); fx.burst(4, false); }, 500); $('#chestOk', el).onclick = () => { el.remove(); fx.blip(); }; }
  (async () => {
    const el = $('#lupe'); await typeInto(el, grade === 'PERFECT' ? `완벽한 타이밍이었어! ${say.discover(res)}` : say.discover(res));
    const toasts = $('#toasts'); if (!toasts) return;
    if (rankUp) { toasts.insertAdjacentHTML('beforeend', `<div class="toast">🏅 ${esc(LUPE.rankUp(rankUp.title))}</div>`); fx.chime(3, false); }
    if (chapterCompleted) { toasts.insertAdjacentHTML('beforeend', `<div class="toast">${chapterCompleted.icon} 챕터 완성: ${esc(chapterCompleted.title)} (+${BALANCE.reward.chapterBonusXp} XP)</div><div class="story">${esc(chapterCompleted.story)}</div>`); setTimeout(() => fx.burst(4, false), 300); }
    if (allComplete) toasts.insertAdjacentHTML('beforeend', `<div class="story">${esc(LUPE.allComplete)}</div>`);
    if (res.errand) toast(`⚡ ${esc(res.errand.title)} — ${esc(res.errand.text)}`, 4000, 'ach');
    questsDone.forEach((q, i) => setTimeout(() => toast(`📋 의뢰 완료! +${q.reward.xp} XP · +${q.reward.dust} ✨${q.reward.prism ? ' · ✨ 프리즘 토큰' : ''}`, 3500, 'quest'), 300 * i));
    achs.forEach((a, i) => setTimeout(() => toast(`🏅 업적 「${esc(a.title)}」 ${a.icon} ${esc(a.desc)}`, 3500, 'ach'), 600 + 300 * i));
  })();
  $('#again').onclick = () => { fx.blip(); go('scan'); };
  if (clipUrl) $('#clip').onclick = async (e) => { e.target.disabled = true; e.target.textContent = '…'; const r = await shareBlob(clip, `wonder-clip-${Date.now()}.${clip.type.includes('mp4') ? 'mp4' : 'webm'}`, `${wonder.name} 포획 클립`); e.target.textContent = r === 'downloaded' ? '✅ 저장됨' : r === 'shared' ? '✅ 공유됨' : '🎬 클립 공유'; e.target.disabled = false; };
  $('#codex').onclick = () => { fx.blip(); go('codex', wonder.chapter); };
  const cleanup = () => { if (clipUrl) URL.revokeObjectURL(clipUrl); };
  $('#share').onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = '생성 중…';
    try { const c = await renderCard({ label, wonder, photo, isVariant, rankTitle: rank().title, date }); const r = await shareCard(c, wonder.name); e.target.textContent = r === 'downloaded' ? '✅ 저장됨' : r === 'shared' ? '✅ 공유됨' : '🖼️ 카드 저장'; if (r !== 'cancel' && res.momentId) markShared(res.momentId); }
    catch { e.target.textContent = '실패… 다시'; }
    e.target.disabled = false;
  };
  return cleanup;
});
