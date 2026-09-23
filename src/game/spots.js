// 위치 기반 추천 (GAMEPLAY_V7 §7): 장소 유형 → 챕터·원더·기믹 매핑(7.3), 추천 상위 5, 기믹 30분, 스팟 도전.
// 시뮬레이션 진실(감지·쿨다운·공명·등급·보상·BALANCE)은 건드리지 않는다 — 기믹은 companion.eventMod 에 "곱"으로만 얹힌다.
// state.geo 는 추가 필드: { at, lat, lng, spots, gimmick?, challenge? } — 없으면 null (옛 저장 호환).
import { state, save, owned, closestChapter } from './state.js';
import { WONDERS } from '../data/wonders.js';
import { CHAPTERS, chapterLabels } from '../data/chapters.js';
import { nearby, locate, decorate, distanceM, providerName } from '../geo/provider.js';

export const GEO = Object.freeze({
  radiusM: 800, cacheMs: 60 * 60 * 1000, gimmickMs: 30 * 60 * 1000, challengeRadiusM: 150, challengeReward: 100,
  top: 5, timeoutMs: 8000, fixTimeoutMs: 5000,
});

// 7.3 장소 유형 → 챕터 · 추천 원더 · 기믹. 위에서부터 첫 매치. types 는 Google Table A 키 + OSM 정규화 키(osm.js).
// mod 키는 companion.eventMod 의 key 와 같은 이름을 쓴다: dust · xp · spirit · variant · fill (+ chapter 범위), challenge.
export const SPOT_RULES = [
  { id: 'cafe',       types: ['cafe', 'coffee_shop', 'bakery'],                     chapters: ['kitchen'],         labels: ['cup', 'cake', 'donut', 'sandwich'],
    gimmick: { id: 'coffee',   title: '커피 시간',     desc: '부엌 원더 별가루 ×2',          mod: { dustMulChapter: 2, chapter: 'kitchen' } } },
  { id: 'restaurant', types: ['restaurant', 'food_court'],                          chapters: ['kitchen'],         labels: ['pizza', 'bowl', 'fork', 'wine glass'],
    gimmick: { id: 'feast',    title: '만찬',          desc: '부엌 원더 XP ×1.5',            mod: { xpMulChapter: 1.5, chapter: 'kitchen' } } },
  { id: 'park',       types: ['park', 'playground', 'dog_park'],                    chapters: ['play', 'living'],  labels: ['frisbee', 'kite', 'sports ball', 'dog'],
    gimmick: { id: 'walk',     title: '산책',          desc: '정령 출몰 ×2',                  mod: { spiritMul: 2 } } },
  { id: 'zoo',        types: ['zoo', 'aquarium'],                                   chapters: ['living'],          labels: ['elephant', 'zebra', 'giraffe', 'bird'],
    gimmick: { id: 'safari',   title: '사파리',        desc: '살아있는 신비 변이체 확률 ×2',  mod: { variantMulChapter: 2, chapter: 'living' } } },
  { id: 'beach',      types: ['beach', 'marina'],                                   chapters: ['play'],            labels: ['surfboard', 'boat', 'umbrella'],
    gimmick: { id: 'wave',     title: '파도',          desc: '놀이 원더 XP ×1.5',            mod: { xpMulChapter: 1.5, chapter: 'play' } } },
  { id: 'library',    types: ['library', 'book_store'],                             chapters: ['desk'],            labels: ['book', 'laptop', 'clock'],
    gimmick: { id: 'reading',  title: '정독',          desc: '책상 원더 별가루 ×2',          mod: { dustMulChapter: 2, chapter: 'desk' } } },
  { id: 'transit',    types: ['bus_station', 'train_station', 'transit_station', 'subway_station', 'light_rail_station'], chapters: ['street'], labels: ['bus', 'train', 'traffic light', 'bicycle'],
    gimmick: { id: 'giants',   title: '거리의 거인들', desc: '거리 원더 공명 +50%',          mod: { fillMulChapter: 1.5, chapter: 'street' } } },
  { id: 'gym',        types: ['gym', 'stadium', 'sports_complex', 'fitness_center'], chapters: ['play'],           labels: ['sports ball', 'baseball bat', 'tennis racket'],
    gimmick: { id: 'training', title: '운동장',        desc: '놀이 원더 별가루 ×2',          mod: { dustMulChapter: 2, chapter: 'play' } } },
  { id: 'shop',       types: ['shopping_mall', 'supermarket', 'shop', 'store', 'convenience_store', 'grocery_store', 'department_store', 'market'], chapters: ['home', 'kitchen'], labels: ['handbag', 'bottle', 'banana', 'apple'],
    gimmick: { id: 'shopping', title: '장보기',        desc: '원더 3종 스팟 도전 → 별가루 100', mod: { challenge: true, reward: 100 } } },
];

