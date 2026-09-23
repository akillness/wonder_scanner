import { register, go, app, $, $$, esc, tabsHtml, bindTabs, toast, icon } from '../shell.js';
import { state, save, ownedCount } from '../../game/state.js';
import { SHOP, FRAMES, MILESTONES, buy, shopOwned } from '../../game/economy.js';
import { SKILLS, ownsSkill, buySkill } from '../../game/skills.js';
import { AURAS, AURA_IDS, createAura, ownsAura, equipAura, buyAura } from '../../ar/auras.js';
import { rank } from '../../game/state.js';
import * as fx from '../fx.js';

// 렌즈 스킬 데이터(skills.js)는 이모지 아이콘을 들고 있으므로 상점에서는 id → 아이콘 이름으로 매핑한다
const SKILL_ICON = { emoji: 'image', tone: 'sun', shape: 'frame', warp: 'lens', hidden: 'scope', glow: 'star' };
const skillIcon = (id, opts) => icon(SKILL_ICON[id] ?? 'lens', opts);
const dust = (n) => `${icon('dust')} ${n}`;
const bigIcon = (html) => `<span class="shop-ic" style="font-size:26px;line-height:1">${html}</span>`;
const reduceMotion = () => !!state.settings?.reduceMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

// 아우라 미리보기: 카드마다 32px 캔버스 1개(백킹 64px) + 화면 전체에 rAF 루프 1개. 화면을 떠나면 정지.
const PREVIEW = { px: 32, cx: 16, cy: 16, r: 6, box: [7, 7, 18, 18] };
let raf = 0, previews = [];
function stopPreviews() { if (raf) cancelAnimationFrame(raf); raf = 0; previews = []; }
function startPreviews() {
  stopPreviews();
  previews = $$('.aura-prev').map(c => { const ctx = c.getContext('2d'); ctx.setTransform(2, 0, 0, 2, 0, 0); return { c, ctx, aura: createAura(c.dataset.aura) }; });
  if (!previews.length) return;
  const still = reduceMotion();
  let last = 0;
  const frame = (now) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
    const gauge = still ? 0.8 : 0.55 + 0.45 * Math.sin(now / 1400);
    for (const p of previews) {
      if (!p.c.isConnected) continue;
      p.ctx.clearRect(0, 0, PREVIEW.px, PREVIEW.px);
      p.aura.draw(p.ctx, { cx: PREVIEW.cx, cy: PREVIEW.cy, r: PREVIEW.r, box: PREVIEW.box, gauge, dt, now, color: '#EDE6D6', reduceMotion: still });
    }
    if (!still && previews.some(p => p.c.isConnected)) raf = requestAnimationFrame(frame); else raf = 0;
  };
  raf = requestAnimationFrame(frame);
}

