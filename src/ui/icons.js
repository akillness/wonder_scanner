// src/ui/icons.js — Wonder Scanner inline icon set (DESIGN.md §8 "아이콘 세트" / §9.2)
//
// 24×24 engraved single-line icons (Lucide-like simplicity). Every glyph is colorless and
// inherits `currentColor`; only deliberate solid dots use fill="currentColor" stroke="none".
// Usage: icon('camera') → '<svg class="ic" …>…</svg>' (see icon() below).

export const ICONS = {
  // ── navigation / chrome ───────────────────────────────────────────────
  camera: '<path d="M9.2 4h5.6l1.6 2.5H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h2.6z"/><circle cx="12" cy="13" r="3.6"/>',
  codex: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/><path d="M9.5 8h5.5M9.5 11.5h4"/>',
  album: '<rect x="3" y="7" width="14" height="13" rx="2"/><path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/><path d="M3.5 17l4-4 3 3 2.5-2.5 4 4"/><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none"/>',
  quest: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 13.5l2 2 4-4.5"/>',
  profile: '<circle cx="12" cy="12" r="9"/><path d="M15.8 8.2l-2.2 5.4-5.4 2.2 2.2-5.4z"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  shop: '<path d="M4 9.5L5.5 5h13L20 9.5"/><path d="M4 9.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M5 12.5V20h14v-7.5"/><path d="M10 20v-5h4v5"/>',
  gear: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
  flip: '<path d="M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v4h-4"/><path d="M20 12a8 8 0 0 1-14 5.3"/><path d="M6 21v-4h4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="M3.5 17.5l5-5 4 4 3-3 5 5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><ellipse cx="12" cy="12" rx="3.8" ry="9"/>',
  duel: '<path d="M4.5 4.5l12 12M14 19l5-5M17.5 17.5l2.5 2.5"/><path d="M19.5 4.5l-12 12M10 19l-5-5M6.5 17.5L4 20"/>',

  // ── currencies / resources / status ───────────────────────────────────
  dust: '<path d="M9.5 3.5l1.7 4.3 4.3 1.7-4.3 1.7-1.7 4.3-1.7-4.3-4.3-1.7 4.3-1.7z"/><path d="M17.5 12.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z"/><circle cx="7" cy="19" r="1.2" fill="currentColor" stroke="none"/>',
  prism: '<path d="M12 4l8.5 15.5h-17z"/><path d="M2.5 11l4.4 2.2"/><path d="M17.1 13.2l4.4-2.2M17.1 13.2H22M17.1 13.2l4.4 2.2"/>',
  flame: '<path d="M12 21.5c-4 0-6.5-2.7-6.5-6.3 0-2.9 1.9-4.9 3.4-7 .4 1.4 1.1 2.4 2.1 3C11 8.3 12.4 5.4 15 3c.3 3.4 3.5 5.6 3.5 10 0 4.9-2.7 8.5-6.5 8.5z"/>',
  fragment: '<path d="M12 3l8 9-8 9-8-9z"/><path d="M6.3 9.5h11.4"/>',
  boost: '<path d="M13.5 2.5L5 13.5h6.5L10.5 21.5 19 10.5h-6.5z"/>',
  event: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M12 11.5l1.1 2.4 2.4 1.1-2.4 1.1-1.1 2.4-1.1-2.4-2.4-1.1 2.4-1.1z" fill="currentColor" stroke="none"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
  cloud: '<path d="M7 18.5h10a4 4 0 0 0 0-8A5.5 5.5 0 0 0 6.5 9.5 4.5 4.5 0 0 0 7 18.5z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/><circle cx="12" cy="16" r="1.1" fill="currentColor" stroke="none"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  heart: '<path d="M12 20.5l-6.8-6.6a4.8 4.8 0 1 1 6.5-6.7l.3.3.3-.3a4.8 4.8 0 1 1 6.5 6.7z"/>',
  'heart-off': '<path d="M12 20.5l-6.8-6.6a4.8 4.8 0 1 1 6.5-6.7l.3.3.3-.3a4.8 4.8 0 1 1 6.5 6.7z"/><path d="M4 4l16 16"/>',
  gift: '<path d="M4 8.5h16v4H4z"/><path d="M5.5 12.5V20h13v-7.5"/><path d="M12 8.5V20"/><path d="M12 8.5C10 4.5 6 4.5 6.6 6.9 7.2 8.5 10 8.5 12 8.5zm0 0c2-4 6-4 5.4-1.6C16.8 8.5 14 8.5 12 8.5z"/>',
  medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.7 10.6L6.5 3h11l-2.2 7.6"/><path d="M12 3v7"/><path d="M12 12.5l.8 1.6 1.7.3-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.3z" fill="currentColor" stroke="none"/>',
  chest: '<path d="M3.5 11V9.5A3.5 3.5 0 0 1 7 6h10a3.5 3.5 0 0 1 3.5 3.5V11"/><path d="M3.5 11h17v8a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"/><path d="M10 11v2.5h4V11"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7"/><path d="M6.5 7l.8 12.6a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9L17.5 7"/><path d="M10 11v6M14 11v6"/>',
  quill: '<path d="M20 4c-1 6-4 10.5-9.5 13H6c1.5-6.5 6-11.5 14-13z"/><path d="M20 4C14 8 9 13 4 20"/>',
  lamp: '<path d="M8.5 14.5a6 6 0 1 1 7 0c-.7.7-1 1.5-1 2.5H9.5c0-1-.3-1.8-1-2.5z"/><path d="M9.5 20h5"/>',
  share: '<path d="M12 3.5v11"/><path d="M8 7.5l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  card: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><rect x="6.5" y="8" width="6" height="5" rx="1"/><path d="M15 9h2.5M15 12h2.5M6.5 16h11"/>',
  film: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M7.5 4.5v15M16.5 4.5v15M3.5 8.5h4M3.5 12h4M3.5 15.5h4M16.5 8.5h4M16.5 12h4M16.5 15.5h4"/><path d="M10.5 9.5v5l4-2.5z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5.5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5v1"/>',
  collage: '<rect x="3.5" y="3.5" width="7" height="10" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="6" rx="1.5"/><rect x="13.5" y="12.5" width="7" height="8" rx="1.5"/><rect x="3.5" y="16.5" width="7" height="4" rx="1.5"/>',
  login: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M3.5 12h10.5"/><path d="M10 8l4 4-4 4"/>',
  warn: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/>',
  rec: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/>',
  ar: '<circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(-25 12 12)"/><circle cx="20.6" cy="9.5" r="1.2" fill="currentColor" stroke="none"/>',
  moon: '<path d="M13 3.5a7.5 7.5 0 0 0 7.5 9.5A8.5 8.5 0 1 1 13 3.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',

  // ── world / rarity / growth ───────────────────────────────────────────
  scope: '<path d="M4.4 13L15.9 5.1 18.1 8.9 5.6 15z"/><path d="M15.9 5.1l1.7-1 2.2 3.8-1.7 1"/><path d="M11.3 12.3l-3 8.7M11.3 12.3l3.5 8.2"/>',
  cosmos: '<circle cx="12" cy="12" r="4.5"/><ellipse cx="12" cy="12" rx="10" ry="3.2" transform="rotate(-20 12 12)"/><circle cx="4.5" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="19.5" cy="19.5" r=".8" fill="currentColor" stroke="none"/>',
  crown: '<path d="M3.5 7.5l4.5 4L12 4l4 7.5 4.5-4-2 10.5h-13z"/><path d="M5 15.5h14"/>',
  star: '<path d="M12 3.5l2.35 5.76 6.21.46-4.76 4.02 1.49 6.04L12 16.5l-5.29 3.28 1.49-6.04-4.76-4.02 6.21-.46z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  miss: '<circle cx="12" cy="12" r="9"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/>',
  repeat: '<path d="M17 3l3 3-3 3"/><path d="M4 12V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 12v3a3 3 0 0 1-3 3H4"/>',
  frame: '<path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3"/>',
  seed: '<ellipse cx="12" cy="12.5" rx="5.5" ry="8" transform="rotate(-22 12 12.5)"/><path d="M9.8 18.2c-1-4 .8-8.6 4.4-11.5"/>',
  sprout: '<path d="M12 21v-8"/><path d="M12 13c0-4 2.5-6.5 7-6.5 0 4.5-2.5 6.5-7 6.5z"/><path d="M12 16c0-3-2-5-5.5-5 0 3.5 2 5 5.5 5z"/>',
  bloom: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.5c-2.2-1.2-2.2-5.5 0-6.5 2.2 1 2.2 5.3 0 6.5z"/><path d="M12 9.5c-2.2-1.2-2.2-5.5 0-6.5 2.2 1 2.2 5.3 0 6.5z" transform="rotate(72 12 12)"/><path d="M12 9.5c-2.2-1.2-2.2-5.5 0-6.5 2.2 1 2.2 5.3 0 6.5z" transform="rotate(144 12 12)"/><path d="M12 9.5c-2.2-1.2-2.2-5.5 0-6.5 2.2 1 2.2 5.3 0 6.5z" transform="rotate(216 12 12)"/><path d="M12 9.5c-2.2-1.2-2.2-5.5 0-6.5 2.2 1 2.2 5.3 0 6.5z" transform="rotate(288 12 12)"/>',
  sigil: '<path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"/>',
  lens: '<circle cx="10.5" cy="10" r="6.5"/><path d="M7.5 8.2a3.6 3.6 0 0 1 2.2-2.4"/><path d="M15.1 14.6l.9 1"/><circle cx="17.1" cy="16.9" r="1.4"/><circle cx="19.7" cy="19.7" r="1.4"/>',
  key: '<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8L20 3"/><path d="M17 6l3 3M14.5 8.5l2 2"/>',

  // ── chapter emblems (compact) ─────────────────────────────────────────
  'ch-desk': '<rect x="3.5" y="4.5" width="17" height="12" rx="1.5"/><path d="M9 20.5h6M12 16.5v4"/><circle cx="12" cy="10.5" r="2"/><ellipse cx="12" cy="10.5" rx="5" ry="1.6" transform="rotate(-25 12 10.5)"/>',
  'ch-kitchen': '<path d="M5 11h14v6a3.5 3.5 0 0 1-3.5 3.5h-7A3.5 3.5 0 0 1 5 17z"/><path d="M3 11h18"/><circle cx="9" cy="6.5" r="1.4"/><circle cx="14" cy="4" r="1.1"/><circle cx="15.5" cy="7.8" r=".9" fill="currentColor" stroke="none"/>',
  'ch-home': '<circle cx="7" cy="16.5" r="3.5"/><path d="M9.5 14l7-7M15 8.5l2 2M13 10.5l1.5 1.5"/><path d="M18 3v2M21.5 6.5h-2M20.5 4l-1.4 1.4"/>',
  'ch-street': '<path d="M7 21V9M4.5 4.5h5"/><circle cx="7" cy="7" r="2.2" fill="currentColor" stroke="none"/><path d="M12 21V9h8v12"/><path d="M15 12h2M15 15h2M15 18h2"/><path d="M3 21h18"/>',
  'ch-living': '<ellipse cx="8.5" cy="17.5" rx="3.2" ry="2.6"/><circle cx="4.3" cy="13.2" r="1.3" fill="currentColor" stroke="none"/><circle cx="8.5" cy="11.6" r="1.3" fill="currentColor" stroke="none"/><circle cx="12.7" cy="13.2" r="1.3" fill="currentColor" stroke="none"/><path d="M14.5 11c0-4.5 3-7.5 7-7.5 0 4.5-2.5 7.5-7 7.5z"/><path d="M14.5 11l4.5-4.5"/>',
  'ch-play': '<path d="M12 3l7 7-7 9-7-9z"/><path d="M12 3v16M5 10h14"/><path d="M12 19c-2.5 1.5-.5 3-2.5 4"/>',

  // ── misc ──────────────────────────────────────────────────────────────
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  minus: '<path d="M5 12h14"/>',
};

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escAttr = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);

