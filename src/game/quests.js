import { CHAPTERS } from '../data/chapters.js';
import { state, save, todayKey } from './state.js';

// 날짜 시드 난수 (같은 날 = 같은 의뢰)
function seeded(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }

const TYPES = {
  scanNew:   { text: (p) => `${p.title}에서 새 원더 ${p.goal}종 발견`, goal: () => 2, reward: { xp: 60, dust: 30 } },
  scanAny:   { text: (p) => `원더 ${p.goal}회 스캔`, goal: () => 5, reward: { xp: 50, dust: 25 } },
  rarityMin: { text: (p) => `${'✦'.repeat(p.min)} 이상 원더 ${p.goal}종 포획`, goal: () => 1, reward: { xp: 80, dust: 40 } },
  spirits:   { text: (p) => `정령 ${p.goal}마리 포획`, goal: () => 8, reward: { xp: 60, dust: 30 } },
  perfect:   { text: (p) => `퍼펙트 포획 ${p.goal}회`, goal: () => 2, reward: { xp: 90, dust: 30 } },
  great:     { text: (p) => `그레이트 이상 포획 ${p.goal}회`, goal: () => 3, reward: { xp: 60, dust: 20 } },
};

export function ensureDailyQuests() {
  const today = todayKey();
  if (state.quests.date === today && state.quests.items.length) return state.quests.items;
  const rng = seeded(today);
  const ch = CHAPTERS[Math.floor(rng() * CHAPTERS.length)];
  const pool = ['scanAny', 'spirits', rng() < 0.5 ? 'perfect' : 'great', 'rarityMin'];
  const picks = ['scanNew', ...pool.sort(() => rng() - 0.5).slice(0, 2)];
  state.quests = {
    date: today,
    items: picks.map((type, i) => {
      const params = type === 'scanNew' ? { chapter: ch.id, icon: ch.icon, title: ch.title } : type === 'rarityMin' ? { min: 2 } : {};
      const goal = TYPES[type].goal();
      const reward = i === 2 ? { ...TYPES[type].reward, prism: 1 } : TYPES[type].reward; // 3번째 의뢰 = 프리즘 토큰
      return { id: `${today}-${i}`, type, params: { ...params, goal }, goal, progress: 0, done: false, reward };
    }),
  };
  save();
  return state.quests.items;
}

export function questText(q) { return TYPES[q.type].text(q.params); }

/** 이벤트를 의뢰 진행도에 반영. 새로 완료된 의뢰 배열 리턴(보상은 즉시 지급) */
export function questEvent(ev) {
  ensureDailyQuests();
  const done = [];
  for (const q of state.quests.items) {
    if (q.done) continue;
    let inc = 0;
    switch (q.type) {
      case 'scanNew':   inc = ev.type === 'discover' && ev.isNew && ev.chapter === q.params.chapter ? 1 : 0; break;
      case 'scanAny':   inc = ev.type === 'discover' ? 1 : 0; break;
      case 'rarityMin': inc = ev.type === 'discover' && ev.rarity >= q.params.min ? 1 : 0; break;
      case 'spirits':   inc = ev.type === 'spirit' ? 1 : 0; break;
      case 'perfect':   inc = ev.type === 'discover' && ev.grade === 'PERFECT' ? 1 : 0; break;
      case 'great':     inc = ev.type === 'discover' && (ev.grade === 'PERFECT' || ev.grade === 'GREAT') ? 1 : 0; break;
    }
    if (!inc) continue;
    q.progress = Math.min(q.goal, q.progress + inc);
    if (q.progress >= q.goal) {
      q.done = true; state.xp += q.reward.xp; state.dust += q.reward.dust;
      if (q.reward.prism) state.prismTokens += q.reward.prism;
      done.push(q);
    }
  }
  if (done.length) save();
  return done;
}
export function questSummary() { const items = ensureDailyQuests(); return { done: items.filter(q => q.done).length, total: items.length }; }
