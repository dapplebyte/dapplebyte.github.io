// English privacy policy HTML (in the product project) → src/content/privacy/<slug>/en.json
// Keeps the body HTML (sections, tables, callout), drops the page header, table of contents
// and "back to top" links, which the website renders in its own way.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, localProducts, slugify, writeJson } from './lib.mjs';

const SOURCE = {
  relaypad: { file: 'docs/privacy-policy.html', format: 'wrap' },
  'gamepad-pro': { file: 'docs/privacy/gamePadProV1007.html', format: 'main' },
};

/**
 * Gamepad Pro's policy: the body is everything inside <main>; the date is `<p class="updated">Last updated: …</p>`.
 * Its <h2>s have no ids, so they get one from their text (the page's table of contents links to them).
 * The policy names the developer's own mailbox as the contact; the website shows the studio address
 * instead, so every email address in the body is replaced with the product's `contactEmail`.
 */
function parseMain(html, contactEmail) {
  const updated = html.match(/<p class="updated">\s*Last updated:\s*([^<]+)<\/p>/)?.[1]?.trim();
  const date = updated ? new Date(`${updated} UTC`) : null;
  const effectiveDate = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
  let body = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
  const used = new Set();
  body = body
    .replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '')
    .replace(/<p class="updated">[\s\S]*?<\/p>/, '')
    .replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => {
      let id = slugify(inner.replace(/<[^>]+>/g, '')) || 'section';
      while (used.has(id)) id += '-2';
      used.add(id);
      return `<h2 id="${id}">${inner}</h2>`;
    })
    .replace(/<div class="table-wrap">/g, '<div class="table-scroll">')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, contactEmail)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { effectiveDate, body };
}

function parseWrap(html) {
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
  return { effectiveDate, body };
}

const products = localProducts();
for (const [slug, root] of Object.entries(products)) {
  const src = SOURCE[slug];
  if (!src) continue;
  const file = join(root, src.file);
  if (!existsSync(file)) {
    console.warn(`[privacy] ${slug}: ${src.file} missing`);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  const productFile = join(ROOT, 'src/content/products', `${slug}.json`);
  const contactEmail = existsSync(productFile) ? JSON.parse(readFileSync(productFile, 'utf8')).contactEmail : undefined;
  if (src.format === 'main' && !contactEmail) {
    console.error(`[privacy] ${slug}: contactEmail missing in src/content/products/${slug}.json`);
    process.exitCode = 1;
    continue;
  }
  const { effectiveDate, body } = src.format === 'main' ? parseMain(html, contactEmail) : parseWrap(html);
  if (!body || !effectiveDate) {
    console.error(`[privacy] ${slug}: could not parse body or effective date`);
    process.exitCode = 1;
    continue;
  }
  writeJson(`src/content/privacy/${slug}/en.json`, { slug, locale: 'en', effectiveDate, governingLocale: 'en', html: body });
  console.log(`[privacy] ${slug}: en, effective ${effectiveDate}, ${body.length} chars`);
}
