// 영어 사전 커버리지 점검 (v8.4): src/**/*.js 의 한국어 문자열 리터럴·템플릿 조각(주석 제외)을 AST 로 뽑아
// src/i18n/en.js 에 없는 것을 출력한다. `npm run i18n:check` · `--json` 이면 누락 목록을 JSON 으로 (번역 작업 입력용).
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rollup/parseAst';

const H = /[가-힣]/;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const walkDir = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walkDir(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
const files = walkDir(path.join(root, 'src')).filter(f => !f.endsWith(path.join('i18n', 'en.js')));

export function extract() {
  const map = new Map();
  const add = (text, kind, file, ctx) => { if (!H.test(text) || map.has(text)) return; map.set(text, { text, kind, file: path.relative(root, file), ctx }); };
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const walk = (n) => {
      if (!n || typeof n.type !== 'string') return;
      if (n.type === 'Literal' && typeof n.value === 'string') add(n.value, 'literal', f, null);
      if (n.type === 'TemplateLiteral') { const many = n.quasis.length > 1; for (const q of n.quasis) add(q.value.cooked ?? q.value.raw, many ? 'fragment' : 'literal', f, many ? src.slice(n.start, n.end).slice(0, 400) : null); }
      for (const [k, v] of Object.entries(n)) { if (k === 'quasis') continue; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object' && typeof v.type === 'string') walk(v); }
    };
    walk(parseAst(src));
  }
  return [...map.values()];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dict = (await import(path.join(root, 'src/i18n/en.js'))).default;
  const rows = extract();
  const missing = rows.filter(r => !Object.prototype.hasOwnProperty.call(dict, r.text));
  const hangulValues = Object.entries(dict).filter(([, v]) => H.test(v));
  if (process.argv.includes('--json')) { process.stdout.write(JSON.stringify(missing, null, 1)); process.exit(0); }
  console.log(`i18n: ${rows.length - missing.length}/${rows.length} strings translated · ${missing.length} missing · ${hangulValues.length} values still contain Hangul`);
  for (const r of missing.slice(0, 40)) console.log(`  - ${r.file}: ${JSON.stringify(r.text).slice(0, 90)}`);
  process.exit(hangulValues.length ? 1 : 0);
}
