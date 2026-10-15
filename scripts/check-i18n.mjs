// Every locale's UI strings must have exactly the English key set, with the same {placeholders}.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, LOCALES } from './lib.mjs';

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
const placeholders = (s) => (typeof s === 'string' ? (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort().join(',') : '');

const en = flatten(JSON.parse(readFileSync(join(ROOT, 'src/i18n/en.json'), 'utf8')));
const enKeys = Object.keys(en);
/** Keys whose English value is only a brand name, an address or placeholders, so staying identical is correct. */
const SAME_OK = new Set(['site.name', 'site.email', 'footer.copyright', 'product.title', 'features.title', 'products.relaypad.kicker', 'products.joylink.kicker', 'compare.vsTitle']);
let failed = false;
for (const locale of LOCALES) {
  if (locale.slug === 'en') continue;
  const file = join(ROOT, 'src/i18n', `${locale.slug}.json`);
  if (!existsSync(file)) {
    console.error(`[i18n] ${locale.slug}: file missing`);
    failed = true;
    continue;
  }
  const data = flatten(JSON.parse(readFileSync(file, 'utf8')));
  const missing = enKeys.filter((k) => !(k in data) || data[k] === '');
  const extra = Object.keys(data).filter((k) => !(k in en));
  const badPlaceholders = enKeys.filter((k) => k in data && placeholders(en[k]) !== placeholders(data[k]));
  const untranslated = enKeys.filter((k) => !SAME_OK.has(k) && k in data && typeof en[k] === 'string' && en[k].length > 12 && data[k] === en[k] && !/^[A-Z0-9 ·+.-]+$/.test(en[k]));
  if (missing.length || extra.length || badPlaceholders.length) failed = true;
  const parts = [];
  if (missing.length) parts.push(`${missing.length} missing (${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''})`);
  if (extra.length) parts.push(`${extra.length} extra (${extra.slice(0, 3).join(', ')})`);
  if (badPlaceholders.length) parts.push(`placeholders differ: ${badPlaceholders.slice(0, 3).join(', ')}`);
  if (untranslated.length) parts.push(`${untranslated.length} identical to English (warning)`);
  console.log(`[i18n] ${locale.slug}: ${parts.length ? parts.join('; ') : 'ok'}`);
}
if (failed) {
  console.error('[i18n] FAILED');
  process.exit(1);
}