register('shop', () => {
  const render = () => {
    stopPreviews();
    const goods = SHOP.filter(i => !i.id.startsWith('aura:')); // 아우라는 아래 전용 섹션(미리보기 포함)에서 판다
    app.innerHTML = `
    <section class="screen meta">
      <header><button class="btn icon ghost" id="back" title="뒤로">${icon('back')}</button><h2>별가루 상점</h2><span class="pill gold mono">${dust(state.dust)}</span></header>
      <div class="shop-grid">${goods.map((i, n) => { const ownedFrame = shopOwned(i); return `<button class="shop-item stagger ${ownedFrame ? 'owned' : ''} ${state.dust < i.price && !ownedFrame ? 'poor' : ''}" data-id="${i.id}" style="--i:${n}">${bigIcon(icon(i.icon, { size: 26 }))}<b>${esc(i.name)}</b><small>${esc(i.desc)}</small><span class="price mono">${ownedFrame ? '보유 중' : dust(i.price)}</span></button>`; }).join('')}</div>
      <h3>${icon('lens')} 렌즈 스킬 <small>랭크로 해금 또는 구매</small></h3>
      <div class="shop-grid">${SKILLS.map((k, n) => { const has = ownsSkill(k.id); return `<button class="shop-item stagger ${has ? 'owned' : ''} ${!has && state.dust < k.price ? 'poor' : ''}" data-skill="${k.id}" style="--i:${n}">${bigIcon(skillIcon(k.id, { size: 26 }))}<b>${esc(k.name)}</b><small>${esc(k.desc)}</small><span class="price mono">${has ? (rank().level >= k.unlockLevel ? `Lv${k.unlockLevel} 해금` : '보유 중') : `${dust(k.price)} · 또는 Lv${k.unlockLevel}`}</span></button>`; }).join('')}</div>
      <h3>${icon('star')} 아우라 스킨 <small>원더별 장착은 도감에서</small></h3>
      <div class="shop-grid aura-grid">${AURA_IDS.map((id, n) => {
        const a = AURAS[id], has = ownsAura(id), isGlobal = state.auraSkin === id;
        const preview = `<canvas class="aura-prev" data-aura="${id}" width="64" height="64" aria-hidden="true"></canvas>`; // 32px 표시 · 64px 백킹 (v7.css .aura-prev)
        return has
          ? `<div class="shop-item aura-card stagger owned" style="--i:${n}">${preview}<b>${esc(a.name)}</b><small>${esc(a.desc)}</small><span class="price mono">${a.price ? '보유 중' : '기본 · 보유 중'}</span>
               <button class="pill aura-equip ${isGlobal ? 'on' : ''}" data-equip="${id}" aria-pressed="${isGlobal}" style="margin-top:6px;justify-content:center">${isGlobal ? `${icon('check', { size: 12 })} 전체 기본 장착 중` : '전체 기본으로 장착'}</button></div>`
          : `<button class="shop-item aura-card stagger ${state.dust < a.price ? 'poor' : ''}" data-buy="${id}" style="--i:${n}">${preview}<b>${esc(a.name)}</b><small>${esc(a.desc)}</small><span class="price mono">${dust(a.price)}</span></button>`;
      }).join('')}</div>
      <h3>${icon('frame')} 카드 프레임</h3>
      <div class="frames">${FRAMES.map(f => { const has = state.frames.includes(f.id); return `<button class="frame-pick frame-${f.id} ${state.activeFrame === f.id ? 'on' : ''} ${has ? '' : 'locked'}" data-frame="${f.id}"><span>${esc(f.name)}</span>${has ? '' : `<small class="mono">${dust(f.price)}</small>`}</button>`; }).join('')}</div>
      <h3>${icon('chest')} 보물상자 <small>${state.milestones.length}/${MILESTONES.length}</small></h3>
      <div class="quest-list ledger">${MILESTONES.map((m, n) => { const got = state.milestones.includes(m.at); return `<div class="quest ledger-row stagger ${got ? 'done' : ''}" style="--i:${n}"><div class="qi">${icon(got ? 'check' : 'gift')}</div><div class="grow"><b>${m.at}종 수집 · ${esc(m.title)}</b><div class="progress sm"><i style="width:${Math.min(100, ownedCount() / m.at * 100)}%"></i></div><small>${Math.min(ownedCount(), m.at)}/${m.at}</small></div><div class="qr mono">${dust(m.reward.dust)}<br>${m.reward.prism ? `프리즘 ${m.reward.prism}<br>` : ''}+${m.reward.xp} XP</div></div>`; }).join('')}</div>
      ${tabsHtml('profile')}
    </section>`;
    $('#back').onclick = () => go('profile'); bindTabs();
    $$('.shop-item[data-id]').forEach(b => b.onclick = () => { const r = buy(b.dataset.id); if (r.ok) { fx.chest(); toast(`${icon(r.item.icon)} ${esc(r.item.name)} 구매!`, 2200); render(); } else { fx.denied(); toast(`${icon('miss')} ${esc(r.msg)}`, 2200); } });
    $$('[data-skill]').forEach(b => b.onclick = () => { const r = buySkill(b.dataset.skill); if (r.ok) { fx.chest(); toast(`${skillIcon(r.item.id)} ${esc(r.item.name)} 스킬 획득!`, 2200); render(); } else { fx.denied(); toast(`${icon('miss')} ${esc(r.msg)}`, 2000); } });
    $$('[data-buy]').forEach(b => b.onclick = () => { const r = buyAura(b.dataset.buy); if (r.ok) { fx.chest(); toast(`${icon('star')} ${esc(r.msg)}`, 2200); render(); } else { fx.denied(); toast(`${icon('miss')} ${esc(r.msg)}`, 2000); } });
    $$('[data-equip]').forEach(b => b.onclick = () => { const id = b.dataset.equip; const on = state.auraSkin === id; const ok = equipAura(null, on ? null : id); if (!ok) { fx.denied(); toast('상점에서 먼저 구매해요', 1800); return; } fx.blip(); toast(on ? '전체 기본 아우라를 해제했어요 (챕터 기본으로)' : `${icon('star')} ${esc(AURAS[id].name)} 아우라를 전체 기본으로 장착`, 1800); render(); });
    $$('.frame-pick').forEach(b => b.onclick = () => { const id = b.dataset.frame; if (!state.frames.includes(id)) { fx.denied(); toast('상점에서 먼저 구매해요', 1800); return; } state.activeFrame = id; save(); fx.blip(); render(); });
    startPreviews();
  };
  render();
  return () => stopPreviews();
});
