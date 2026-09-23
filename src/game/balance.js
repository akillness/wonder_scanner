// 밸런스 상수 — 모든 숫자는 이 파일에서만 바꾼다.
export const BALANCE = {
  resonance: {
    baseFillPerSec: 0.45,       // 신뢰도 0.5 기준 약 2.2초
    confidenceWeight: 0.9,      // fill = base * (0.55 + conf * weight)
    decayPerSec: 0.8,
    minConfidence: 0.5,
    boostMultiplier: 2.0,       // 정령 조각 5개 = 공명 부스트 1회
  },
  // 포획 타이밍 링: 링이 1.0 → 0 으로 줄어들고, 목표 반경(target) 근처에서 탭
  capture: {
    cycleMs: 1500,
    cycles: 3,                  // 3회 동안 탭 없으면 AUTO(GOOD) 포획 — 접근성 경로
    target: 0.30,               // 목표 반경 비율
    perfect: 0.045,             // |r - target| ≤ → PERFECT (약 135ms 창)
    great: 0.10,                // ≤ → GREAT (약 300ms)
    good: 0.17,                 // ≤ → GOOD, 그 밖은 MISS
    missGaugeReset: 0.35,       // MISS 시 공명 게이지 복귀값
    grades: {
      PERFECT: { dust: 2.0, xp: 1.5, variantMul: 3.0, label: '퍼펙트!', color: '#E2B45A' },
      GREAT:   { dust: 1.5, xp: 1.2, variantMul: 1.6, label: '그레이트', color: '#6DB5A0' },
      GOOD:    { dust: 1.0, xp: 1.0, variantMul: 1.0, label: '굿', color: '#EDE6D6' },
      AUTO:    { dust: 1.0, xp: 1.0, variantMul: 1.0, label: '포획', color: '#EDE6D6' },
    },
  },
  variant: { baseChance: 0.04, confidenceBonus: 0.06, stardustMultiplier: 3 },
  // 정령(AR 위습)
  spirits: {
    spawnMinMs: 4500, spawnMaxMs: 8500, maxAlive: 3, lifeMs: 9000,
    goldenChance: 0.08,         // 황금 정령 → 프리즘 토큰
    fragmentsPerBoost: 5,       // 조각 5개 = 공명 부스트 1
    maxBoost: 3,
    tapRadiusPx: 36,
    fovDeg: 60,                 // 자이로 1도 → 화면 픽셀 환산 기준 시야각
  },
  reward: {
    xpNew:  { 1: 20, 2: 40, 3: 80, 4: 160 },
    xpDup:  { 1: 4,  2: 8,  3: 14, 4: 25 },
    dustNew:{ 1: 10, 2: 20, 3: 40, 4: 80 },
    dustDup:{ 1: 3,  2: 6,  3: 12, 4: 24 },
    chapterBonusXp: 120,
    spiritDust: 2,
  },
  rescanCooldownMs: 15000,
  // 연속 출석: 하루 +10%, 최대 +50% XP
  streak: { perDay: 0.10, maxDays: 5 },
  // 도감 깊이: 같은 원더 n회 → 루페 관찰 노트 해금
  depth: { note1: 3, note2: 10 },
  ranks: [
    { xp: 0,    title: '견습 탐험가' },
    { xp: 50,   title: '렌즈 수습생' },
    { xp: 150,  title: '골목 관찰자' },
    { xp: 320,  title: '원더 추적자' },
    { xp: 600,  title: '공명 조율사' },
    { xp: 1000, title: '도감 필경사' },
    { xp: 1550, title: '차원 항해사' },
    { xp: 2300, title: '전설 사냥꾼' },
    { xp: 3300, title: '루페의 동료' },
    { xp: 4600, title: '원더 마스터' },
  ],
};

export function resonanceFillRate(confidence, boosted = false) {
  const r = BALANCE.resonance;
  return r.baseFillPerSec * (0.55 + confidence * r.confidenceWeight) * (boosted ? r.boostMultiplier : 1);
}

export function rollVariant(confidence, gradeMul = 1, forced = false, rng = Math.random) {
  if (forced) return true;
  const v = BALANCE.variant;
  const chance = (v.baseChance + Math.max(0, confidence - 0.5) * 2 * v.confidenceBonus) * gradeMul;
  return rng() < Math.min(0.5, chance);
}

/** 링 반경 비율(0~1)로 포획 등급 판정 */
export function gradeCapture(r) {
  const c = BALANCE.capture, d = Math.abs(r - c.target);
  if (d <= c.perfect) return 'PERFECT';
  if (d <= c.great) return 'GREAT';
  if (d <= c.good) return 'GOOD';
  return 'MISS';
}

export function rankFor(xp) {
  let idx = 0;
  BALANCE.ranks.forEach((r, i) => { if (xp >= r.xp) idx = i; });
  const cur = BALANCE.ranks[idx], next = BALANCE.ranks[idx + 1] ?? null;
  const progress = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { level: idx + 1, title: cur.title, next, progress: Math.min(1, progress) };
}

export function streakMultiplier(days) {
  const s = BALANCE.streak;
  return 1 + Math.min(Math.max(0, days - 1), s.maxDays) * s.perDay;
}

export function computeReward({ rarity, isNew, isVariant, grade = 'GOOD', streakDays = 1 }) {
  const R = BALANCE.reward, G = BALANCE.capture.grades[grade] ?? BALANCE.capture.grades.GOOD;
  let xp = isNew ? R.xpNew[rarity] : R.xpDup[rarity];
  let dust = isNew ? R.dustNew[rarity] : R.dustDup[rarity];
  if (isVariant) { dust *= BALANCE.variant.stardustMultiplier; xp = Math.round(xp * 1.5); }
  xp = Math.round(xp * G.xp * streakMultiplier(streakDays));
  dust = Math.round(dust * G.dust);
  return { xp, dust };
}

// 아이 게이지(시선 추적) — docs/GAMEPLAY_V7.md §5.2
BALANCE.eye = { holdMs: 900, spiritHoldMs: 600, decayPerS: 1.5, gazeGain: 1.4, headGain: 0.6, smoothK: 8,
  openMin: 0.5, boxPad: 0.2, minHitPx: 44, spiritRadiusPx: 60, steady: { PERFECT: 8, GREAT: 18 }, jitterEmaK: 6, rearmMs: 400 };
