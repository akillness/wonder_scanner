// 한/영 전환 (v8.4). 소스의 한국어 문자열·로직 키는 그대로 두고, 영어 모드일 때만 사전(en.js, 지연 로드)으로
// "보이는 것"만 바꾼다: DOM 텍스트·속성(title/aria-label/alt/placeholder) · 캔버스 글자(fillText/strokeText/measureText)
// · confirm/alert/prompt · 공유/클립보드 텍스트 · 문서 제목. JS 값은 건드리지 않으므로 게임 로직·저장 데이터는 언어와 무관하다.
// 외부·사용자 데이터(장소명·캡션·탐험가 이름)는 translate="no" 로 표시해 번역에서 제외한다.
const KEY = 'wonder-scanner:lang';
const H = /[가-힣]/;
const ATTRS = ['title', 'aria-label', 'alt', 'placeholder'];
export const LANGS = ['ko', 'en'];

let lang = 'ko', dict = null, subRe = null, subMap = null;
const cache = new Map();

/** 저장된 선택 → ?lang= → 브라우저 언어(ko* 면 한국어, 아니면 영어) */
export function detectLang() {
  try { const q = new URLSearchParams(location.search).get('lang'); if (q === 'ko' || q === 'en') { localStorage.setItem(KEY, q); return q; } } catch {}
  try { const s = localStorage.getItem(KEY); if (s === 'ko' || s === 'en') return s; } catch {}
  const n = String(globalThis.navigator?.languages?.[0] || globalThis.navigator?.language || 'ko').toLowerCase();
  return n.startsWith('ko') ? 'ko' : 'en';
}
export const getLang = () => lang;
/** 언어를 저장하고 다시 불러온다 (모든 화면·캔버스 캐시를 한 번에 일관되게 바꾸는 가장 단순한 방법) */
export function setLang(l) {
  if (!LANGS.includes(l)) return;
  try { localStorage.setItem(KEY, l); } catch {}
  if (l === lang) return;
  try { const u = new URL(location.href); u.searchParams.delete('lang'); location.replace(u.toString()); } catch { location.reload(); }
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function buildIndex(d) {
  subMap = new Map();
  for (const [k, v] of Object.entries(d)) {
    if (typeof v !== 'string') continue;
    const hangul = (k.match(/[가-힣]/g) || []).length;
    if (hangul < 2) continue; // 조사 한 글자(을·를·의…)는 부분 치환하지 않는다 — 장소명 등을 망가뜨린다
    subMap.set(k, v);
    const t = k.trim(); if (t !== k && !subMap.has(t)) subMap.set(t, v.trim());
  }
  const keys = [...subMap.keys()].sort((a, b) => b.length - a.length);
  subRe = keys.length ? new RegExp(keys.map(esc).join('|'), 'g') : null;
}

// 숫자 뒤 단위어: "3개" → "3" · "2회" → "2×" · "15분" → "15m" … (한 글자라 부분 치환에서 빠지므로 숫자에 붙은 경우만)
const COUNTERS = [[/(\d)\s*시간/g, '$1h'], [/(\d)\s*분/g, '$1m'], [/(\d)\s*초/g, '$1s'], [/(\d)\s*일(?![가-힣])/g, '$1d'], [/(\d)\s*개(?![가-힣])/g, '$1'],
  [/(\d)\s*회(?![가-힣])/g, '$1×'], [/(\d)\s*번(?![가-힣])/g, '$1×'], [/(\d)\s*장(?![가-힣])/g, '$1 photos'], [/(\d)\s*종(?![가-힣])/g, '$1 types'], [/(\d)\s*명(?![가-힣])/g, '$1']];
/** 마지막 패스: 숫자 단위어 → 남은 한글 덩어리 중 사전에 통째로 있는 단어(한 글자 포함)만 치환 */
function finishPass(s) {
  let out = s;
  for (const [re, rep] of COUNTERS) out = out.replace(re, rep);
  if (!H.test(out)) return out;
  return out.replace(/[가-힣]+/g, (run, i, all) => {
    const v = Object.prototype.hasOwnProperty.call(dict, run) ? dict[run] : null;
    if (typeof v !== 'string') return run;
    return /\s$/.test(all.slice(0, i)) || i === 0 ? v.replace(/^\s+/, '') : v;
  });
}

/** 테스트·도구용: 사전을 직접 주입하고 언어를 정한다 (DOM 훅은 걸지 않음) */
export function useDictionary(d, l = 'en') { dict = d; lang = l; cache.clear(); buildIndex(d || {}); }

/** 문자열 번역: 정확히 일치 → 앞뒤 공백 보존 일치 → 긴 조각부터 부분 치환(템플릿 사이에 끼인 값은 그대로) */
export function tr(s) {
  if (lang !== 'en' || !dict || typeof s !== 'string' || !H.test(s)) return s;
  const hit = cache.get(s); if (hit !== undefined) return hit;
  let out;
  if (Object.prototype.hasOwnProperty.call(dict, s)) out = dict[s];
  else {
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const core = m[2];
    if (core && Object.prototype.hasOwnProperty.call(dict, core)) out = m[1] + dict[core] + m[3];
    else out = subRe ? s.replace(subRe, (k) => subMap.get(k) ?? k) : s;
    if (H.test(out)) out = finishPass(out);
  }
  if (cache.size > 6000) cache.clear();
  cache.set(s, out);
  return out;
}

// ── DOM
const skipEl = (el) => !!el?.closest?.('[translate="no"],.notranslate,script,style,textarea');
function trAttrs(el) {
  for (const a of ATTRS) { const v = el.getAttribute?.(a); if (v && H.test(v)) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } }
}
function trText(n) { const v = n.nodeValue; if (v && H.test(v) && !skipEl(n.parentElement)) { const t = tr(v); if (t !== v) n.nodeValue = t; } }
export function translateTree(root) {
  if (lang !== 'en' || !root) return;
  if (root.nodeType === 3) return trText(root);
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1) { if (skipEl(root)) return; trAttrs(root); }
  const w = document.createTreeWalker(root, 1 | 4, { acceptNode: (n) => n.nodeType === 1 && (n.getAttribute('translate') === 'no' || n.classList?.contains('notranslate') || n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.tagName === 'TEXTAREA') ? 2 : 1 });
  let n; while ((n = w.nextNode())) { if (n.nodeType === 3) trText(n); else trAttrs(n); }
}