/** True when `name` is a known icon (own keys only, so prototype names never match). */
export const hasIcon = (name) => typeof name === 'string' && Object.prototype.hasOwnProperty.call(ICONS, name);

/**
 * Render an inline SVG icon string.
 * @param {string} name  key of ICONS (DESIGN.md §9.2 list)
 * @param {{size?:number, cls?:string, label?:string}} [opts]
 *   size  – rendered width/height in px (default 20; the viewBox is always 24×24)
 *   cls   – extra class names appended after the base `ic` class
 *   label – accessible name; when given the svg becomes role="img" with aria-label,
 *           otherwise it is aria-hidden (decorative, next to visible text)
 * Unknown names draw 'circle' and log console.warn('[icons] missing', name).
 */
export function icon(name, { size = 20, cls = '', label = '' } = {}) {
  let body = ICONS[name];
  if (!hasIcon(name)) { console.warn('[icons] missing', name); body = ICONS.circle; }
  const a11y = label ? ` role="img" aria-label="${escAttr(label)}"` : ' aria-hidden="true"';
  return `<svg class="ic${cls ? ' ' + cls : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"${a11y}>${body}</svg>`;
}

/** Frozen list of every icon name, for QA / skill editors. */
export const ICON_NAMES = Object.freeze(Object.keys(ICONS));

export default icon;
