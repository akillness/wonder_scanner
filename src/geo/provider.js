// 위치 제공자 (GAMEPLAY_V7 §7.1–7.2): nearby() = google → nominatim → overpass → []. 키 게이팅은 VITE_GOOGLE_MAPS_KEY.
// 2026-09-23 실측: Overpass 공개 미러는 406/429/타임아웃이 잦아 Nominatim(경계 상자 검색, 1req/s)을 1차 무료 폴백으로 둔다.
// 카메라 프레임은 기기 밖으로 나가지 않는다 — 여기서 보내는 것은 좌표(소수점 3자리 ≈ 100m)뿐.
// 이 모듈은 game/ 을 import 하지 않는다 (spots.js 가 이쪽을 import 한다).
import { googleNearby } from './google.js';
import { osmNearby } from './osm.js';
import { nominatimNearby } from './nominatim.js';

export const COORD_DECIMALS = 3;
export const round3 = (v) => Math.round(Number(v) * 10 ** COORD_DECIMALS) / 10 ** COORD_DECIMALS;

export function googleKey() {
  try { const k = import.meta.env?.VITE_GOOGLE_MAPS_KEY; return typeof k === 'string' && k.trim() ? k.trim() : null; } catch { return null; }
}
export const hasGoogleKey = () => !!googleKey();

