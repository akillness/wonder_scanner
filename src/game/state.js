import { WONDERS } from '../data/wonders.js';
import { CHAPTERS, chapterLabels } from '../data/chapters.js';
import { BALANCE, computeReward, rankFor } from './balance.js';

const KEY = 'wonder-scanner:v1';

// 저장 스키마 (v2 — 누락 필드는 로드 시 기본값으로 채움)
// codex[label] = { count, firstAt(ISO), lastAt(ISO), variant, bestConf, bestGrade }
// streak = { last: 'YYYY-MM-DD', days }
// quests = { date: 'YYYY-MM-DD', items: [{ id, type, params, goal, progress, done }] }
// stats = { perfects, greats, misses, spirits, golden, variants, legendary }
// settings = { sound, reduceMotion, autoCapture, haptics }
const fresh = () => ({
  v: 2, codex: {}, xp: 0, dust: 0, scans: 0, completedChapters: [], onboarded: false, tutorialSeen: false,
  fragments: 0, boost: 0, prismTokens: 0,
  streak: { last: null, days: 0 },
  quests: { date: null, items: [] },
  achievements: [],
  stats: { perfects: 0, greats: 0, misses: 0, spirits: 0, golden: 0, variants: 0, legendary: 0, bestCombo: 0, giftsSent: 0, giftsGot: 0, clips: 0 },
  settings: { sound: true, reduceMotion: false, autoCapture: false, haptics: true, recordClips: true, eyeGauge: true, recordOverlay: false, shutterSound: true, bestPhoto: true, location: false },
  name: '', frames: ['default'], activeFrame: 'default', milestones: [], combo: 0, giftsReceived: [], hints: [], lastRecallDate: null, lastDuelWinDate: null, event: null, world: 'prime', skills: [], eyeCal: null, auraSkins: ['ember'], auraSkin: null, auraByLabel: {}, geo: null, cloud: { uid: null, public: true },
});

export const state = load();

function load() {
  const d = fresh();
  try {
    let raw = '{}'; try { raw = localStorage.getItem(KEY) || '{}'; } catch {}
    const s = JSON.parse(raw);
    const out = { ...d, ...s };
    for (const k of ['streak', 'quests', 'stats', 'settings', 'cloud']) out[k] = { ...d[k], ...(s[k] || {}) };
    if (typeof s.sound === 'boolean' && s.settings === undefined) out.settings.sound = s.sound; // v1 → v2
    for (const k of ['frames', 'milestones', 'giftsReceived', 'hints', 'skills', 'auraSkins']) if (!Array.isArray(out[k])) out[k] = d[k];
    if (!out.auraByLabel || typeof out.auraByLabel !== 'object' || Array.isArray(out.auraByLabel)) out.auraByLabel = {};
    out.v = 3;
    return out;
  } catch { return d; }
}
let saveWarned = false;
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { if (!saveWarned) { saveWarned = true; console.warn('save failed (private mode or quota):', e?.name); window.dispatchEvent(new CustomEvent('ws:save-failed')); } } }
export function resetAll() { Object.assign(state, fresh()); save(); }

export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 앱 진입 시 연속 출석 갱신. 변화가 있으면 { days, extended } 리턴 */
export function touchStreak() {
  const today = todayKey();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const s = state.streak;
  if (s.last === today) return { days: s.days, extended: false };
  s.days = s.last === todayKey(y) ? s.days + 1 : 1;
  s.last = today; save();
  return { days: s.days, extended: true };
}

export function owned(label) { return !!state.codex[label]; }
export function ownedCount() { return Object.keys(state.codex).length; }
export function totalCount() { return Object.keys(WONDERS).length; }
export function rank() { return rankFor(state.xp); }

