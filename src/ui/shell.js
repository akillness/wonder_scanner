import { state, rank, ownedCount, totalCount, closestChapter } from '../game/state.js';
import { questSummary } from '../game/quests.js';
import { WONDERS, RARITY, ALL_LABELS } from '../data/wonders.js';
import { icon } from './icons.js';

// ── 아이콘 재수출 (DESIGN.md 9.4): 화면 코드는 shell 에서 icon 을 가져다 쓴다. hasIcon 은 신규 아이콘 이름 폴백용.
export { icon, hasIcon } from './icons.js';

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

// ── 공용 헬퍼 (9.4)
// 희귀도 시길: n × sigil 아이콘 (+ 등급 라벨). 색은 CSS 가 data-r 로 입힌다.
export const rarityHtml = (n, { label = true } = {}) => {
  const k = Math.max(0, Number(n) || 0);
  const sig = icon('sigil', { size: 12, cls: 'sigil' }).repeat(k);
  const lb = label && RARITY[k] ? ` <span class="rar-label">${esc(RARITY[k].label)}</span>` : '';
  return `<span class="rar-sigils" data-r="${k}">${sig}${lb}</span>`;
};
// 카탈로그 번호: No. 001 … (ALL_LABELS 순서)
export const catalogNo = (label) => `No. ${String(ALL_LABELS.indexOf(label) + 1).padStart(3, '0')}`;
// 원더 글리프 — 이모지 사용의 유일한 예외 (4.11). 반드시 렌즈 접시(.glyph) 안에서만.
export const glyph = (emoji, cls = '') => `<span class="glyph ${cls}">${emoji}</span>`;
// 추억(moment) 표시 헬퍼 — v7 의 kind 'photo'/'video' 추억은 label 이 null 일 수 있다 (GAMEPLAY_V7 6.5).
// 원더가 아니면 이름은 '스냅', 표식은 글리프 대신 camera/film 아이콘 (UI 크롬 이모지 금지 규칙과도 맞는다).
export const momentName = (m) => WONDERS[m?.label]?.name ?? '스냅';
export const momentMark = (m, cls = '') => {
  const w = WONDERS[m?.label];
  if (w) return glyph(w.emoji, cls);
  const video = m?.kind === 'video' || (!!m?.clip && !m?.label) || (!!m?.clipUrl && !m?.label);
  return `<span class="glyph ${cls}">${icon(video ? 'film' : 'camera', { size: 16 })}</span>`;
};
// 모션 줄이기(설정) → :root.reduce-motion. prefers-reduced-motion 과 함께 존중한다 (DESIGN 6). 부팅·설정 변경·초기화 시 호출.
export const syncReduceMotion = () => document.documentElement.classList.toggle('reduce-motion', !!state.settings?.reduceMotion);

// 루페 쪽지: 좌측 아바타 · 우측 쪽지 (LUPE 이름표는 Mono). 아이콘 자리(#id-ic)는 타자 텍스트 앞에 놓인다.
export const lupeHtml = (text = '', id = 'lupe', cls = '') => `<div class="bubble ${cls}"><img class="lupe-img" src="/img/lupe.svg" alt="루페" /><div><span class="who mono">LUPE</span><span class="lupe-ic" id="${id}-ic"></span><span id="${id}">${esc(text)}</span></div></div>`;

export function hudHtml() {
  const r = rank(), q = questSummary();
  return `<span class="pill lv">Lv.${r.level} <span class="xp"><i style="width:${Math.round(r.progress * 100)}%"></i></span></span>
          <span class="pill mono">${icon('codex')} ${ownedCount()}/${totalCount()}</span>
          <span class="pill mono">${icon('dust')} <b>${state.dust}</b></span>
          <span class="pill mono ${q.done === q.total ? 'gold' : ''}">${icon('quest')} ${q.done}/${q.total}</span>`;
}
export function nudgeHtml() {
  const c = closestChapter();
  if (!c.missing.length) return '';
  const next = c.missing.slice(0, 3).map(l => `${glyph(WONDERS[l].emoji, 'sm')} ${esc(l)}`).join(' · ');
  return `<div class="nudge"><img src="/img/ch/${c.chapter.id}.svg" alt="" /><div><b>${esc(c.chapter.title)}</b> ${c.remain}개만 더!<small>${next}</small></div></div>`;
}
// 탭 순서 (GAMEPLAY_V7 6.8): 카메라 · 앨범 · 도감 · 의뢰 · 프로필. 라우트 id 'scan' 은 그대로 (DESIGN 9.6).
export function tabsHtml(active) {
  const t = [['scan', 'camera', '카메라'], ['album', 'album', '앨범'], ['codex', 'codex', '도감'], ['quests', 'quest', '의뢰'], ['profile', 'profile', '프로필']];
  return `<nav class="tabs-nav" aria-label="주요 화면">${t.map(([k, i, l]) => `<button class="tab-btn ${k === active ? 'on' : ''}" data-go="${k}" ${k === active ? 'aria-current="page"' : ''}><span>${icon(i, { size: 22 })}</span>${l}</button>`).join('')}</nav>`;
}
export function bindTabs(root = app) { $$('[data-go]', root).forEach(b => b.onclick = () => go(b.dataset.go)); }

let toastRoot = null;
export function toast(html, ms = 3200, cls = '') {
  if (!toastRoot || !toastRoot.isConnected) { toastRoot = document.createElement('div'); toastRoot.className = 'toast-stack'; document.body.appendChild(toastRoot); }
  const el = document.createElement('div'); el.className = `toast ${cls}`; el.innerHTML = html; toastRoot.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms);
}
// 등급 → 아이콘 이름. 사용처는 icon(GI[g]) 로 그린다.
export const grade = { PERFECT: 'target', GREAT: 'star', GOOD: 'circle', AUTO: 'circle' };

// 목표 사다리 — 장부 행(ledger row). 좌측 24px 아이콘(챕터 엠블럼은 img), 우측 보상은 Mono.
export function goalsHtml(goals) {
  if (!goals.length) return '';
  // 보상 문자열에 남아 있을 수 있는 별가루 기호(U+2728)는 dust 아이콘으로 치환한다 — UI 크롬 이모지 금지
  const reward = (s) => esc(s).replace(/\u2728\s*/g, `${icon('dust', { size: 12 })} `);
  return `<div class="goals ledger">${goals.map((g, i) => `<div class="goal ledger-row stagger" style="--i:${i}"><span class="gi">${g.img ? `<img src="${g.img}" alt=""/>` : icon(g.icon, { size: 24 })}</span><div class="grow"><b>${esc(g.text)}</b><div class="progress sm"><i style="width:${Math.round(g.pct * 100)}%"></i></div><small>${esc(g.remain)} 남음 · 보상 <span class="mono reward">${reward(g.reward)}</span></small></div></div>`).join('')}</div>`;
}
