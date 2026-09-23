// Nominatim (OSM) 경계 상자 검색 — 키 없이 동작하는 1차 무료 폴백 (GAMEPLAY_V7 §7.2)
// 정책: 1 req/s, 브라우저는 Referer 를 자동 전송(식별 요건 충족), CORS 허용. 카테고리별 순차 조회 후 합친다.
// 절대 throw 하지 않는다 — 실패는 [].
import { OSM_TYPE } from './osm.js';

export const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
// 특수 구문(special phrases) — 영어 카테고리명이 가장 안정적으로 amenity/leisure 태그에 매핑된다
export const NOMINATIM_CATEGORIES = ['cafe', 'park', 'station', 'restaurant', 'library', 'playground', 'supermarket', 'bakery'];
const GAP_MS = 1050; // 1 req/s

export function viewbox({ lat, lng, radius = 800 }) {
  const dLat = radius / 111000, dLng = radius / (111000 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
  return [lng - dLng, lat + dLat, lng + dLng, lat - dLat].map(v => v.toFixed(6)).join(',');
}

/**
 * @param {{ lat:number, lng:number, radius?:number, timeoutMs?:number, fetchImpl?:typeof fetch, categories?:string[], enough?:number }} o
 * @returns {Promise<Array<{ id:string, name:string, types:string[], lat:number, lng:number, source:'nominatim' }>>}
 */
export async function nominatimNearby({ lat, lng, radius = 800, timeoutMs = 8000, fetchImpl, categories = NOMINATIM_CATEGORIES, enough = 14 } = {}) {
  const f = fetchImpl || globalThis.fetch;
  if (typeof f !== 'function' || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const deadline = Date.now() + timeoutMs, box = viewbox({ lat, lng, radius }), out = [], seen = new Set();
  let i = 0;
  for (const q of categories) {
    const left = deadline - Date.now(); if (left < 800) break;
    if (i++ > 0) { const wait = Math.min(GAP_MS, Math.max(0, left - 800)); await new Promise(r => setTimeout(r, wait)); }
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), Math.min(4000, Math.max(500, deadline - Date.now()))) : null;
    try {
      const url = `${NOMINATIM_ENDPOINT}?format=jsonv2&limit=10&bounded=1&viewbox=${box}&q=${encodeURIComponent(q)}&accept-language=ko`;
      const res = await f(url, { headers: { Accept: 'application/json' }, signal: ctrl?.signal });
      if (!res || !res.ok) { console.info('[geo] nominatim', q, res?.status ?? 'no-response'); if (res?.status === 429 || res?.status === 403) break; continue; }
      const json = await res.json().catch(() => null);
      for (const p of parseNominatim(json)) { if (!seen.has(p.id)) { seen.add(p.id); out.push(p); } }
      if (out.length >= enough) break;
    } catch (e) { console.info('[geo] nominatim failed:', q, e?.name || e); if (e?.name === 'AbortError') break; }
    finally { if (timer) clearTimeout(timer); }
  }
  return out;
}

/** Nominatim jsonv2 → 정규화 (이름 없는 항목 제외) */
export function parseNominatim(json) {
  const rows = Array.isArray(json) ? json : [];
  const out = [];
  for (const p of rows) {
    const la = Number(p?.lat), ln = Number(p?.lon); if (!Number.isFinite(la) || !Number.isFinite(ln)) continue;
    const name = String(p?.name || '').trim(); if (!name) continue; // 이름 없는 노드(동·구역)는 제외
    const cat = String(p?.category || p?.class || ''), typ = String(p?.type || ''), raw = cat && typ ? `${cat}=${typ}` : '';
    const mapped = OSM_TYPE[raw] || (cat === 'shop' ? 'shop' : cat === 'railway' && typ === 'station' ? 'train_station' : cat === 'amenity' && typ === 'fast_food' ? 'restaurant' : null);
    const types = [mapped, raw].filter(Boolean); if (!types.length) continue;
    out.push({ id: `nominatim:${p.osm_type || 'n'}/${p.osm_id ?? `${la.toFixed(5)},${ln.toFixed(5)}`}`, name, types, lat: la, lng: ln, source: 'nominatim' });
  }
  return out;
}