export function chapterProgress(chapterId) {
  const labels = chapterLabels(chapterId);
  const have = labels.filter(owned).length;
  return { have, total: labels.length, done: have === labels.length, remain: labels.length - have };
}
/** 완성에 가장 가까운(미완성) 챕터와 미수집 라벨 — "2개만 더!" 넛지용 */
export function closestChapter() {
  const list = CHAPTERS.map(c => ({ c, p: chapterProgress(c.id) })).filter(x => !x.p.done && x.p.have > 0)
    .sort((a, b) => a.p.remain - b.p.remain || b.p.have - a.p.have);
  const pick = list[0] ?? { c: CHAPTERS[0], p: chapterProgress(CHAPTERS[0].id) };
  return { chapter: pick.c, ...pick.p, missing: chapterLabels(pick.c.id).filter(l => !owned(l)) };
}

export function canRescan(label, now = Date.now()) {
  const e = state.codex[label];
  if (!e) return { ok: true, remainMs: 0 };
  const remain = BALANCE.rescanCooldownMs - (now - new Date(e.lastAt).getTime());
  return { ok: remain <= 0, remainMs: Math.max(0, remain) };
}

const GRADE_ORDER = { AUTO: 0, GOOD: 1, GREAT: 2, PERFECT: 3 };

/** 발견 처리: 도감 갱신 + 보상 + 챕터 완성 판정 */
export function discover(label, { confidence, isVariant, grade = 'GOOD', usedToken = false }) {
  const w = WONDERS[label];
  const nowIso = new Date().toISOString();
  const isNew = !owned(label);
  const entry = state.codex[label] ?? { count: 0, firstAt: nowIso, variant: false, bestConf: 0, bestGrade: 'AUTO' };
  entry.count += 1; entry.lastAt = nowIso;
  entry.variant = entry.variant || isVariant;
  entry.bestConf = Math.max(entry.bestConf, confidence);
  if ((GRADE_ORDER[grade] ?? 0) > (GRADE_ORDER[entry.bestGrade] ?? 0)) entry.bestGrade = grade;
  state.codex[label] = entry;
  state.scans += 1;
  if (grade === 'PERFECT') state.stats.perfects += 1;
  if (grade === 'GREAT') state.stats.greats += 1;
  if (isVariant) state.stats.variants += 1;
  if (w.rarity === 4 && isNew) state.stats.legendary += 1;
  if (usedToken) state.prismTokens = Math.max(0, state.prismTokens - 1);
  if (state.boost > 0) state.boost -= 1;

  const reward = computeReward({ rarity: w.rarity, isNew, isVariant, grade, streakDays: state.streak.days });
  const beforeRank = rank();
  state.xp += reward.xp; state.dust += reward.dust;

  let chapterCompleted = null;
  const cp = chapterProgress(w.chapter);
  if (cp.done && !state.completedChapters.includes(w.chapter)) {
    state.completedChapters.push(w.chapter);
    state.xp += BALANCE.reward.chapterBonusXp;
    chapterCompleted = CHAPTERS.find(c => c.id === w.chapter);
  }
  const afterRank = rank();
  const depth = entry.count === BALANCE.depth.note1 ? 1 : entry.count === BALANCE.depth.note2 ? 2 : 0;
  save();
  return {
    label, wonder: w, isNew, isVariant, confidence, grade, reward, entry, depthUnlocked: depth,
    rankUp: afterRank.level > beforeRank.level ? afterRank : null,
    chapterCompleted, allComplete: ownedCount() === totalCount(),
  };
}

/** 정령 포획 */
export function catchSpirit(golden) {
  state.stats.spirits += 1;
  state.dust += BALANCE.reward.spiritDust;
  let boostGained = false;
  if (golden) { state.prismTokens += 1; state.stats.golden += 1; }
  else {
    state.fragments += 1;
    if (state.fragments >= BALANCE.spirits.fragmentsPerBoost && state.boost < BALANCE.spirits.maxBoost) {
      state.fragments -= BALANCE.spirits.fragmentsPerBoost; state.boost += 1; boostGained = true;
    }
  }
  save();
  return { golden, boostGained, fragments: state.fragments, boost: state.boost };
}
export function recordMiss() { state.stats.misses += 1; save(); }
