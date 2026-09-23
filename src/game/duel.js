// 추억 대결: 두 추억의 스탯을 3라운드로 비교. 연출 중심, 결과는 별가루/성장 포인트.
import { WONDERS } from '../data/wonders.js';
import { state, save } from './state.js';
const G = { PERFECT: 30, GREAT: 15, GOOD: 5, AUTO: 0 };
export function statsOf(m) {
  const w = WONDERS[m.label] ?? { rarity: 1 };
  const 신비 = w.rarity * 20 + (m.variant ? 25 : 0);
  const 타이밍 = 20 + (G[m.grade] ?? 0) + Math.round((m.conf ?? 0.8) * 20);
  const 성장 = 10 + (m.stage ?? 0) * 15 + (m.caption ? 8 : 0) + Math.min(3, m.recalls ?? 0) * 4 + Math.min(2, m.shares ?? 0) * 5;
  return { 신비, 타이밍, 성장, total: 신비 + 타이밍 + 성장 };
}
/** 그림자 추억: 같은 원더의 "다른 세계 버전" — 내 스탯 ±15% */
export function shadowOf(m, seed = Date.now()) {
  const r = (n) => { const x = Math.sin(seed + n) * 10000; return x - Math.floor(x); };
  return { id: 'shadow', label: m.label, grade: ['AUTO', 'GOOD', 'GREAT', 'PERFECT'][Math.floor(r(1) * 4)], variant: r(2) < 0.2, stage: Math.min(3, Math.max(0, (m.stage ?? 0) + Math.round(r(3) * 2 - 1))), caption: r(4) < 0.5 ? '…' : '', recalls: Math.floor(r(5) * 3), shares: 0, conf: 0.6 + r(6) * 0.4, shadow: true, name: '그림자 ' + (WONDERS[m.label]?.name ?? '') };
}
/** 3라운드 시뮬레이션: 각 라운드 스탯 + 주사위(0~20). 결정적 결과 배열 리턴 */
export function simulate(a, b, seed = Date.now()) {
  const sa = statsOf(a), sb = statsOf(b); const keys = ['신비', '타이밍', '성장']; const r = (n) => { const x = Math.sin(seed * 0.001 + n * 7.3) * 10000; return x - Math.floor(x); };
  let hpA = 100, hpB = 100; const rounds = keys.map((k, i) => { const va = sa[k] + Math.floor(r(i) * 21), vb = sb[k] + Math.floor(r(i + 10) * 21); const dmg = Math.min(45, Math.abs(va - vb) + 12); if (va >= vb) hpB = Math.max(0, hpB - dmg); else hpA = Math.max(0, hpA - dmg); return { key: k, va, vb, winner: va >= vb ? 'a' : 'b', dmg, hpA, hpB }; });
  const winner = hpA === hpB ? (sa.total >= sb.total ? 'a' : 'b') : hpA > hpB ? 'a' : 'b';
  return { sa, sb, rounds, winner };
}
export function rewardDuel(won, opponentShadow) {
  const dust = won ? (opponentShadow ? 40 : 60) : 10; state.dust += dust; state.stats.duels = (state.stats.duels || 0) + 1; if (won) state.stats.duelWins = (state.stats.duelWins || 0) + 1; save(); return dust;
}
