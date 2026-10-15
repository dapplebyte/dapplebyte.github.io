// docs/privacy-policy.html (English, in the product project) → src/content/privacy/<slug>/en.json
// Keeps the body HTML (sections, tables, callout), drops the page header, table of contents
// and "back to top" links, which the website renders in its own way.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localProducts, writeJson } from './lib.mjs';

const SOURCE = { relaypad: 'docs/privacy-policy.html' };

const products = localProducts();
for (const [slug, root] of Object.entries(products)) {
  const rel = SOURCE[slug];
  if (!rel) continue;
  const file = join(root, rel);
  if (!existsSync(file)) {
    console.warn(`[privacy] ${slug}: ${file} missing`);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  const effective = html.match(/Effective date:<\/strong>\s*([^<]+)</)?.[1]?.trim();
  const date = effective ? new Date(effective) : null;
  const effectiveDate = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
  let body = html.match(/<div class="wrap"[^>]*>([\s\S]*)<\/div>\s*<\/body>/)?.[1] ?? '';
  body = body
    .replace(/<header>[\s\S]*?<\/header>/, '')
    .replace(/<nav class="toc"[\s\S]*?<\/nav>/, '')
    .replace(/<p class="top">[\s\S]*?<\/p>/g, '')
    .replace(/<footer>[\s\S]*?<\/footer>/, '')
    .replace(/<span class="num">[^<]*<\/span>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!body || !effectiveDate) {
    console.error(`[privacy] ${slug}: could not parse body or effective date`);
    process.exitCode = 1;
    continue;
  }
  writeJson(`src/content/privacy/${slug}/en.json`, { slug, locale: 'en', effectiveDate, governingLocale: 'en', html: body });
  console.log(`[privacy] ${slug}: en, effective ${effectiveDate}, ${body.length} chars`);
}