function hookCanvas() {
  for (const C of [globalThis.CanvasRenderingContext2D, globalThis.OffscreenCanvasRenderingContext2D]) {
    const P = C?.prototype; if (!P || P.__i18n) continue; P.__i18n = true;
    for (const m of ['fillText', 'strokeText', 'measureText']) {
      const o = P[m]; if (typeof o !== 'function') continue;
      P[m] = function (t, ...a) { return o.call(this, typeof t === 'string' ? tr(t) : t, ...a); };
    }
  }
}
function hookDialogs() {
  for (const m of ['alert', 'confirm', 'prompt']) {
    const o = globalThis[m]; if (typeof o !== 'function') continue;
    globalThis[m] = function (msg, ...a) { return o.call(this, typeof msg === 'string' ? tr(msg) : msg, ...a); };
  }
  const nav = globalThis.navigator;
  if (nav && typeof nav.share === 'function') {
    const o = nav.share.bind(nav);
    try { nav.share = (d = {}) => o({ ...d, ...(typeof d.title === 'string' ? { title: tr(d.title) } : {}), ...(typeof d.text === 'string' ? { text: tr(d.text) } : {}) }); } catch {}
  }
}

/** main.js 가 첫 렌더 전에 await 한다. 한국어면 아무것도 하지 않는다(사전도 받지 않음). */
export async function initI18n() {
  lang = detectLang();
  try { document.documentElement.lang = lang; } catch {}
  if (lang !== 'en') return lang;
  try { dict = (await import('./en.js')).default; } catch (e) { console.info('[i18n] dictionary load failed', e?.name || e); lang = 'ko'; document.documentElement.lang = 'ko'; return lang; }
  buildIndex(dict);
  hookCanvas(); hookDialogs();
  try {
    document.title = 'Wonder Scanner';
    const md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', tr(md.getAttribute('content') || ''));
    for (const p of ['og:title', 'og:description']) { const m = document.querySelector(`meta[property="${p}"]`); if (m) m.setAttribute('content', tr(m.getAttribute('content') || '')); }
  } catch {}
  translateTree(document.body);
  const mo = new MutationObserver((list) => {
    for (const r of list) {
      if (r.type === 'characterData') trText(r.target);
      else if (r.type === 'attributes') { if (!skipEl(r.target)) trAttrs(r.target); }
      else for (const n of r.addedNodes) translateTree(n);
    }
  });
  mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  return lang;
}
