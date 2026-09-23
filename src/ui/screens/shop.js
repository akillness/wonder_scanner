import { register, go, app, $, $$, esc, tabsHtml, bindTabs, toast } from '../shell.js';
import { state, save, ownedCount } from '../../game/state.js';
import { SHOP, FRAMES, MILESTONES, buy } from '../../game/economy.js';
import * as fx from '../fx.js';

register('shop', () => {
  const render = () => {
    app.innerHTML = `
    <section class="screen meta">
      <header><button class="btn icon ghost" id="back">←</button><h2>🏪 별가루 상점</h2><span class="pill gold">✨ ${state.dust}</span></header>
      <div class="shop-grid">${SHOP.map(i => { const ownedFrame = i.once && state.frames.includes(i.id.split(':')[1]); return `<button class="shop-item ${ownedFrame ? 'owned' : ''} ${state.dust < i.price && !ownedFrame ? 'poor' : ''}" data-id="${i.id}"><span class="ic">${i.icon}</span><b>${esc(i.name)}</b><small>${esc(i.desc)}</small><span class="price">${ownedFrame ? '보유 중' : `✨ ${i.price}`}</span></button>`; }).join('')}</div>
      <h3>🖼️ 카드 프레임</h3>
      <div class="frames">${FRAMES.map(f => { const has = state.frames.includes(f.id); return `<button class="frame-pick frame-${f.id} ${state.activeFrame === f.id ? 'on' : ''} ${has ? '' : 'locked'}" data-frame="${f.id}"><span>${esc(f.name)}</span>${has ? '' : `<small>✨${f.price}</small>`}</button>`; }).join('')}</div>
      <h3>🎁 보물상자 <small>${state.milestones.length}/${MILESTONES.length}</small></h3>
      <div class="quest-list">${MILESTONES.map(m => { const got = state.milestones.includes(m.at); return `<div class="quest ${got ? 'done' : ''}"><div class="qi">${got ? '✅' : '🎁'}</div><div class="grow"><b>${m.at}종 수집 · ${esc(m.title)}</b><div class="progress sm"><i style="width:${Math.min(100, ownedCount() / m.at * 100)}%"></i></div><small>${Math.min(ownedCount(), m.at)}/${m.at}</small></div><div class="qr">✨ ${m.reward.dust}<br>${m.reward.prism ? `프리즘 ${m.reward.prism}<br>` : ''}+${m.reward.xp} XP</div></div>`; }).join('')}</div>
      ${tabsHtml('profile')}
    </section>`;
    $('#back').onclick = () => go('profile'); bindTabs();
    $$('.shop-item').forEach(b => b.onclick = () => { const r = buy(b.dataset.id); if (r.ok) { fx.chest(); toast(`${r.item.icon} ${esc(r.item.name)} 구매!`, 2200); render(); } else { fx.denied(); toast(`❌ ${esc(r.msg)}`, 2200); } });
    $$('.frame-pick').forEach(b => b.onclick = () => { const id = b.dataset.frame; if (!state.frames.includes(id)) { fx.denied(); toast('상점에서 먼저 구매해요', 1800); return; } state.activeFrame = id; save(); fx.blip(); render(); });
  };
  render();
});
