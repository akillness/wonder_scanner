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
assert.equal(calls[0].options.headers.Accept, 'application/json');

console.log('GEO PASS', { spots: fetched.length, requests: calls.length });
