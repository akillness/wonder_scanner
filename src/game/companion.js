// 루페 지능화: 상태를 읽어 조언을 고르고(우선순위 규칙), 하루 단위 "사건"을 만든다.
// icon 필드는 이모지가 아니라 src/ui/icons.js 의 아이콘 이름이다 (렌더 측에서 icon(name) 으로 그린다).
import { state, save, todayKey, ownedCount, closestChapter, chapterProgress } from './state.js';
import { CHAPTERS } from '../data/chapters.js';
import { WONDERS } from '../data/wonders.js';
import { nextMilestone } from './economy.js';
import { activeGimmick, gimmickMod, gimmickRemainingMs, remainLabel } from './spots.js';
import { hasIcon } from '../ui/icons.js';

const PIN = hasIcon('pin') ? 'pin' : 'globe';

const hour = () => new Date().getHours();
const seeded = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; };

/** 상황별 조언 — 위에서부터 첫 매치 (긴급 > 결정 지원 > 힌트 > 잡담) */
export function advise(ctx = {}) {
  const c = closestChapter(), nm = nextMilestone(), ev = activeEvent(), gim = safeGimmick();
  const rules = [
    [() => ev && !ev.seen, () => ({ icon: 'event', text: `사건 발생! ${ev.title} — ${ev.desc}`, action: 'event' })],
    // 위치 기믹 (GAMEPLAY_V7 §7.3): 사건 다음 순위. 스팟 화면에서는 이미 배너가 있으니 건너뛴다.
    [() => gim && ctx.screen !== 'spots', () => ({ icon: PIN, text: `기믹 「${gim.title}」 진행 중 — ${gim.desc}. ${remainLabel(gimmickRemainingMs())} 남았어${gim.spotName ? `, ${gim.spotName} 근처야` : ''}.`, action: 'spots' })],
    [() => state.prismTokens > 0 && ctx.screen === 'scan' && !ctx.armed, () => ({ icon: 'prism', text: `프리즘 토큰이 ${state.prismTokens}개 있어. 희귀한 게 보이면 장착해서 변이체로 만들자.`, action: 'arm' })],
    [() => state.boost > 0 && ctx.screen === 'scan', () => ({ icon: 'boost', text: '공명 부스트가 걸려 있어. 이번엔 두 배로 빨리 찰 거야.' })],
    [() => state.dust >= 320 && state.prismTokens === 0, () => ({ icon: 'shop', text: `별가루가 ${state.dust}이나 쌓였어. 상점에서 프리즘 토큰을 사 두는 건 어때?`, action: 'shop' })],
    [() => nm && nm.at - ownedCount() <= 2, () => ({ icon: 'gift', text: `보물상자 「${nm.title}」까지 ${nm.at - ownedCount()}종! 코앞이야.`, action: 'codex' })],
    [() => c.missing.length && c.remain <= 3, () => ({ icon: c.chapter.icon, text: `${c.chapter.title}는 ${c.remain}개만 더 찍으면 이야기가 열려. ${c.missing.slice(0, 2).join(', ')} 어딨는지 알아?`, action: 'codex' })],
    [() => ctx.uncaptioned > 0, () => ({ icon: 'quill', text: `캡션이 없는 추억이 ${ctx.uncaptioned}장 있어. 한 줄만 적어도 자라기 시작해.`, action: 'album' })],
    [() => state.quests.items.some(q => !q.done && q.type === 'spirits') && ctx.screen === 'scan', () => ({ icon: 'fragment', text: '정령 의뢰가 남았어. 폰을 천천히 돌려 봐, 시야 밖에 숨어 있을지도.' })],
    [() => hour() >= 22 || hour() < 5, () => ({ icon: 'moon', text: '밤이네. 조명이 어두우면 인식이 흔들려 — 램프 하나만 켜 줘.' })],
    [() => hour() >= 11 && hour() <= 13, () => ({ icon: 'ch-kitchen', text: '점심시간! 부엌·식탁 원더 21종이 지금 가장 잘 보일 때야.' })],
    [() => state.streak.days >= 3, () => ({ icon: 'flame', text: `${state.streak.days}일 연속이라 XP ×${(1 + Math.min(state.streak.days - 1, 5) * 0.1).toFixed(1)}. 오늘 전설을 노려볼까?` })],
    [() => true, () => ({ icon: 'lens', text: ['세상은 원더로 가득한데, 사람들은 그냥 "컵"이라고 불러.', '가만히 들고 있는 게 요령이야. 손이 아니라 눈으로 잡는 거지.', '난 렌즈 속에 살아. 네가 보는 걸 나도 봐.'][Math.floor(Math.random() * 3)] })],
  ];
  for (const [when, make] of rules) { try { if (when()) return make(); } catch {} }
  return { icon: 'lens', text: '…' };
}

