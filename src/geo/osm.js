// OpenStreetMap Overpass 폴백 (GAMEPLAY_V7 §7.2) — 키 없이 동작. amenity/leisure/shop/tourism 노드, 반경 800m, 8초 타임아웃, 20건 상한.
// 절대 throw 하지 않는다 — 실패는 [].
export const OSM_ENDPOINT = 'https://overpass-api.de/api/interpreter';

// OSM 태그 → Google 식 유형 키 (spots.js SPOT_RULES 가 같은 키를 읽는다)
export const OSM_TYPE = {
  'amenity=cafe': 'cafe', 'amenity=restaurant': 'restaurant', 'amenity=fast_food': 'restaurant', 'amenity=food_court': 'food_court',
  'amenity=library': 'library', 'amenity=bus_station': 'bus_station',
  'leisure=park': 'park', 'leisure=playground': 'playground', 'leisure=dog_park': 'dog_park',
  'leisure=sports_centre': 'gym', 'leisure=fitness_centre': 'gym', 'leisure=stadium': 'stadium', 'leisure=marina': 'marina',
  'tourism=zoo': 'zoo', 'tourism=aquarium': 'aquarium',
  'natural=beach': 'beach',
  'highway=bus_stop': 'bus_station', 'railway=station': 'train_station', 'public_transport=station': 'transit_station',
  'shop=books': 'book_store', 'shop=supermarket': 'supermarket', 'shop=mall': 'shopping_mall', 'shop=bakery': 'bakery', 'shop=coffee': 'coffee_shop',
};

export function buildOverpassQuery({ lat, lng, radius = 800, timeout = 8 }) {
  const a = `(around:${Math.round(radius)},${lat},${lng})`;
  return `[out:json][timeout:${timeout}];(` +
    `node${a}[amenity~"^(cafe|restaurant|fast_food|food_court|library|bus_station)$"];` +
    `node${a}[leisure~"^(park|playground|dog_park|sports_centre|fitness_centre|stadium|marina)$"];` +
    `node${a}[tourism~"^(zoo|aquarium)$"];` +
    `node${a}[natural=beach];` +
    `node${a}[highway=bus_stop];` +
    `node${a}[railway=station];` +
    `node${a}[shop];` +
    `);out body 60;`;
}

/**
 * @param {{ lat:number, lng:number, radius?:number, timeoutMs?:number, fetchImpl?:typeof fetch }} o
 * @returns {Promise<Array<{ id:string, name:string, types:string[], lat:number, lng:number, source:'osm' }>>}
 */
export async function osmNearby({ lat, lng, radius = 800, timeoutMs = 8000, fetchImpl } = {}) {
  const f = fetchImpl || globalThis.fetch;
  if (typeof f !== 'function' || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await f(OSM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(buildOverpassQuery({ lat, lng, radius, timeout: Math.max(1, Math.round(timeoutMs / 1000)) })),
      signal: ctrl?.signal,
    });
    if (!res || !res.ok) { console.info('[geo] overpass', res?.status ?? 'no-response'); return []; }
    const json = await res.json().catch(() => null);
    return parseOverpass(json, { lat, lng });
  } catch (e) {
    console.info('[geo] overpass failed:', e?.name || e);
    return [];
  } finally { if (timer) clearTimeout(timer); }
}

/** Overpass JSON → 정규화 (이름 없는 노드 제외, 거리순 20건). */
export function parseOverpass(json, origin = null) {
  const els = Array.isArray(json?.elements) ? json.elements : [];
  const out = [];
  for (const e of els) {
    const la = Number(e?.lat), ln = Number(e?.lon), t = e?.tags || {};
    if (!Number.isFinite(la) || !Number.isFinite(ln)) continue;
    const name = String(t['name:ko'] || t.name || '').trim();
    if (!name) continue;
    const types = [];
    for (const k of ['amenity', 'leisure', 'tourism', 'natural', 'highway', 'railway', 'public_transport', 'shop']) {
      if (!t[k]) continue;
      const raw = `${k}=${t[k]}`;
      const mapped = OSM_TYPE[raw] || (k === 'shop' ? 'shop' : null);
      if (mapped) types.push(mapped);
      types.push(raw);
    }
    if (!types.length) continue;
    out.push({ id: `osm:${e.type || 'node'}/${e.id}`, name, types, lat: la, lng: ln, source: 'osm' });
  }
  if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
    const d = (s) => (s.lat - origin.lat) ** 2 + ((s.lng - origin.lng) * Math.cos(origin.lat * Math.PI / 180)) ** 2;
    out.sort((a, b) => d(a) - d(b));
  }
  return out.slice(0, 20);
}
