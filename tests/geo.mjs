import assert from 'node:assert/strict';
import { nominatimNearby, parseNominatim, viewbox } from '../src/geo/nominatim.js';
import { bearingLabel, decorate, distanceM, mapsUrl, round3 } from '../src/geo/provider.js';

const sample = [
  { osm_type: 'node', osm_id: 10, lat: '37.5660', lon: '126.9780', category: 'amenity', type: 'cafe', name: '테스트 카페' },
  { osm_type: 'node', osm_id: 11, lat: '37.5700', lon: '126.9780', category: 'leisure', type: 'park', name: '테스트 공원' },
  { osm_type: 'node', osm_id: 12, lat: '37.5660', lon: '126.9780', category: 'amenity', type: 'cafe', name: '' },
];

const parsed = parseNominatim(sample);
assert.equal(parsed.length, 2, 'unnamed Nominatim rows are excluded');
assert.deepEqual(parsed[0].types, ['cafe', 'amenity=cafe']);
assert.equal(round3(37.56654), 37.567, 'stored coordinates are rounded to 100m precision');
assert.match(viewbox({ lat: 37.5665, lng: 126.978, radius: 800 }), /^126\./);

const decorated = decorate([
  { ...parsed[1], id: 'same' },
  { ...parsed[0], id: 'same' },
  { ...parsed[0], id: 'other' },
], { lat: 37.5665, lng: 126.978 });
assert.equal(decorated.length, 2, 'duplicate spot ids are removed');
assert.equal(decorated[0].dist_m, 56, 'distance is derived from the user position');
assert.equal(bearingLabel(decorated[0].bearing_deg), '남', 'bearing is labelled in Korean');
assert.match(mapsUrl(37.5665, 126.978), /37\.566500%2C126\.978000/);

const calls = [];
const fetched = await nominatimNearby({
  lat: 37.5665,
  lng: 126.978,
  radius: 800,
  timeoutMs: 3000,
  categories: ['cafe'],
  fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return { ok: true, async json() { return sample; } };
  },
});
assert.equal(fetched.length, 2, 'Nominatim rows normalize through the browser provider');
assert.match(calls[0].url, /bounded=1/);
assert.match(calls[0].url, /accept-language=ko/);
assert.match(calls[0].url, /limit=40/, 'fetches enough rows to sort by distance (limit 10 missed the nearest cafe)');
assert.equal(calls[0].options.headers.Accept, 'application/json');

// ── 반경 확장: 800m 박스가 비면 그 카테고리만 2km 로 한 번 더 찾는다 + 점진 onBatch
const boxWidth = (url) => { const v = decodeURIComponent(url.match(/viewbox=([^&]+)/)[1]).split(',').map(Number); return v[2] - v[0]; };
const far = [{ osm_type: 'node', osm_id: 20, lat: '37.5800', lon: '126.9780', category: 'leisure', type: 'park', name: '먼 공원' }];
const expCalls = [], batches = [];
const expanded = await nominatimNearby({
  lat: 37.5665, lng: 126.978, radius: 800, expandRadius: 2000, timeoutMs: 6000, categories: ['park'],
  onBatch: (s) => batches.push(s.length),
  fetchImpl: async (url) => { expCalls.push(boxWidth(url)); return { ok: true, async json() { return expCalls.length === 1 ? [] : far; } }; },
});
assert.equal(expCalls.length, 2, 'empty category retries once with the wider radius');
assert.ok(expCalls[1] > expCalls[0] * 2, 'second request uses the expanded box');
assert.equal(expanded.length, 1);
assert.deepEqual(batches, [1], 'onBatch reports progressive results');

