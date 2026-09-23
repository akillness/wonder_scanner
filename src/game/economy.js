import { state, save, ownedCount, totalCount, rank, chapterProgress, closestChapter } from './state.js';
import { WONDERS } from '../data/wonders.js';
import { CHAPTERS } from '../data/chapters.js';
import { ACHIEVEMENTS } from './achievements.js';
import { BALANCE } from './balance.js';
import { AURAS, ownsAura } from '../ar/auras.js';

// ── 별가루 상점 (별가루의 사용처 = 경제 순환) — icon 은 src/ui/icons.js 아이콘 이름, FRAMES 색은 DESIGN.md 9.3
export const FRAMES = [
  { id: 'default', name: '기본 프레임', price: 0, colors: null },
  { id: 'aurora', name: '오로라 프레임', price: 150, colors: ['#6DB5A0', '#A493D9', '#E2B45A'] },
  { id: 'ember', name: '잔불 프레임', price: 300, colors: ['#E2B45A', '#C9713F', '#D2706A'] },
  { id: 'void', name: '공허 프레임', price: 600, colors: ['#EDE6D6', '#273244', '#0F141E'] },
];
export const SHOP = [
  { id: 'boost', icon: 'boost', name: '공명 부스트', desc: '다음 공명 2배 속도', price: 80, buy: () => { if (state.boost >= BALANCE.spirits.maxBoost) return '부스트가 이미 최대예요'; state.boost += 1; } },
  { id: 'prism', icon: 'prism', name: '프리즘 토큰', desc: '다음 포획 변이체 확정', price: 320, buy: () => { state.prismTokens += 1; } },
  { id: 'reroll', icon: 'repeat', name: '의뢰 새로고침', desc: '미완료 의뢰 1개를 다른 의뢰로', price: 60, buy: () => { const q = state.quests.items.find(q => !q.done); if (!q) return '새로고칠 의뢰가 없어요'; q.type = q.type === 'spirits' ? 'scanAny' : 'spirits'; q.goal = q.type === 'spirits' ? 8 : 5; q.params.goal = q.goal; q.progress = 0; } },
  ...FRAMES.filter(f => f.price).map(f => ({ id: `frame:${f.id}`, icon: 'frame', name: f.name, desc: '카드·앨범 프레임 스킨', price: f.price, once: true, buy: () => { state.frames.push(f.id); state.activeFrame = f.id; } })),
  // 아우라 스킨 (GAMEPLAY_V7 4.2) — 보유 판정은 state.auraSkins(없으면 ['ember']). 구매 = "바꿀 권리"; 기본 매핑으로는 미보유도 보인다
  ...Object.values(AURAS).filter(a => a.price > 0).map(a => ({ id: `aura:${a.id}`, icon: 'star', name: `${a.name} 아우라`, desc: a.desc, price: a.price, once: true, buy: () => { if (ownsAura(a.id)) return '이미 보유'; if (!Array.isArray(state.auraSkins)) state.auraSkins = ['ember']; state.auraSkins.push(a.id); } })),
];
/** once 상품 보유 여부 (frame:* → state.frames, aura:* → state.auraSkins) */
export const shopOwned = (item) => !!item?.once && (item.id.startsWith('aura:') ? ownsAura(item.id.slice(5)) : state.frames.includes(item.id.split(':')[1]));
export function buy(id) {
  const item = SHOP.find(i => i.id === id); if (!item) return { ok: false, msg: '없는 상품' };
  if (shopOwned(item)) return { ok: false, msg: '이미 보유' };
  if (state.dust < item.price) return { ok: false, msg: `별가루가 ${item.price - state.dust} 부족해요` };
  const err = item.buy(); if (err) return { ok: false, msg: err };
  state.dust -= item.price; save(); return { ok: true, item };
}

// ── 마일스톤 보물상자 (수집 수 기준)
export const MILESTONES = [
  { at: 5,  title: '첫 다섯',      reward: { dust: 60, prism: 0, xp: 40 } },
  { at: 10, title: '열 개의 문',   reward: { dust: 120, prism: 1, xp: 80 } },
  { at: 20, title: '스무 장의 지도', reward: { dust: 200, prism: 1, xp: 150 } },
  { at: 40, title: '절반의 세계',  reward: { dust: 400, prism: 2, xp: 300 } },
  { at: 60, title: '별자리 완성',  reward: { dust: 600, prism: 2, xp: 450 } },
  { at: 80, title: '원더 마스터',  reward: { dust: 1000, prism: 3, xp: 800 } },
];
/** 새로 도달한 마일스톤 지급 후 배열 리턴 */
export function claimMilestones() {
  const got = [];
  for (const m of MILESTONES) { if (ownedCount() >= m.at && !state.milestones.includes(m.at)) { state.milestones.push(m.at); state.dust += m.reward.dust; state.prismTokens += m.reward.prism; state.xp += m.reward.xp; got.push(m); } }
  if (got.length) save(); return got;
}
export function nextMilestone() { return MILESTONES.find(m => !state.milestones.includes(m.at)) ?? null; }