// ── 기하: 하버사인 거리(m), 방위(0..360, 북=0), 8방위 한글, 지도 URL (키 불필요)
const R = 6371000, rad = (d) => d * Math.PI / 180;
export function distanceM(aLat, aLng, bLat, bLng) {
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function bearingDeg(aLat, aLng, bLat, bLng) {
  const y = Math.sin(rad(bLng - aLng)) * Math.cos(rad(bLat));
  const x = Math.cos(rad(aLat)) * Math.sin(rad(bLat)) - Math.sin(rad(aLat)) * Math.cos(rad(bLat)) * Math.cos(rad(bLng - aLng));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
const WINDS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
export const bearingLabel = (deg) => WINDS[Math.round((((Number(deg) || 0) % 360) + 360) % 360 / 45) % 8];
export const distanceLabel = (m) => { const v = Math.max(0, Number(m) || 0); return v < 1000 ? `${Math.round(v)}m` : `${(v / 1000).toFixed(1)}km`; };
export const mapsUrl = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`)}`;

/** Spot 에 dist_m · bearing_deg · mapsUrl 을 붙이고 거리순 정렬 + id 중복 제거 */
export function decorate(spots, { lat, lng } = {}) {
  const seen = new Set(); const out = [];
  for (const s of Array.isArray(spots) ? spots : []) {
    if (!s || !Number.isFinite(s.lat) || !Number.isFinite(s.lng) || seen.has(s.id)) continue;
    seen.add(s.id);
    const has = Number.isFinite(lat) && Number.isFinite(lng);
    out.push({ ...s, types: Array.isArray(s.types) ? s.types : [],
      dist_m: has ? Math.round(distanceM(lat, lng, s.lat, s.lng)) : (Number.isFinite(s.dist_m) ? s.dist_m : 0),
      bearing_deg: has ? Math.round(bearingDeg(lat, lng, s.lat, s.lng)) : (Number.isFinite(s.bearing_deg) ? s.bearing_deg : 0),
      mapsUrl: s.mapsUrl || mapsUrl(s.lat, s.lng) });
  }
  return out.sort((a, b) => a.dist_m - b.dist_m);
}

/**
 * 주변 장소. google(키 있을 때) → nominatim(카테고리별 확장 반경) → overpass → []. 절대 throw 하지 않는다.
 * onBatch(spots) 는 nominatim 이 카테고리를 하나 받을 때마다 거리순 장식된 누적 결과로 호출된다 (점진 렌더용).
 * @returns {Promise<Spot[]>}  Spot = { id, name, types, lat, lng, dist_m, bearing_deg, mapsUrl, source }
 */
export async function nearby({ lat, lng, radius = 800, expandRadius = 2000, timeoutMs = 12000, fetchImpl, onBatch } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const key = googleKey(), maxM = Math.max(radius, expandRadius) * 1.2;
  const fin = (spots) => decorate(spots, { lat, lng }).filter(s => s.dist_m <= maxM);
  let spots = [];
  if (key) { try { spots = await googleNearby({ lat, lng, radius, key, timeoutMs, fetchImpl }); } catch { spots = []; } }
  if (!spots.length) {
    const batch = typeof onBatch === 'function' ? (s) => { const d = fin(s); if (d.length) onBatch(d); } : undefined;
    try { spots = await nominatimNearby({ lat, lng, radius, expandRadius, timeoutMs, fetchImpl, onBatch: batch }); } catch { spots = []; }
  }
  if (!spots.length) { try { spots = await osmNearby({ lat, lng, radius: expandRadius, timeoutMs: Math.min(timeoutMs, 6000), fetchImpl }); } catch { spots = []; } }
  return fin(spots);
}

/** 위치 권한 상태 (권한 창을 띄우지 않는다): 'granted' | 'prompt' | 'denied' | 'unknown' */
export async function geoPermission() {
  try {
    const p = globalThis.navigator?.permissions;
    if (!p || typeof p.query !== 'function') return 'unknown';
    const s = await p.query({ name: 'geolocation' });
    return s?.state || 'unknown';
  } catch { return 'unknown'; }
}
/** 지금 쓰일 제공자 이름 (표시용) */
export const providerName = () => (hasGoogleKey() ? 'Google' : 'OSM (Nominatim)');

/**
 * 옵트인 위치 요청 — 탭에서만 호출. 좌표는 소수점 3자리로 반올림 (precise: 저장하지 않는 1회 판정용 원좌표).
 * @returns {Promise<{ ok:true, lat:number, lng:number, accuracy:number }|{ ok:false, error:'unsupported'|'denied'|'unavailable'|'timeout' }>}
 */
export async function locate({ timeoutMs = 8000, maximumAge = 60000, highAccuracy = false, precise = false } = {}) {
  // 고정밀(GPS) 요청은 실내에서 타임아웃이 잦다 → 타임아웃·불가면 저정밀(Wi-Fi·기지국)로 한 번 더. 권한 거부는 재시도하지 않는다.
  if (highAccuracy) {
    const hi = await locateOnce({ timeoutMs: Math.min(timeoutMs, 7000), maximumAge, highAccuracy: true, precise });
    if (hi.ok || hi.error === 'denied' || hi.error === 'unsupported') return hi;
    return locateOnce({ timeoutMs: Math.max(3000, timeoutMs - 5000), maximumAge: Math.max(maximumAge, 120000), highAccuracy: false, precise });
  }
  return locateOnce({ timeoutMs, maximumAge, highAccuracy, precise });
}
function locateOnce({ timeoutMs, maximumAge, highAccuracy, precise }) {
  return new Promise((resolve) => {
    const geo = globalThis.navigator?.geolocation;
    if (!geo || typeof geo.getCurrentPosition !== 'function') return resolve({ ok: false, error: 'unsupported' });
    let done = false;
    const finish = (v) => { if (!done) { done = true; clearTimeout(t); resolve(v); } };
    const t = setTimeout(() => finish({ ok: false, error: 'timeout' }), timeoutMs + 500);
    try {
      geo.getCurrentPosition(
        (pos) => { const c = pos?.coords || {}; if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) return finish({ ok: false, error: 'unavailable' });
          finish({ ok: true, lat: precise ? c.latitude : round3(c.latitude), lng: precise ? c.longitude : round3(c.longitude), accuracy: Number(c.accuracy) || 0 }); },
        (err) => finish({ ok: false, error: err?.code === 1 ? 'denied' : err?.code === 3 ? 'timeout' : 'unavailable' }),
        { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge });
    } catch { finish({ ok: false, error: 'unavailable' }); }
  });
}
