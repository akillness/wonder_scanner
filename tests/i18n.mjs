// 한/영 번역 계층 검증 (노드, DOM 없음): 사전 커버리지 + tr() 의 정확 일치·공백 보존·템플릿 조각 치환·조사 보호
import assert from 'node:assert/strict';
import { extract } from '../scripts/i18n-check.mjs';
import en from '../src/i18n/en.js';
import { tr, useDictionary } from '../src/i18n/index.js';

const rows = extract();
const missing = rows.filter(r => !Object.prototype.hasOwnProperty.call(en, r.text));
const hangul = Object.entries(en).filter(([, v]) => /[가-힣]/.test(v));
assert.equal(hangul.length, 0, 'no English value may contain Hangul');
// 새 문자열이 조금 늘어도 치명적이지 않지만, 커버리지가 무너지면 실패시킨다
assert.ok(missing.length <= Math.ceil(rows.length * 0.02), `dictionary covers the source (missing ${missing.length}/${rows.length}): ${missing.slice(0, 5).map(r => r.text).join(' | ')}`);

// 한국어 모드: 그대로
useDictionary(en, 'ko');
assert.equal(tr('책상 위의 우주'), '책상 위의 우주');

useDictionary(en, 'en');
assert.equal(tr('책상 위의 우주'), en['책상 위의 우주'], 'exact match');
assert.equal(tr('  책상 위의 우주 '), `  ${en['책상 위의 우주']} `, 'surrounding whitespace preserved');
const mixed = tr('책상 위의 우주 3개 남음 · 💻 laptop');
assert.ok(!/[가-힣]/.test(mixed), `template pieces are translated around runtime values: ${mixed}`);
assert.match(mixed, /3 left/, 'fragment keeps the space English needs');
assert.equal(tr('스타벅스 강남점'), '스타벅스 강남점', 'unknown proper nouns are left alone');
assert.equal(tr('cup · 87%'), 'cup · 87%', 'non-Korean text untouched');
// 숫자 단위어·한 글자 단어 마지막 패스
for (const [ko, want] of [['23h 15분', '23h 15m'], ['Perfect capture 2회', 'Perfect capture 2×'], ['Prism Tokens 0개', 'Prism Tokens 0'], ['0장 · 0KB', '0 photos · 0KB']]) assert.equal(tr(ko), want);
assert.ok(!/[가-힣]/.test(tr('별 · Writing captions')), 'single-word stage names are translated by the final pass');
assert.equal(tr('1회용 컵'), tr('1회용 컵'), 'deterministic');
useDictionary(null, 'ko');

console.log('I18N PASS', { strings: rows.length, translated: rows.length - missing.length, missing: missing.length });