const chapterOf = (id) => CHAPTERS.find(c => c.id === id) || CHAPTERS[0];

/** 장소 → 규칙 (첫 매치). 매치 없으면 null (= "그 외": closestChapter 부족분). */
export function classify(spot) {
  const types = Array.isArray(spot?.types) ? spot.types : [];
  if (!types.length) return null;
  for (const r of SPOT_RULES) if (r.types.some(t => types.includes(t))) return r;
  return null;
}

/** 규칙의 추천 원더 3개 — 미보유 우선, WONDERS 에 있는 라벨만. 규칙 없으면 closestChapter 부족분 상위 3. */
export function pickLabels(rule, n = 3) {
  let pool;
  if (rule) pool = rule.labels.filter(l => WONDERS[l]);
  else { const c = closestChapter(); pool = c.missing.length ? c.missing : chapterLabels(c.chapter.id); }
  const un = pool.filter(l => !owned(l)), ow = pool.filter(l => owned(l));
  return [...un, ...ow].slice(0, n);
}

function enrich(s) {
  const rule = classify(s);
  const chapterId = rule ? rule.chapters[0] : closestChapter().chapter.id;
  const labels = pickLabels(rule);
  const gimmick = rule?.gimmick ? { ...rule.gimmick, mod: { ...rule.gimmick.mod }, spotId: s.id, spotName: s.name, labels } : null;
  return { ...s, rule: rule?.id ?? 'other', chapter: chapterId, chapterTitle: chapterOf(chapterId).title, labels, gimmick };
}

/**
 * 추천: 거리순 + 규칙 다양성(규칙당 가장 가까운 곳 먼저) 으로 상위 5. 각 spot 에 dist_m·bearing_deg·chapter·labels·gimmick·mapsUrl.
 * @returns {{ spots: object[], gimmick: object|null }}
 */
export function recommend(spots, origin = {}) {
  const list = decorate(spots, origin).map(enrich);
  const picked = [], used = new Set();
  for (const s of list) { if (picked.length >= GEO.top) break; if (used.has(s.rule)) continue; used.add(s.rule); picked.push(s); }
  for (const s of list) { if (picked.length >= GEO.top) break; if (!picked.includes(s)) picked.push(s); }
  picked.sort((a, b) => a.dist_m - b.dist_m);
  const gimmick = picked.find(s => s.gimmick)?.gimmick ?? null;
  return { spots: picked, gimmick };
}

