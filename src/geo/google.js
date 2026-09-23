// Google Places API (New) — Nearby Search (GAMEPLAY_V7 §7.2)
// POST https://places.googleapis.com/v1/places:searchNearby
// 헤더: X-Goog-Api-Key, X-Goog-FieldMask (필드 최소화 = 과금 최소화). 언어 ko, 최대 20건, 8초 타임아웃.
// 이 모듈은 절대 throw 하지 않는다 — 실패는 [] 로 돌려주고 provider 가 OSM 으로 폴백한다.
// 키는 HTTP 리퍼러 제한을 걸어 쓴다 (docs/CLOUD_SETUP.md "Google Places API 키").

export const GOOGLE_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';
export const GOOGLE_FIELD_MASK = 'places.id,places.displayName,places.types,places.location';

// 7.3 매핑의 키 목록 (Places API (New) Table A 유형만 — 잘못된 유형 하나가 요청 전체를 400 으로 만들므로 보수적으로 유지)
export const GOOGLE_TYPES = [
  'cafe', 'coffee_shop', 'bakery',
  'restaurant', 'food_court',
  'park', 'playground', 'dog_park',
  'zoo', 'aquarium',
  'marina',
  'library', 'book_store',
  'bus_station', 'train_station', 'transit_station',
  'shopping_mall', 'supermarket',
  'gym', 'stadium',
];

/**
 * @param {{ lat:number, lng:number, radius?:number, key:string, includedTypes?:string[], timeoutMs?:number, fetchImpl?:typeof fetch }} o
 * @returns {Promise<Array<{ id:string, name:string, types:string[], lat:number, lng:number, source:'google' }>>}
 */
export async function googleNearby({ lat, lng, radius = 800, key, includedTypes = GOOGLE_TYPES, timeoutMs = 8000, fetchImpl } = {}) {
  const f = fetchImpl || globalThis.fetch;
  if (!key || typeof f !== 'function' || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const body = {
      includedTypes: includedTypes.slice(0, 50),
      maxResultCount: 20,
      languageCode: 'ko',
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: Math.min(50000, Math.max(1, radius)) } },
    };
    const res = await f(GOOGLE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': GOOGLE_FIELD_MASK },
      body: JSON.stringify(body),
      signal: ctrl?.signal,
    });
    if (!res || !res.ok) { console.info('[geo] google places', res?.status ?? 'no-response'); return []; }
    const json = await res.json().catch(() => null);
    return parseGooglePlaces(json);
  } catch (e) {
    console.info('[geo] google places failed:', e?.name || e);
    return [];
  } finally { if (timer) clearTimeout(timer); }
}

/** 응답 → 정규화. 필드가 비어 있어도 안전하게. */
export function parseGooglePlaces(json) {
  const places = Array.isArray(json?.places) ? json.places : [];
  const out = [];
  for (const p of places) {
    const la = Number(p?.location?.latitude), ln = Number(p?.location?.longitude);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) continue;
    const name = String(p?.displayName?.text ?? p?.displayName ?? '').trim();
    if (!name) continue;
    const id = String(p?.id ?? `g:${la.toFixed(5)},${ln.toFixed(5)}`);
    const types = Array.isArray(p?.types) ? p.types.map(String) : [];
    out.push({ id, name, types, lat: la, lng: ln, source: 'google' });
    if (out.length >= 20) break;
  }
  return out;
}
