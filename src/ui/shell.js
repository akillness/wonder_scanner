import { state, rank, ownedCount, totalCount, closestChapter } from '../game/state.js';
import { questSummary } from '../game/quests.js';
import { WONDERS } from '../data/wonders.js';

export const app = document.getElementById('app');
export const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = app) => root.querySelector(sel);
export const $$ = (sel, root = app) => [...root.querySelectorAll(sel)];

const routes = {}; let leave = null;
export function register(name, fn) { routes[name] = fn; }
export function go(name, ...args) { leave?.(); leave = null; const r = routes[name]?.(...args); if (typeof r === 'function') leave = r; window.scrollTo(0, 0); }

export function typeInto(el, text, speed = 20) {
  return new Promise(res => { if (!el) return res(); let i = 0; el.textContent = ''; el.classList.add('cursor');
    const t = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length || !el.isConnected) { clearInterval(t); el.classList.remove('cursor'); res(); } }, speed); });
}
export const lupeHtml = (text = '', id = 'lupe', cls = '') => `<div class="bubble ${cls}"><img class="lupe-img" src="/img/lupe.svg" alt="루페" /><div><span class="who">LUPE</span><span id="${id}">${esc(text)}</span></div></div>`;

export function hudHtml() {
  const r = rank(), q = questSummary();
  return `<span class="pill">Lv.${r.level} <span class="xp"><i style="width:${Math.round(r.progress * 100)}%"></i></span></span>
          <span class="pill">📖 ${ownedCount()}/${totalCount()}</span>
          <span class="pill">✨ <b>${state.dust}</b></span>
          <span class="pill ${q.done === q.total ? 'gold' : ''}">📋 ${q.done}/${q.total}</span>`;
}
export function nudgeHtml() {
  const c = closestChapter();
  if (!c.missing.length) return '';
  const next = c.missing.slice(0, 3).map(l => `${WONDERS[l].emoji} ${l}`).join(' · ');
  return `<div class="nudge"><img src="/img/ch/${c.chapter.id}.svg" alt="" /><div><b>${esc(c.chapter.title)}</b> ${c.remain}개만 더!<small>${esc(next)}</small></div></div>`;
}
export function tabsHtml(active) {
  const t = [['scan', '📷', '스캔'], ['codex', '📖', '도감'], ['quests', '📋', '의뢰'], ['profile', '🧭', '프로필']];
  return `<nav class="tabs-nav">${t.map(([k, i, l]) => `<button class="tab-btn ${k === active ? 'on' : ''}" data-go="${k}"><span>${i}</span>${l}</button>`).join('')}</nav>`;
}
export function bindTabs(root = app) { $$('[data-go]', root).forEach(b => b.onclick = () => go(b.dataset.go)); }

let toastRoot = null;
export function toast(html, ms = 3200, cls = '') {
  if (!toastRoot || !toastRoot.isConnected) { toastRoot = document.createElement('div'); toastRoot.className = 'toast-stack'; document.body.appendChild(toastRoot); }
  const el = document.createElement('div'); el.className = `toast ${cls}`; el.innerHTML = html; toastRoot.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms);
}
export const grade = { PERFECT: '🎯', GREAT: '⭐', GOOD: '○', AUTO: '○' };
