import { register, go, app, $, $$, esc, tabsHtml, bindTabs, toast, grade as GI, icon, glyph, rarityHtml, catalogNo } from '../shell.js';
import { WONDERS, RARITY } from '../../data/wonders.js';
import { CHAPTERS, chapterLabels } from '../../data/chapters.js';
import { state, chapterProgress, ownedCount, totalCount } from '../../game/state.js';
import { notesFor } from '../../game/notes.js';
import { BALANCE } from '../../game/balance.js';
import * as fx from '../fx.js';
import { AURAS, AURA_IDS, auraFor, ownsAura, equipAura } from '../../ar/auras.js';

register('codex', (chapterId = null) => {
  chapterId ??= CHAPTERS.map(c => ({ c, p: chapterProgress(c.id) })).filter(x => !x.p.done).sort((a, b) => a.p.remain - b.p.remain)[0]?.c.id ?? CHAPTERS[0].id;
  const total = totalCount(), have = ownedCount();
  const gradeIc = (g) => icon(GI[g] ?? 'circle', { size: 10 });
  const render = () => {
    const ch = CHAPTERS.find(c => c.id === chapterId), cp = chapterProgress(chapterId);
    app.innerHTML = `
    <section class="screen codex">
      <header><button class="btn icon ghost" id="back" title="뒤로" aria-label="뒤로">${icon('back')}</button><h2>원더 도감</h2><span class="pill mono">${have}/${total} · ${Math.round(have / total * 100)}%</span></header>
      <div class="progress"><i style="width:${(have / total) * 100}%"></i></div>
      <div class="tabs">${CHAPTERS.map(c => { const p = chapterProgress(c.id); const deg = Math.round(p.have / p.total * 360); return `<button class="tab ${c.id === chapterId ? 'on' : ''} ${p.done ? 'done' : ''}" data-id="${c.id}"><span class="ring" style="--deg:${deg}deg"><img src="/img/ch/${c.id}.svg" alt=""/></span>${esc(c.title)}<small>${p.done ? '완성' : `${p.remain}개 남음`}</small></button>`; }).join('')}</div>
      <div class="chapter-head"><span>${cp.done ? `${icon('check')} 챕터 완성 — 스토리 해금` : `${icon('lamp')} ${esc(ch.hint)} · <b>${cp.remain}개만 더!</b>`}</span><span class="mono">${cp.have}/${cp.total}</span></div>
      ${cp.done ? `<div class="story">${esc(ch.story)}</div>` : ''}
      <div class="grid">${chapterLabels(chapterId).sort((a, b) => WONDERS[a].rarity - WONDERS[b].rarity).map((l, i) => {
        const w = WONDERS[l], e = state.codex[l], R = RARITY[w.rarity];
        const mastery = e ? Math.min(1, e.count / BALANCE.depth.note2) : 0;
        return `<button class="slot stagger ${e ? 'owned' : 'locked'} ${e?.variant ? 'variant' : ''} ${e?.count >= BALANCE.depth.note2 ? 'master' : ''}" data-l="${esc(l)}" data-r="${w.rarity}" style="--i:${i};--sc:${R.color};--sg:${R.glow};--m:${Math.round(mastery * 100)}%" title="${e ? esc(w.name) : esc(R.label)}">
          ${glyph(w.emoji, 'e')}<span class="nm">${e ? esc(w.name) : rarityHtml(w.rarity, { label: false })}</span>
          ${e ? `<span class="cnt mono">${gradeIc(e.bestGrade)} ×${e.count}</span><i class="mbar"></i>` : ''}
        </button>`; }).join('')}</div>
      ${tabsHtml('codex')}
    </section>`;
    $('#back').onclick = () => go('title'); bindTabs();
    $$('.tab').forEach(b => b.onclick = () => { chapterId = b.dataset.id; fx.blip(); render(); });
    $$('.slot').forEach(b => b.onclick = () => detail(b.dataset.l));
  };
  // 아우라 장착 행 (GAMEPLAY_V7 4.2): 보유 스킨만 선택, 현재 해석값(auraFor) .on, 미보유는 흐리게 + 가격. 스타일은 v7.css §9 (.aura-pick 가로 스크롤 칩 행, .aura-chip i 는 data-aura 별 --ac 색)
  const auraRow = (l, e) => {
    const cur = auraFor(l, { variant: !!e.variant }), explicit = state.auraByLabel?.[l];
    const src = explicit && AURAS[explicit] ? '장착' : (e.variant && cur === 'prism') ? '변이체 기본' : state.auraSkin === cur ? '전체 기본' : '챕터 기본';
    return `<div class="aura-row"><div class="aura-head mono" style="display:flex;justify-content:space-between;font-size:11px;color:var(--mute);margin-top:6px"><span>${icon('star', { size: 12 })} 아우라</span><span>${esc(AURAS[cur]?.name ?? cur)} · ${src}</span></div>
      <div class="aura-pick">${AURA_IDS.map(id => { const a = AURAS[id], has = ownsAura(id), on = id === cur; return `<button class="aura-chip ${on ? 'on' : ''} ${has ? '' : 'locked'}" data-aura="${id}" aria-pressed="${on}" title="${esc(a.desc)}"><i></i>${esc(a.name)}${has ? '' : `<small>${icon('dust', { size: 11 })} ${a.price}</small>`}</button>`; }).join('')}</div></div>`;
  };
  const detail = (l) => {
    const w = WONDERS[l], e = state.codex[l], R = RARITY[w.rarity], notes = e ? notesFor(l, w, e.count) : [];
    const m = document.createElement('div'); m.className = 'modal';
    const locks = e ? [BALANCE.depth.note1, BALANCE.depth.note2].filter(n => e.count < n).map(n => `<div class="note locked">${icon('lock')} ${n}회 포획 시 루페의 관찰 노트 해금 (${e.count}/${n})</div>`).join('') : '';
    const cardHtml = () => e
      ? `<div class="card plate ${e.variant ? 'variant' : ''} ${e.count >= BALANCE.depth.note2 ? 'master' : ''}" data-r="${w.rarity}" style="--r-color:${R.color};--r-glow:${R.glow};animation:pop .4s both">
          <div class="rar"><span>${rarityHtml(w.rarity)}${e.variant ? ` <span class="prism">${icon('prism', { size: 12 })} 프리즘</span>` : ''}</span><span class="mono">${gradeIc(e.bestGrade)} ×${e.count}</span></div>
          <div class="big-e">${glyph(w.emoji, 'big')}</div>
          <div class="name">${esc(w.name)}</div>
          <div class="orig mono">${catalogNo(l)} · 원래 이름: ${esc(l)}</div>
          <div class="lore">${esc(w.lore)}</div>
          ${notes.map(n => `<div class="note">${icon('quill')} ${esc(n)}</div>`).join('')}${locks}
          ${auraRow(l, e)}
          <div class="foot mono"><span>첫 발견 ${new Date(e.firstAt).toLocaleDateString('ko-KR')}</span><span>최고 신뢰도 ${Math.round(e.bestConf * 100)}%</span></div>
        </div>`
      : `<div class="card plate locked" data-r="${w.rarity}" style="--r-color:${R.color};--r-glow:${R.glow};animation:pop .4s both;align-items:center;justify-content:center;text-align:center">
          <div class="big-e" style="filter:grayscale(1) brightness(.4)">${glyph(w.emoji, 'big')}</div>
          <div class="name">???</div>
          <div class="orig mono">${catalogNo(l)} · ${rarityHtml(w.rarity)} 원더</div>
          <div class="lore">힌트: "${esc(l)}"을(를) 카메라에 비춰 보세요.</div>
        </div>`;
    const paint = () => {
      m.innerHTML = cardHtml();
      $$('.aura-chip', m).forEach(b => b.onclick = (ev) => {
        ev.stopPropagation(); const id = b.dataset.aura;
        if (!ownsAura(id)) { fx.denied(); toast(`${icon('lock')} 상점에서 먼저 구매해요`, 1800); return; }
        if (!equipAura(l, id)) { fx.denied(); return; }
        fx.blip(); paint();
      });
      $$('.aura-row', m).forEach(el => el.onclick = (ev) => ev.stopPropagation());
    };
    paint();
    m.onclick = () => m.remove(); app.appendChild(m); fx.blip();
  };
  render();
});
