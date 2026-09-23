import { state, save, todayKey } from './state.js';
import { listMoments, getMoment, updateMoment } from './media.js';

// 추억 진화: 씨앗 → 새싹 → 만개 → 별. 다듬기(캡션·필터), 회상, 공유, 재방문, 시간이 성장 포인트가 된다.
export const STAGES = [
  { id: 0, icon: '🌱', name: '씨앗', min: 0, reward: null },
  { id: 1, icon: '🌿', name: '새싹', min: 1, reward: { dust: 20, xp: 10 } },
  { id: 2, icon: '🌸', name: '만개', min: 3, reward: { dust: 40, xp: 25 } },
  { id: 3, icon: '⭐', name: '별',   min: 5, reward: { dust: 80, xp: 60 } },
];
export const FILTERS = [
  { id: 'none', name: '원본', css: 'none' },
  { id: 'warm', name: '노을', css: 'sepia(.35) saturate(1.3) contrast(1.05)' },
  { id: 'cool', name: '새벽', css: 'hue-rotate(-15deg) saturate(1.1) brightness(1.05)' },
  { id: 'mono', name: '기억', css: 'grayscale(.85) contrast(1.15)' },
  { id: 'dream', name: '꿈결', css: 'saturate(1.5) blur(.4px) brightness(1.08)' },
];
export const filterCss = (id) => FILTERS.find(f => f.id === id)?.css ?? 'none';

export function pointsFor(m) {
  const revisits = state.codex[m.label]?.count ?? 1, ageDays = (Date.now() - m.ts) / 86400000;
  return (m.caption ? 1 : 0) + Math.min(3, m.recalls || 0) + Math.min(2, m.shares || 0) + (revisits >= 3 ? 1 : 0) + (ageDays >= 7 ? 1 : 0) + (m.filter && m.filter !== 'none' ? 1 : 0) + ((m.skills?.length || 0) >= 1 ? 1 : 0) + ((m.skills?.length || 0) >= 3 ? 1 : 0);
}
export function stageFor(m) { const p = pointsFor(m); return [...STAGES].reverse().find(s => p >= s.min) ?? STAGES[0]; }

/** 변화 적용 후 진화 판정. 단계가 올랐으면 보상 지급하고 { stage, leveled } 리턴 */
export async function touchMoment(id, patch) {
  const m = await getMoment(id); if (!m) return null;
  const before = m.stage ?? 0; Object.assign(m, patch); const st = stageFor(m); m.stage = st.id; m.lastTouched = Date.now();
  await updateMoment(m);
  let leveled = null;
  if (st.id > before) { leveled = st; if (st.reward) { state.dust += st.reward.dust; state.xp += st.reward.xp; } state.stats.evolved = (state.stats.evolved || 0) + 1; save(); }
  return { m, stage: st, leveled };
}
export const refine = (id, { caption, filter, frame }) => touchMoment(id, { caption: caption?.slice(0, 60), filter, frame });
export const markShared = (id) => getMoment(id).then(m => m && touchMoment(id, { shares: (m.shares || 0) + 1 }));

/** 오늘의 회상 후보: 오늘 회상하지 않은 가장 오래된(그리고 덜 자란) 추억 */
export async function recallCandidate() {
  if (state.lastRecallDate === todayKey()) return null;
  const ms = (await listMoments()).filter(m => !m.friend && (m.lastRecallDate !== todayKey()));
  if (!ms.length) return null;
  ms.sort((a, b) => (a.stage ?? 0) - (b.stage ?? 0) || a.ts - b.ts);
  return ms[0];
}
export async function recall(id) {
  const m = await getMoment(id); if (!m) return null;
  state.lastRecallDate = todayKey(); state.dust += 10; state.stats.recalls = (state.stats.recalls || 0) + 1; save();
  return touchMoment(id, { recalls: (m.recalls || 0) + 1, lastRecallDate: todayKey() });
}
export const daysAgo = (ts) => { const d = Math.floor((Date.now() - ts) / 86400000); return d === 0 ? '오늘' : d === 1 ? '어제' : `${d}일 전`; };
