import { WONDERS } from '../data/wonders.js';
import { CHAPTERS, chapterLabels } from '../data/chapters.js';
import { BALANCE, computeReward, rankFor } from './balance.js';

const KEY = 'wonder-scanner:v1';

// 저장 스키마
// { codex: { [label]: { count, firstAt(ISO), lastAt(ISO), variant:boolean, bestConf } },
//   xp, dust, scans, completedChapters: [id], onboarded: boolean, sound: boolean }
const fresh = () => ({ codex: {}, xp: 0, dust: 0, scans: 0, completedChapters: [], onboarded: false, sound: true });

export const state = load();

function load() {
  try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return fresh(); }
}
export function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
export function resetAll() { Object.assign(state, fresh()); save(); }

export function owned(label) { return !!state.codex[label]; }
export function ownedCount() { return Object.keys(state.codex).length; }
export function totalCount() { return Object.keys(WONDERS).length; }
export function rank() { return rankFor(state.xp); }

export function chapterProgress(chapterId) {
  const labels = chapterLabels(chapterId);
  const have = labels.filter(owned).length;
  return { have, total: labels.length, done: have === labels.length };
}

export function canRescan(label, now = Date.now()) {
  const e = state.codex[label];
  if (!e) return { ok: true, remainMs: 0 };
  const remain = BALANCE.rescanCooldownMs - (now - new Date(e.lastAt).getTime());
  return { ok: remain <= 0, remainMs: Math.max(0, remain) };
}

/** 발견 처리: 도감 갱신 + 보상 + 챕터 완성 판정. 결과 객체를 리턴한다. */
export function discover(label, { confidence, isVariant }) {
  const w = WONDERS[label];
  const nowIso = new Date().toISOString();
  const isNew = !owned(label);
  const entry = state.codex[label] ?? { count: 0, firstAt: nowIso, variant: false, bestConf: 0 };
  entry.count += 1;
  entry.lastAt = nowIso;
  entry.variant = entry.variant || isVariant;
  entry.bestConf = Math.max(entry.bestConf, confidence);
  state.codex[label] = entry;
  state.scans += 1;

  const reward = computeReward({ rarity: w.rarity, isNew, isVariant });
  const beforeRank = rank();
  state.xp += reward.xp;
  state.dust += reward.dust;

  let chapterCompleted = null;
  const cp = chapterProgress(w.chapter);
  if (cp.done && !state.completedChapters.includes(w.chapter)) {
    state.completedChapters.push(w.chapter);
    state.xp += BALANCE.reward.chapterBonusXp;
    chapterCompleted = CHAPTERS.find(c => c.id === w.chapter);
  }
  const afterRank = rank();
  save();
  return {
    label, wonder: w, isNew, isVariant, confidence, reward,
    rankUp: afterRank.level > beforeRank.level ? afterRank : null,
    chapterCompleted,
    allComplete: ownedCount() === totalCount(),
  };
}
