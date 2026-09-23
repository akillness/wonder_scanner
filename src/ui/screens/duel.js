import { register, go, app, $, esc, icon, momentName, momentMark } from '../shell.js';
import { WONDERS, RARITY } from '../../data/wonders.js';
import { state, save, todayKey } from '../../game/state.js';
import { getMoment, listMoments } from '../../game/media.js';
import { shadowOf, simulate, rewardDuel } from '../../game/duel.js';
import { touchMoment, STAGES } from '../../game/memories.js';
import { onDuelWin } from '../../game/companion.js';
import * as fx from '../fx.js';

// v7: kind 'photo'/'video' 추억은 label 이 null 일 수 있다 — 원더가 아니면 '스냅'(Iron 잉크) 로 대결한다. 스탯은 game/duel.js 가 이미 rarity 1 로 폴백.
const SNAP = Object.freeze({ name: '스냅', emoji: null, rarity: 1 });
const wonderOf = (m) => WONDERS[m?.label] ?? SNAP;
const inkOf = (w) => RARITY[w?.rarity]?.color ?? RARITY[1].color;
const nameOf = (m, w) => m?.shadow ? `그림자 ${w.name}` : (w === SNAP ? momentName(m) : w.name);
const urlOf = (blob) => { try { return blob ? URL.createObjectURL(blob) : ''; } catch { return ''; } };

/** 대결 화면: myId vs (otherId | 'shadow') */
register('duel', async (myId, otherId = 'shadow') => {
  const a = await getMoment(myId); if (!a) return go('album');
  let b = otherId === 'shadow' ? shadowOf(a) : await getMoment(otherId);
  if (!b) { const ms = (await listMoments()).filter(m => m.id !== myId); b = ms.length ? ms[Math.floor(Math.random() * ms.length)] : shadowOf(a); }
  const wa = wonderOf(a), wb = wonderOf(b), ua = urlOf(a.photo || a.thumb), ub = urlOf(b.photo || b.thumb) || ua;
  const na = nameOf(a, wa), nb = nameOf(b, wb);
  const sim = simulate(a, b), rm = state.settings?.reduceMotion;
  const stageIcon = (m) => icon((STAGES[m.stage || 0] ?? STAGES[0]).icon);
  const card = (m, w, u, side, s, nm) => `<div class="duel-card ${side} ${m.shadow ? 'shadow' : ''} ${m.variant ? 'variant' : ''}" style="--r-color:${inkOf(w)}"><div class="hp"><i id="hp-${side}" style="width:100%"></i></div><img src="${u}" alt=""/><b>${m.shadow ? `${icon('profile')} ` : ''}${momentMark(m)} ${esc(nm)}</b><small>${stageIcon(m)} ${esc(m.grade || 'AUTO')}${m.variant ? ` ${icon('prism')}` : ''}</small><div class="st">${['신비', '타이밍', '성장'].map(k => `<span>${k} <b>${s[k]}</b></span>`).join('')}</div></div>`;
  app.innerHTML = `
  <section class="screen duel-screen">
    <header><button class="btn icon ghost" id="back" title="뒤로">${icon('back')}</button><h2>추억 대결</h2><span class="pill mono" id="round">READY</span></header>
    <div class="arena">${card(a, wa, ua, 'a', sim.sa, na)}<div class="vs">VS</div>${card(b, wb, ub, 'b', sim.sb, nb)}</div>
    <div class="log" id="log"></div>
    <div class="actions" id="acts"><button class="btn primary big" id="fight">${icon('duel')} 대결 시작</button></div>
  </section>`;
  $('#back').onclick = () => go('album');
  $('#fight').onclick = async () => {
    $('#fight').disabled = true; fx.unlockAudio(); fx.drumroll(900); if (!rm) $('.arena').classList.add('rumble');
    await wait(1000); $('.arena').classList.remove('rumble');
    for (let i = 0; i < sim.rounds.length; i++) {
      const r = sim.rounds[i]; $('#round').textContent = `ROUND ${i + 1} · ${r.key}`;
      $(`.duel-card.a .st span:nth-child(${i + 1})`).classList.add('hi'); $(`.duel-card.b .st span:nth-child(${i + 1})`).classList.add('hi');
      fx.blip(); await wait(700);
      const loser = r.winner === 'a' ? 'b' : 'a'; const el = $(`.duel-card.${loser}`);
      if (!rm) { el.classList.add('hit'); fx.shake(el); } fx.thud(); fx.vibrate([40]);
      $(`#hp-${loser}`).style.width = `${loser === 'a' ? r.hpA : r.hpB}%`;
      $('#log').insertAdjacentHTML('afterbegin', `<div class="lg"><b>R${i + 1} ${r.key}</b> ${r.va} vs ${r.vb} → ${esc(r.winner === 'a' ? na : nb)} 승 · -${r.dmg}</div>`);
      await wait(900); el.classList.remove('hit');
    }
    const won = sim.winner === 'a'; $('#round').innerHTML = won ? `${icon('crown')} WIN` : `${icon('miss')} LOSE`;
    $(`.duel-card.${sim.winner}`).classList.add('winner'); if (won) { fx.chime(3, false); fx.burst(3, false); } else fx.denied();
    const dust = rewardDuel(won, !!b.shadow); const bonus = won ? onDuelWin() : 0;
    const ev = await touchMoment(a.id, { recalls: (a.recalls || 0) + 1 }); // 대결 자체가 회상 = 성장 계기
    if (!b.shadow && b.id) await touchMoment(b.id, { recalls: (b.recalls || 0) + 1 });
    $('#acts').innerHTML = `<div class="rewards"><span>${won ? '승리' : '패배'} ${icon('dust')} <b>+${dust}</b></span>${bonus ? `<span>도전장 보상 ${icon('dust')} <b>+${bonus}</b></span>` : ''}${ev?.leveled ? `<span>${icon(ev.leveled.icon)} ${ev.leveled.name}로 진화!</span>` : `<span>${icon('seed')} 성장 +1</span>`}</div>
      <div class="row"><button class="btn primary grow" id="again">${icon('repeat')} 다른 상대</button><button class="btn ghost grow" id="toAlbum">${icon('album')} 앨범</button></div>`;
    $('#again').onclick = () => go('duel', myId, 'shadow'); $('#toAlbum').onclick = () => go('album');
    if (won) { state.lastDuelWinDate = todayKey(); save(); }
  };
  return () => { if (ua) URL.revokeObjectURL(ua); if (ub && ub !== ua) URL.revokeObjectURL(ub); };
});
const wait = (ms) => new Promise(r => setTimeout(r, ms));
