// 밸런스 상수 — 모든 숫자는 이 파일에서만 바꾼다.
export const BALANCE = {
  // 공명 게이지: 물체가 연속 탐지되는 동안 채워짐 (0~1)
  resonance: {
    baseFillPerSec: 0.45,       // 신뢰도 0.5 기준 약 2.2초
    confidenceWeight: 0.9,      // fill = base * (0.55 + conf * weight)
    decayPerSec: 0.8,           // 물체를 놓치면 빠르게 감소
    minConfidence: 0.5,         // 이 미만 탐지는 무시
  },
  // 변이체(프리즘): 스캔 시 낮은 확률로 등장
  variant: {
    baseChance: 0.04,
    confidenceBonus: 0.06,      // 신뢰도 1.0일 때 최대 +6%
    stardustMultiplier: 3,
  },
  // 보상
  reward: {
    xpNew:  { 1: 20, 2: 40, 3: 80, 4: 160 },
    xpDup:  { 1: 4,  2: 8,  3: 14, 4: 25 },
    dustNew:{ 1: 10, 2: 20, 3: 40, 4: 80 },
    dustDup:{ 1: 3,  2: 6,  3: 12, 4: 24 },
    chapterBonusXp: 120,
  },
  // 같은 라벨 재스캔 쿨다운(ms): 같은 컵을 연타하는 파밍 방지
  rescanCooldownMs: 15000,
  // 랭크 곡선: 누적 XP 임계값
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

export function resonanceFillRate(confidence) {
  const r = BALANCE.resonance;
  return r.baseFillPerSec * (0.55 + confidence * r.confidenceWeight);
}

export function rollVariant(confidence, rng = Math.random) {
  const v = BALANCE.variant;
  const chance = v.baseChance + Math.max(0, confidence - 0.5) * 2 * v.confidenceBonus;
  return rng() < chance;
}

export function rankFor(xp) {
  let idx = 0;
  BALANCE.ranks.forEach((r, i) => { if (xp >= r.xp) idx = i; });
  const cur = BALANCE.ranks[idx];
  const next = BALANCE.ranks[idx + 1] ?? null;
  const progress = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { level: idx + 1, title: cur.title, next, progress: Math.min(1, progress) };
}

export function computeReward({ rarity, isNew, isVariant }) {
  const R = BALANCE.reward;
  let xp = isNew ? R.xpNew[rarity] : R.xpDup[rarity];
  let dust = isNew ? R.dustNew[rarity] : R.dustDup[rarity];
  if (isVariant) { dust *= BALANCE.variant.stardustMultiplier; xp = Math.round(xp * 1.5); }
  return { xp, dust };
}
