// 스킬 에디터: 추억 사진을 스킬로 편집하고 굽는다
import { app, $, $$, esc, toast, icon, glyph } from './shell.js';
import { state, save } from '../game/state.js';
import { SKILLS, SHAPES, EMOJI_PALETTE, HIDDEN_PALETTE, ownsSkill, ownedSkills, toneCss, applyWarp, drawShape, drawEmoji, drawGlow, bakeEdit } from '../game/skills.js';
import { getMoment, updateMoment } from '../game/media.js';
import { touchMoment } from '../game/memories.js';
import * as fx from './fx.js';

export function openEditor(momentId, onDone = () => {}) {
  getMoment(momentId).then(async (m) => {
    if (!m) return;
    if (!m.photoOrig) { m.photoOrig = m.photo; } // 원본 보존(최초 1회)
    const owned = ownedSkills(); let skill = owned[0]?.id ?? 'emoji';
    const edit = { tone: null, warp: null, shapes: [], emojis: [], glow: null, hidden: null, cover: !!m.cover };
    const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = URL.createObjectURL(m.photoOrig); });
    const el = document.createElement('div'); el.className = 'modal';
    el.innerHTML = `<div class="sheet editor" onclick="event.stopPropagation()">
      <div class="row"><h3 class="grow">${icon('lens')} 렌즈 스킬</h3><button class="btn sm ghost" id="edReset">${icon('repeat')} 원본</button></div>
      <canvas id="edCanvas"></canvas>
      <div class="chips left skills">${SKILLS.map(s => `<button class="pill ${ownsSkill(s.id) ? '' : 'locked'} ${s.id === skill ? 'on' : ''}" data-sk="${s.id}" title="${esc(s.desc)}">${icon(s.icon)} ${esc(s.name)}${ownsSkill(s.id) ? '' : ` ${icon('lock', { size: 12 })}Lv${s.unlockLevel}`}</button>`).join('')}</div>
      <div id="edPanel"></div>
      <div class="row"><button class="btn primary sm grow" id="edSave">굽기 · 저장</button><button class="btn ghost sm" id="edClose">닫기</button></div></div>`;
    el.onclick = () => close(); app.appendChild(el);
    const c = $('#edCanvas', el); const W = 480, H = Math.round(480 * img.naturalHeight / img.naturalWidth); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
    let sel = null; // 드래그 중 요소
    const render = () => { x.filter = edit.tone ? toneCss(edit.tone) : 'none'; x.drawImage(img, 0, 0, W, H); x.filter = 'none'; if (edit.warp) applyWarp(x, W, H, edit.warp); for (const s of edit.shapes) drawShape(x, W, H, s); if (edit.glow) drawGlow(x, W, H, edit.glow); for (const e of edit.emojis) drawEmoji(x, W, H, e); if (edit.hidden?.emoji) { x.globalAlpha = 0.55; drawEmoji(x, W, H, { emoji: edit.hidden.emoji, x: edit.hidden.x, y: edit.hidden.y, size: 0.035 }); x.globalAlpha = 1; } if (edit.cover) { x.fillStyle = 'rgba(11,15,26,.45)'; x.fillRect(0, 0, W, H); x.fillStyle = '#EDE6D6'; x.font = '700 22px "IBM Plex Sans KR", sans-serif'; x.textAlign = 'center'; x.fillText('가려짐 — 보는 사람이 긁어서 확인', W / 2, H / 2); } };
    const pos = (e) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
    c.onpointerdown = (e) => { const p = pos(e); if (skill === 'emoji') { const hit = [...edit.emojis].reverse().find(m => Math.hypot(m.x - p.x, m.y - p.y) < m.size); if (hit) sel = hit; else { edit.emojis.push({ emoji: panel.emoji, x: p.x, y: p.y, size: panel.size, rot: 0 }); sel = edit.emojis.at(-1); } }
      else if (skill === 'shape') { const last = edit.shapes.at(-1); if (last && last.id === panel.shape) Object.assign(last, p); else edit.shapes.push({ id: panel.shape, ...p, text: panel.text }); }
      else if (skill === 'warp') { edit.warp = { ...(edit.warp || { mode: panel.mode, strength: panel.strength }), cx: p.x, cy: p.y }; }
      render(); fx.blip(); };
    c.onpointermove = (e) => { if (sel && e.buttons) { Object.assign(sel, pos(e)); render(); } }; c.onpointerup = () => sel = null;
    const panel = { emoji: EMOJI_PALETTE[0], size: 0.16, shape: 'spot', text: '', mode: 'bulge', strength: 0.5, tone: { brightness: 100, contrast: 100, saturate: 100, temp: 0 }, glow: { vignette: 0.6, sparkles: 40 }, hiddenEmoji: HIDDEN_PALETTE[0] };
    const renderPanel = () => { const P = $('#edPanel', el); const sk = skill;
      if (sk === 'emoji') P.innerHTML = `<div class="chips left">${EMOJI_PALETTE.map(e => `<button class="pill ${panel.emoji === e ? 'on' : ''}" data-e="${e}">${glyph(e, 'sm')}</button>`).join('')}</div><label>크기 <input type="range" id="eSize" min="6" max="40" value="${panel.size * 100}"/></label><small>사진을 탭해 붙이고, 드래그해 옮겨요. <button class="btn sm ghost" id="eUndo">${icon('minus', { size: 14 })} 하나 지우기</button></small>`;
      else if (sk === 'tone') P.innerHTML = ['brightness:밝기:50:150', 'contrast:대비:50:150', 'saturate:채도:0:200', 'temp:온도:-100:100'].map(s => { const [k, n, a, b] = s.split(':'); return `<label>${n} <input type="range" data-t="${k}" min="${a}" max="${b}" value="${panel.tone[k]}"/></label>`; }).join('') + `<div class="chips left">${[['자연', 100, 105, 110, 10], ['필름', 95, 115, 85, 30], ['차가운', 105, 100, 95, -50], ['드라마', 90, 135, 120, 0]].map(([n, b, c, s, t]) => `<button class="pill" data-preset="${b},${c},${s},${t}">${n}</button>`).join('')}</div>`;
      else if (sk === 'shape') P.innerHTML = `<div class="chips left">${SHAPES.map(s => `<button class="pill ${panel.shape === s.id ? 'on' : ''}" data-sh="${s.id}">${s.name}</button>`).join('')}</div><label>문구 (말풍선·폴라로이드) <input id="shText" maxlength="24" value="${esc(panel.text)}" placeholder="한 마디"/></label><small>사진을 탭해 위치 지정. <button class="btn sm ghost" id="shUndo">${icon('minus', { size: 14 })} 하나 지우기</button></small>`;
      else if (sk === 'warp') P.innerHTML = `<div class="chips left">${[['bulge', '볼록'], ['pinch', '오목'], ['swirl', '소용돌이']].map(([k, n]) => `<button class="pill ${panel.mode === k ? 'on' : ''}" data-w="${k}">${n}</button>`).join('')}</div><label>강도 <input type="range" id="wStr" min="10" max="100" value="${panel.strength * 100}"/></label><small>사진을 탭해 중심 지정. <button class="btn sm ghost" id="wClear">${icon('close', { size: 14 })} 왜곡 해제</button></small>`;
      else if (sk === 'hidden') P.innerHTML = `<div class="chips left">${HIDDEN_PALETTE.map(e => `<button class="pill ${panel.hiddenEmoji === e ? 'on' : ''}" data-h="${e}">${glyph(e, 'sm')}</button>`).join('')}</div><div class="row"><button class="btn sm ghost grow" id="hHide">${icon('scope')} 랜덤 위치에 숨기기</button><button class="btn sm ${edit.cover ? 'primary' : 'ghost'} grow" id="hCover">${edit.cover ? `${icon('key')} 가리기 해제` : `${icon('lock')} 사진 가리기(스크래치)`}</button></div><small>숨긴 이모지는 회상할 때 "숨은 그림 찾기"가 되고, 찾으면 별가루 +15.</small>`;
      else if (sk === 'glow') P.innerHTML = `<label>비네트 <input type="range" id="gVig" min="0" max="90" value="${panel.glow.vignette * 100}"/></label><label>반짝이 <input type="range" id="gSp" min="0" max="120" value="${panel.glow.sparkles}"/></label><div class="row"><button class="btn sm ghost grow" id="gOn">${icon('dust')} 적용</button><button class="btn sm ghost" id="gOff" title="광채 해제">${icon('close')}</button></div>`;
      $$('[data-e]', P).forEach(b => b.onclick = () => { panel.emoji = b.dataset.e; renderPanel(); }); $('#eSize', P) && ($('#eSize', P).oninput = (e) => { panel.size = e.target.value / 100; if (edit.emojis.at(-1)) { edit.emojis.at(-1).size = panel.size; render(); } }); $('#eUndo', P) && ($('#eUndo', P).onclick = () => { edit.emojis.pop(); render(); });
      $$('[data-t]', P).forEach(i => i.oninput = () => { panel.tone[i.dataset.t] = +i.value; edit.tone = { ...panel.tone }; render(); }); $$('[data-preset]', P).forEach(b => b.onclick = () => { const [br, co, sa, te] = b.dataset.preset.split(',').map(Number); panel.tone = { brightness: br, contrast: co, saturate: sa, temp: te }; edit.tone = { ...panel.tone }; renderPanel(); render(); });
      $$('[data-sh]', P).forEach(b => b.onclick = () => { panel.shape = b.dataset.sh; renderPanel(); }); $('#shText', P) && ($('#shText', P).oninput = (e) => { panel.text = e.target.value; const last = edit.shapes.at(-1); if (last) { last.text = panel.text; render(); } }); $('#shUndo', P) && ($('#shUndo', P).onclick = () => { edit.shapes.pop(); render(); });
      $$('[data-w]', P).forEach(b => b.onclick = () => { panel.mode = b.dataset.w; if (edit.warp) { edit.warp.mode = panel.mode; render(); } renderPanel(); }); $('#wStr', P) && ($('#wStr', P).oninput = (e) => { panel.strength = e.target.value / 100; if (edit.warp) { edit.warp.strength = panel.strength; render(); } }); $('#wClear', P) && ($('#wClear', P).onclick = () => { edit.warp = null; render(); });
      $$('[data-h]', P).forEach(b => b.onclick = () => { panel.hiddenEmoji = b.dataset.h; renderPanel(); }); $('#hHide', P) && ($('#hHide', P).onclick = () => { edit.hidden = { emoji: panel.hiddenEmoji, x: 0.08 + Math.random() * 0.84, y: 0.08 + Math.random() * 0.84, found: 0 }; render(); toast(`${glyph(panel.hiddenEmoji, 'sm')} 어딘가에 숨겼어요`, 1500); }); $('#hCover', P) && ($('#hCover', P).onclick = () => { edit.cover = !edit.cover; renderPanel(); render(); });
      $('#gVig', P) && ($('#gVig', P).oninput = (e) => { panel.glow.vignette = e.target.value / 100; if (edit.glow) { edit.glow = { ...panel.glow }; render(); } }); $('#gSp', P) && ($('#gSp', P).oninput = (e) => { panel.glow.sparkles = +e.target.value; if (edit.glow) { edit.glow = { ...panel.glow }; render(); } }); $('#gOn', P) && ($('#gOn', P).onclick = () => { edit.glow = { ...panel.glow }; render(); }); $('#gOff', P) && ($('#gOff', P).onclick = () => { edit.glow = null; render(); });
    };
    $$('[data-sk]', el).forEach(b => b.onclick = () => { if (!ownsSkill(b.dataset.sk)) { fx.denied(); toast(`${icon('lock')} Lv${SKILLS.find(s => s.id === b.dataset.sk).unlockLevel}에 해금 · 상점에서 구매 가능`, 2000); return; } skill = b.dataset.sk; $$('[data-sk]', el).forEach(x => x.classList.toggle('on', x === b)); renderPanel(); fx.blip(); });
    $('#edReset', el).onclick = () => { Object.assign(edit, { tone: null, warp: null, shapes: [], emojis: [], glow: null, hidden: null, cover: false }); render(); };
    $('#edClose', el).onclick = close;
    $('#edSave', el).onclick = async (e) => { e.target.disabled = true; e.target.textContent = '굽는 중…';
      const used = [edit.tone && 'tone', edit.warp && 'warp', edit.shapes.length && 'shape', edit.emojis.length && 'emoji', edit.glow && 'glow', (edit.hidden || edit.cover) && 'hidden'].filter(Boolean);
      const baked = await bakeEdit(m.photoOrig, edit); const { compressImage } = await import('../game/media.js'); const thumb = await compressImage(URL.createObjectURL(baked), 160, 0.6);
      const skills = [...new Set([...(m.skills || []), ...used])];
      const r = await touchMoment(m.id, { photo: baked, thumb, photoOrig: m.photoOrig, skills, hidden: edit.hidden ?? m.hidden ?? null, cover: edit.cover, bytes: baked.size + thumb.size + (m.clip?.size ?? 0) });
      state.stats.edits = (state.stats.edits || 0) + used.length; save();
      close(); fx.chest(); if (r?.leveled) toast(`${icon('seed')} 스킬로 다듬어 「${icon(r.leveled.icon)} ${esc(r.leveled.name)}」로 자랐어요! ${icon('dust')}+${r.leveled.reward.dust}`, 3200, 'quest'); else toast(`${icon('lens')} 스킬 ${used.length}종 적용 · 저장`, 1800); onDone(r?.m); };
    function close() { el.remove(); URL.revokeObjectURL(img.src); }
    render(); renderPanel();
  });
}