// ── state.geo (방어적: 옛 저장은 geo 가 없거나 null)
function ensureGeo() {
  state.geo ??= null;
  if (!state.geo || typeof state.geo !== 'object') state.geo = { at: 0, lat: null, lng: null, spots: [] };
  if (!Array.isArray(state.geo.spots)) state.geo.spots = [];
  return state.geo;
}
/** 1시간 안의 캐시 (없으면 null) */
export function cachedGeo(now = Date.now()) {
  const g = state.geo; if (!g || typeof g !== 'object' || !g.at) return null;
  return now - g.at <= GEO.cacheMs && Array.isArray(g.spots) ? g : null;
}
/** 캐시 저장 — 좌표는 소수점 3자리, 장소는 최대 20건의 최소 필드만. 기믹·도전은 유지. */
export function saveGeo({ lat, lng, spots, now = Date.now() }) {
  const g = ensureGeo();
  const r3 = (v) => Math.round(Number(v) * 1000) / 1000;
  g.at = now; g.lat = r3(lat); g.lng = r3(lng);
  g.spots = (Array.isArray(spots) ? spots : []).slice(0, 20).map(s => ({ id: s.id, name: s.name, types: (s.types || []).slice(0, 8), lat: s.lat, lng: s.lng, dist_m: s.dist_m, bearing_deg: s.bearing_deg, mapsUrl: s.mapsUrl, source: s.source }));
  save(); return g;
}

/** 위치 → 주변 → 추천 → 캐시. 절대 throw 하지 않는다. status: ok | denied | unavailable | empty */
export async function refreshSpots({ force = false, position = null, now = Date.now() } = {}) {
  try {
    const c = cachedGeo(now);
    if (c && !force && c.spots.length) return { status: 'ok', cached: true, source: c.spots[0]?.source, at: c.at, ...recommend(c.spots, c) };
    const p = position ?? await locate({ timeoutMs: GEO.timeoutMs });
    if (!p?.ok) return { status: p?.error === 'denied' ? 'denied' : 'unavailable', error: p?.error, cached: false, spots: [], gimmick: null };
    const raw = await nearby({ lat: p.lat, lng: p.lng, radius: GEO.radiusM, timeoutMs: GEO.timeoutMs });
    saveGeo({ lat: p.lat, lng: p.lng, spots: raw, now });
    return { status: raw.length ? 'ok' : 'empty', cached: false, source: raw[0]?.source ?? providerName(), at: now, ...recommend(raw, p) };
  } catch (e) { console.info('[geo] refresh failed:', e?.name || e); return { status: 'unavailable', cached: false, spots: [], gimmick: null }; }
}

// ── 기믹 (30분)
export function activeGimmick(now = Date.now()) {
  const g = state.geo?.gimmick; if (!g || typeof g !== 'object') return null;
  return Number(g.until) > now ? g : null;
}
export const gimmickRemainingMs = (now = Date.now()) => Math.max(0, (activeGimmick(now)?.until ?? 0) - now);
export const remainLabel = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return s >= 60 ? `${Math.ceil(s / 60)}분` : `${s}초`; };

/** 기믹 시작 (같은 기믹·같은 장소가 이미 활성이면 남은 시간 유지). 장보기는 스팟 도전을 함께 연다. */
export function startGimmick(g, { spot = null, now = Date.now() } = {}) {
  if (!g || !g.id) return null;
  const geo = ensureGeo();
  const spotId = g.spotId ?? spot?.id ?? null, cur = geo.gimmick;
  if (cur && cur.id === g.id && cur.spotId === spotId && Number(cur.until) > now) return cur;
  const gim = { id: g.id, title: g.title, desc: g.desc, mod: { ...(g.mod || {}) }, startedAt: now, until: now + GEO.gimmickMs, spotId, spotName: g.spotName ?? spot?.name ?? null };
  geo.gimmick = gim;
  if (gim.mod.challenge) {
    const sp = spot || geo.spots.find(s => s.id === spotId) || null;
    const rule = SPOT_RULES.find(r => r.gimmick?.id === g.id) || null;
    const labels = (Array.isArray(g.labels) && g.labels.length ? g.labels : pickLabels(rule)).slice(0, 3);
    geo.challenge = { spotId, spotName: gim.spotName, lat: sp?.lat ?? null, lng: sp?.lng ?? null, labels, done: [], reward: gim.mod.reward || GEO.challengeReward, until: gim.until };
  } else if (geo.challenge && geo.challenge.spotId !== spotId) geo.challenge = null;
  save(); return gim;
}
export function stopGimmick() { if (state.geo?.gimmick) { state.geo.gimmick = null; state.geo.challenge = null; save(); } }

