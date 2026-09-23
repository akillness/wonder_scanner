import { state, save, ownedCount } from './state.js';

export const ACHIEVEMENTS = [
  { id: 'first',      icon: '🔭', title: '첫 원더',        desc: '첫 원더를 발견했다',              test: s => ownedCount() >= 1 },
  { id: 'ten',        icon: '📖', title: '수집가의 시작',   desc: '10종 수집',                      test: s => ownedCount() >= 10 },
  { id: 'forty',      icon: '📚', title: '절반의 세계',     desc: '40종 수집',                      test: s => ownedCount() >= 40 },
  { id: 'all',        icon: '🌌', title: '원더 마스터',     desc: '80종 전부 수집',                 test: s => ownedCount() >= 80 },
  { id: 'rare',       icon: '💚', title: '희귀한 눈',       desc: '희귀 원더 첫 발견',              test: s => Object.keys(s.codex).some(l => rarityOf(l) >= 2) },
  { id: 'epic',       icon: '💜', title: '영웅의 목격자',   desc: '영웅 원더 첫 발견',              test: s => Object.keys(s.codex).some(l => rarityOf(l) >= 3) },
  { id: 'legend',     icon: '👑', title: '전설을 보았다',   desc: '전설 원더 첫 발견',              test: s => s.stats.legendary >= 1 },
  { id: 'variant',    icon: '✨', title: '프리즘 헌터',     desc: '변이체 첫 포획',                 test: s => s.stats.variants >= 1 },
  { id: 'perfect1',   icon: '🎯', title: '완벽한 타이밍',   desc: '퍼펙트 포획 1회',                test: s => s.stats.perfects >= 1 },
  { id: 'perfect10',  icon: '🏹', title: '공명의 명수',     desc: '퍼펙트 포획 10회',               test: s => s.stats.perfects >= 10 },
  { id: 'spirit20',   icon: '🫧', title: '정령 친구',       desc: '정령 20마리 포획',               test: s => s.stats.spirits >= 20 },
  { id: 'golden',     icon: '🌟', title: '황금빛 인연',     desc: '황금 정령 포획',                 test: s => s.stats.golden >= 1 },
  { id: 'chapter',    icon: '📜', title: '이야기의 한 장',  desc: '챕터 1개 완성',                  test: s => s.completedChapters.length >= 1 },
  { id: 'streak3',    icon: '🔥', title: '사흘의 탐험',     desc: '3일 연속 출석',                  test: s => s.streak.days >= 3 },
  { id: 'depth10',    icon: '🔁', title: '오래된 친구',     desc: '같은 원더 10회 포획',            test: s => Object.values(s.codex).some(e => e.count >= 10) },
];

let rarityOf = () => 0;
export function bindRarity(fn) { rarityOf = fn; }

/** 새로 달성한 업적 목록 리턴 */
export function checkAchievements() {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.includes(a.id)) continue;
    try { if (a.test(state)) { state.achievements.push(a.id); got.push(a); } } catch {}
  }
  if (got.length) save();
  return got;
}