/** 하루 사건: 날짜 시드로 1개, 시작 시간대에 걸리면 활성 */
export const EVENTS = [
  { id: 'storm',  title: '원더 폭풍',   desc: (p) => `${p.chapterTitle} 원더 별가루 2배 (오늘 밤까지)`, mod: { dustMulChapter: 2 } },
  { id: 'tide',   title: '정령 대이동', desc: () => '정령이 2배로 출몰 (오늘 밤까지)', mod: { spiritMul: 2 } },
  { id: 'lens',   title: '맑은 렌즈',   desc: () => '공명 속도 +50% (오늘 밤까지)', mod: { fillMul: 1.5 } },
  { id: 'errand', title: '루페의 부탁', desc: (p) => `${p.label}을(를) 찍어 와 줘 — 보상 별가루 120 · 프리즘 1`, mod: { errand: true } },
  { id: 'shadow', title: '그림자 도전장', desc: () => '그림자 추억이 대결을 걸어왔어 — 앨범에서 대결 승리 시 별가루 150', mod: { duelBonus: 150 } },
];
export function activeEvent() {
  const today = todayKey();
  if (state.event?.date === today) return state.event;
  const rng = seeded(today + ':event'); const ev = EVENTS[Math.floor(rng() * EVENTS.length)];
  const ch = CHAPTERS[Math.floor(rng() * CHAPTERS.length)]; const labels = Object.keys(WONDERS).filter(l => WONDERS[l].chapter === ch.id); const label = labels[Math.floor(rng() * labels.length)];
  const params = { chapter: ch.id, chapterTitle: ch.title, label, emoji: WONDERS[label].emoji };
  state.event = { date: today, id: ev.id, title: ev.title, desc: ev.desc(params), params, mod: ev.mod, seen: false, done: false }; save();
  return state.event;
}
export function markEventSeen() { const e = activeEvent(); if (!e.seen) { e.seen = true; save(); } }
/** 사건 보정치 조회 — 기존 사건 배율 × 위치 기믹 배율(spots.gimmickMod). 사건 로직은 불변, 곱만 추가. */
export function eventMod(key, ctx = {}) {
  return baseEventMod(key, ctx) * safeGimmickMod(key, ctx);
}
function baseEventMod(key, ctx = {}) {
  const e = activeEvent(); if (!e || e.done) return 1;
  if (key === 'dust' && e.mod.dustMulChapter && ctx.chapter === e.params.chapter) return e.mod.dustMulChapter;
  if (key === 'spirit' && e.mod.spiritMul) return e.mod.spiritMul;
  if (key === 'fill' && e.mod.fillMul) return e.mod.fillMul;
  return 1;
}
function safeGimmickMod(key, ctx) { try { const m = Number(gimmickMod(key, ctx)); return Number.isFinite(m) && m > 0 ? m : 1; } catch { return 1; } }
function safeGimmick() { try { return activeGimmick(); } catch { return null; } }
/** 발견 시 부탁/사건 완료 판정 → 보상 리턴 */
export function onDiscoverEvent(label) {
  const e = activeEvent(); if (!e || e.done) return null;
  if (e.mod.errand && e.params.label === label) { e.done = true; state.dust += 120; state.prismTokens += 1; save(); return { title: e.title, text: '부탁 완료! 별가루 120 · 프리즘 토큰 1' }; }
  return null;
}
export function onDuelWin() { const e = activeEvent(); if (e?.mod.duelBonus && !e.done) { e.done = true; state.dust += e.mod.duelBonus; save(); return e.mod.duelBonus; } return 0; }