/** 기믹 배율 — companion.eventMod 가 사건 보정치에 곱한다. ctx: { chapter?, label? }. 챕터 범위 기믹은 챕터를 알 때만 적용. */
export function gimmickMod(key, ctx = {}) {
  try {
    const g = activeGimmick(ctx.now ?? Date.now()); const m = g?.mod; if (!m) return 1;
    const ch = ctx.chapter ?? (ctx.label ? WONDERS[ctx.label]?.chapter : null) ?? null;
    const inCh = !m.chapter || ch === m.chapter;
    if (key === 'dust' && m.dustMulChapter && inCh) return m.dustMulChapter;
    if (key === 'xp' && m.xpMulChapter && inCh) return m.xpMulChapter;
    if (key === 'variant' && m.variantMulChapter && inCh) return m.variantMulChapter;
    if (key === 'fill' && m.fillMulChapter && inCh) return m.fillMulChapter;
    if (key === 'spirit' && m.spiritMul) return m.spiritMul;
    return 1;
  } catch { return 1; }
}

// ── 스팟 도전: 캐시된 스팟 반경 150m 안에서 해당 라벨 포획 시 진행, 3/3 → 별가루 100
export const spotChallenge = () => { const c = state.geo?.challenge; return c && typeof c === 'object' && Array.isArray(c.labels) ? c : null; };

/**
 * 포획 시 호출 (peer 의 finish() 에서 `challengeProgress(label)`). 위치 재확인 1회(5s, 실패해도 진행). 절대 throw 하지 않는다.
 * @returns {Promise<null|{ label, progress, total, completed, reward, far?, already?, spotName, msg }>}
 */
export async function challengeProgress(label, { position = null, now = Date.now() } = {}) {
  try {
    const c = spotChallenge(); if (!c || !label || !c.labels.includes(label)) return null;
    if (c.until && now > Number(c.until)) return null;
    const total = c.labels.length, done = Array.isArray(c.done) ? c.done : (c.done = []);
    if (done.includes(label)) return { label, progress: done.length, total, completed: false, already: true, reward: 0, spotName: c.spotName, msg: `이미 찍은 원더야 — 스팟 도전 ${done.length}/${total}` };
    let near = true;
    if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
      const p = position ?? await locate({ timeoutMs: GEO.fixTimeoutMs, maximumAge: 30000, precise: true });
      if (p?.ok) near = distanceM(p.lat, p.lng, c.lat, c.lng) <= GEO.challengeRadiusM; // 실패(권한·타임아웃)면 진행을 막지 않는다
    }
    if (!near) return { label, progress: done.length, total, completed: false, far: true, reward: 0, spotName: c.spotName, msg: `${c.spotName ?? '그 장소'} 150m 안에서 찍어야 도전에 들어가` };
    done.push(label);
    const completed = done.length >= total;
    let reward = 0;
    if (completed) { reward = Number(c.reward) || GEO.challengeReward; state.dust += reward; c.completedAt = now; state.geo.challenge = null; }
    save();
    const r = { label, progress: Math.min(done.length, total), total, completed, reward, spotName: c.spotName,
      msg: completed ? `스팟 도전 완료! 별가루 ${reward}` : `스팟 도전 ${done.length}/${total} · ${c.labels.filter(l => !done.includes(l)).join(', ')} 남음` };
    try { globalThis.dispatchEvent?.(new CustomEvent('ws:spot-challenge', { detail: r })); } catch {}
    return r;
  } catch { return null; }
}

/** 타이틀 카드용 요약 */
export function geoSummary(now = Date.now()) {
  const c = cachedGeo(now);
  const rec = c && c.spots.length ? recommend(c.spots, c) : null;
  return { cached: !!rec, top: rec?.spots[0] ?? null, suggested: rec?.gimmick ?? null, active: activeGimmick(now), challenge: spotChallenge(), count: rec?.spots.length ?? 0, at: c?.at ?? 0 };
}