// ── 다음 목표 사다리 (가장 가까운 성취 4개 + 보상 미리보기)
export function goals() {
  const g = [], r = rank(), c = closestChapter(), nm = nextMilestone();
  if (r.next) g.push({ icon: 'medal', text: `다음 랭크 「${r.next.title}」`, remain: `${r.next.xp - state.xp} XP`, pct: r.progress, reward: '칭호' });
  if (c.missing.length) g.push({ icon: c.chapter.icon, text: `${c.chapter.title} 완성`, remain: `${c.remain}개`, pct: c.have / c.total, reward: `+${BALANCE.reward.chapterBonusXp} XP · 스토리`, img: `/img/ch/${c.chapter.id}.svg` });
  if (nm) g.push({ icon: 'gift', text: `보물상자 「${nm.title}」`, remain: `${nm.at - ownedCount()}종`, pct: ownedCount() / nm.at, reward: `별가루 ${nm.reward.dust}${nm.reward.prism ? ` · 프리즘 ${nm.reward.prism}` : ''}` });
  const q = state.quests.items.filter(q => !q.done)[0]; if (q) g.push({ icon: 'quest', text: '오늘의 의뢰', remain: `${q.goal - q.progress}`, pct: q.progress / q.goal, reward: `+${q.reward.xp} XP` });
  const a = ACHIEVEMENTS.find(a => !state.achievements.includes(a.id) && ['spirit20', 'perfect10', 'ten', 'forty'].includes(a.id));
  if (a) { const cur = a.id === 'spirit20' ? state.stats.spirits : a.id === 'perfect10' ? state.stats.perfects : ownedCount(); const goal = a.id === 'spirit20' ? 20 : a.id === 'perfect10' ? 10 : a.id === 'ten' ? 10 : 40; g.push({ icon: a.icon, text: `업적 「${a.title}」`, remain: `${Math.max(0, goal - cur)}`, pct: Math.min(1, cur / goal), reward: '배지' }); }
  return g.slice(0, 4);
}

// ── 콤보 (연속 PERFECT/GREAT)
export function bumpCombo(grade) { if (grade === 'PERFECT' || grade === 'GREAT') state.combo += 1; else state.combo = 0; state.stats.bestCombo = Math.max(state.stats.bestCombo || 0, state.combo); save(); return state.combo; }

// ── 선물 코드 (백엔드 없는 소셜): 원더 1종을 친구에게 "보여주기". 받는 쪽은 별가루 + 앨범의 친구 추억 + 힌트
const B64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const UNB64 = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
const sum = (s) => [...s].reduce((h, c) => (h * 33 + c.charCodeAt(0)) % 9973, 7);
export function makeGift(label, name = state.name || '탐험가') {
  const e = state.codex[label]; if (!e) return null;
  const idx = Object.keys(WONDERS).indexOf(label);
  const body = `${idx}|${e.variant ? 1 : 0}|${e.bestGrade[0]}|${Math.floor(Date.now() / 3600000)}|${name.slice(0, 12)}`;
  state.stats.giftsSent = (state.stats.giftsSent || 0) + 1; save();
  return `WS-${B64(body)}-${sum(body).toString(36)}`;
}
export function redeemGift(code) {
  try {
    const m = /^WS-([A-Za-z0-9_-]+)-([a-z0-9]+)$/.exec(code.trim()); if (!m) return { ok: false, msg: '코드 형식이 아니에요' };
    const body = UNB64(m[1]); if (sum(body).toString(36) !== m[2]) return { ok: false, msg: '손상된 코드' };
    const [idx, variant, g, hour, name] = body.split('|'); const label = Object.keys(WONDERS)[+idx]; if (!label) return { ok: false, msg: '알 수 없는 원더' };
    const key = `${label}|${hour}|${name}`; if (state.giftsReceived.includes(key)) return { ok: false, msg: '이미 받은 선물' };
    state.giftsReceived.push(key); const dust = 30 + WONDERS[label].rarity * 20; state.dust += dust; state.stats.giftsGot = (state.stats.giftsGot || 0) + 1;
    if (!state.hints.includes(label)) state.hints.push(label);
    save(); return { ok: true, label, wonder: WONDERS[label], variant: variant === '1', grade: g, name, dust };
  } catch { return { ok: false, msg: '읽을 수 없는 코드' }; }
}