// ── 현재 위치 기준 캐시: 이동 ≤250m 면 캐시 재사용(거리만 현재 위치로), >250m 면 새로 검색
// state.save() 는 브라우저 전역(window·localStorage)을 쓴다 — 노드에서는 메모리 스텁으로 대신한다
const mem = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) } });
globalThis.window ??= globalThis;
const { refreshSpots, saveGeo, movedFromCache, currentOrigin, diverse, GEO } = await import('../src/game/spots.js');
// 캐시 다양성: 가까운 카페 25곳 + 먼 공원 1곳 → 20곳을 남겨도 공원이 살아남는다
const manyCafes = Array.from({ length: 25 }, (_, i) => ({ id: `c${i}`, name: `카페${i}`, types: ['cafe'], lat: 0, lng: 0, dist_m: 10 + i }));
const kept = diverse([...manyCafes, { id: 'p', name: '공원', types: ['park'], lat: 0, lng: 0, dist_m: 900 }], 20);
assert.equal(kept.length, 20);
assert.ok(kept.some(s => s.id === 'p'), 'cache keeps other place kinds even when the nearest are all cafes');
const { state } = await import('../src/game/state.js');
let netCalls = 0;
// 요청한 viewbox 중심 근처의 카페·공원을 돌려주는 가짜 Nominatim
const around = (url) => { const [w, n, e, s] = decodeURIComponent(url.match(/viewbox=([^&]+)/)[1]).split(',').map(Number); const la = (n + s) / 2, ln = (w + e) / 2;
  return [{ osm_type: 'node', osm_id: Math.round(la * 1e4), lat: String(la - 0.0005), lon: String(ln), category: 'amenity', type: 'cafe', name: '테스트 카페' },
          { osm_type: 'node', osm_id: Math.round(ln * 1e4), lat: String(la + 0.0035), lon: String(ln), category: 'leisure', type: 'park', name: '테스트 공원' }]; };
globalThis.fetch = async (url) => { netCalls++; return { ok: true, async json() { return around(url); } }; };
const here = { ok: true, lat: 37.5665, lng: 126.978, accuracy: 25 };
state.geo = null;
const first = await refreshSpots({ force: true, position: here });
assert.equal(first.status, 'ok');
assert.equal(first.origin.accuracy, 25, 'result carries the live origin and accuracy');
assert.ok(netCalls > 0, 'first search hits the network');
assert.equal(state.geo.lat, 37.567, 'stored origin is rounded to 100m');
assert.equal(currentOrigin().lat, 37.5665, 'live origin kept in memory only, unrounded');

const before = netCalls;
const near = { ok: true, lat: 37.5680, lng: 126.978, accuracy: 20 }; // ≈ 150m 이동
assert.ok(movedFromCache(state.geo, near) <= GEO.moveRefreshM);
const reuse = await refreshSpots({ revalidate: true, position: near });
assert.equal(netCalls, before, 'small movement reuses the cache');
assert.equal(reuse.cached, true);
const cafe = reuse.spots.find(s => s.name === '테스트 카페');
assert.ok(cafe.dist_m > 150, `distances recomputed from the live position (got ${cafe.dist_m}m)`);

const moved = { ok: true, lat: 37.5000, lng: 127.0300, accuracy: 20 }; // 강남 ≈ 8km 이동
const refetch = await refreshSpots({ revalidate: true, position: moved });
assert.ok(netCalls > before, 'moving beyond 250m triggers a new search');
assert.equal(refetch.cached, false);

// ── 네트워크 실패 시 캐시 보존 + 현재 위치 기준 거리로 "이전 결과"
state.geo = null; await refreshSpots({ force: true, position: here });
globalThis.fetch = async () => ({ ok: false, status: 503, async json() { return null; } });
const stale = await refreshSpots({ force: true, position: moved });
assert.equal(stale.stale, true, 'failed refresh keeps the previous result, flagged stale');
assert.ok(stale.spots.length > 0);
assert.ok(stale.spots[0].dist_m > 5000, 'stale spots show their real distance from where the user is now');
assert.equal(state.geo.lat, 37.567, 'cache is not overwritten by an empty refresh');

console.log('GEO PASS', { spots: fetched.length, requests: calls.length, expanded: expCalls.length });
