// Privacy policy HTML (in the product project) → src/content/privacy/<slug>/<locale>.json
// Keeps the body HTML (sections, tables, callout), drops the page header, table of contents
// and "back to top" links, which the website renders in its own way. Most policies are English only (en.json);
// a `bilingual` policy also yields its translation (SlopSwipe: zh-tw.json).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, localProducts, parseStrings, slugify, writeJson } from './lib.mjs';

const SOURCE = {
  slopswipe: { file: 'backend/firebase/site/privacy/index.html', format: 'bilingual', firstLocale: 'zh-tw', appealUrlFrom: 'app/src/main/res/values/backend.xml' },
  'apk-extractor': { file: 'policy/AppExtractorPrivacyPolicyV915.html', format: 'wrap' },
  relaypad: { file: 'docs/privacy-policy.html', format: 'wrap' },
  'gamepad-pro': { file: 'docs/privacy/gamePadProV1007.html', format: 'main' },
  whendo: { file: 'app/src/main/assets/privacy-policy.html', format: 'body' },
  joylink: { file: 'app/src/main/assets/privacy-policy.html', format: 'body' },
  'gamepad-tester': { file: 'docs/GamepadTesterV915.html', format: 'wrap' },
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

/**
 * WhenDo's and JoyLink's policies (the offline page the app shows): the body is everything inside <body>;
 * the date is a `<p>Last updated: …</p>` after the <h1> (JoyLink gives that <p> a class). Its <h2>s get ids
 * from their text, its tables get the scroll wrapper (JoyLink's own `table-wrap` is replaced, bare tables
 * are wrapped), its `highlight` boxes become the site's callouts, and every email address becomes the
 * product's `contactEmail` (the file names the developer's own mailbox).
 */
function parseBody(html, contactEmail) {
  const updated = html.match(/<p(?: class="[^"]*")?>\s*Last updated:\s*([^<]+)<\/p>/)?.[1]?.trim();
  const date = updated ? new Date(`${updated} UTC`) : null;
  const effectiveDate = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
  let body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? '';
  const used = new Set();
  body = body
    .replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '')
    .replace(/<p(?: class="[^"]*")?>\s*Last updated:[\s\S]*?<\/p>/, '')
    .replace(/<div class="table-wrap">\s*<table>/g, '<table>')
    .replace(/<\/table>\s*<\/div>/g, '</table>')
    .replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => {
      let id = slugify(inner.replace(/<[^>]+>/g, '')) || 'section';
      while (used.has(id)) id += '-2';
      used.add(id);
      return `<h2 id="${id}">${inner}</h2>`;
    })
    .replace(/<table>/g, '<div class="table-scroll">\n<table>')
    .replace(/<\/table>/g, '</table>\n</div>')
    .replace(/class="highlight"/g, 'class="callout"')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, contactEmail)
    .replace(/^ {4}/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { effectiveDate, body };
}

/**
 * Relaypad's and Gamepad Tester Pro's policies (the same template): the body is the `.wrap` div minus the
 * page header, table of contents, "back to top" links and footer. Gamepad Tester Pro's effective date
 * carries a parenthetical ("replaces the version of …") and its contact is the developer's own mailbox,
 * so the parenthetical is dropped before parsing and every email address becomes the product's `contactEmail`.
 */
function parseWrap(html, contactEmail) {
  const effective = html.match(/Effective date:<\/strong>\s*([^<]+)</)?.[1]?.replace(/\s*\(.*\)\s*$/, '').trim();
  const date = effective ? new Date(effective) : null;
  const effectiveDate = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
  let body = html.match(/<div class="wrap"[^>]*>([\s\S]*)<\/div>\s*<\/body>/)?.[1] ?? '';
  body = body
    .replace(/<header>[\s\S]*?<\/header>/, '')
    .replace(/<nav class="toc"[\s\S]*?<\/nav>/, '')
    .replace(/<p class="top">[\s\S]*?<\/p>/g, '')
    .replace(/<footer>[\s\S]*?<\/footer>/, '')
    .replace(/<span class="num">[^<]*<\/span>/g, '')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (m) => contactEmail ?? m)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { effectiveDate, body };
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * SlopSwipe's policy: one page inside <main>, the translation first (Traditional Chinese) and then the English text from
 * `<h1 id="en">`, after an <hr>. Each half loses its <h1> and its date line (`<p class="muted">`, which in the first half
 * also links "English version below"). The <h2>s are numbered ("1. What the accessibility service reads"): the number is
 * dropped, because the site's table of contents is an ordered list, and both halves get the ids of the English headings
 * by position, so a section has the same anchor in every language. `.summary` becomes the site's callout, every table
 * gets the scroll wrapper (the policy's own `.wrap` div is dropped), every email address becomes the product's
 * `contactEmail`, and the relative link to the creator appeal page (`../appeal/`, relative to where the app hosts its policy) becomes
 * `appealHref`.
 */
function parseBilingual(html, contactEmail, appealHref) {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
  const split = main.indexOf('<h1 id="en"');
  if (split < 0) return { effectiveDate: '', parts: [] };
  const halves = [main.slice(0, split), main.slice(split)];
  const effective = halves[1].match(/<p class="muted">\s*Effective\s+([^<]+?)\s*<\/p>/)?.[1];
  const date = effective ? new Date(`${effective} UTC`) : null;
  const effectiveDate = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
  const headings = (h) => [...h.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => m[1].replace(/^\s*\d+\.\s*/, ''));
  const used = new Set();
  const ids = headings(halves[1]).map((title) => {
    let id = slugify(title.replace(/<[^>]+>/g, '')) || 'section';
    while (used.has(id)) id += '-2';
    used.add(id);
    return id;
  });
  const parts = halves.map((half) => {
    let n = 0;
    const body = half
      .replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '')
      .replace(/<p class="muted">[\s\S]*?<\/p>/, '')
      .replace(/<hr\s*\/?>/g, '')
      .replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => `<h2 id="${ids[n++] ?? `section-${n}`}">${inner.replace(/^\s*\d+\.\s*/, '')}</h2>`)
      .replace(/<div class="summary">/g, '<div class="callout">')
      .replace(/<div class="wrap">\s*<table>/g, '<table>')
      .replace(/<\/table>\s*<\/div>/g, '</table>')
      .replace(/<table>/g, '<div class="table-scroll">\n<table>')
      .replace(/<\/table>/g, '</table>\n</div>')
      .replace(EMAIL, contactEmail)
      .replace(/href="\.\.\/appeal\/"/g, `href="${appealHref}"`)
      .replace(/^ {2}/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return { body, headingCount: n };
  });
  if (parts[0].headingCount !== ids.length) {
    console.error(`[privacy] bilingual policy: ${parts[0].headingCount} headings in the translation, ${ids.length} in English; anchors would not line up`);
    process.exitCode = 1;
  }
  return { effectiveDate, parts: parts.map((p) => p.body) };
}

/**
 * The absolute address of the creator appeal page: `appeal_url` in the product's backend.xml. When that is missing or
 * a placeholder value, appeals go to the contact address instead, with a subject line, and a warning is printed;
 * re-running the extract once backend.xml has the real address switches the link over.
 */
function appealHref(slug, root, src, contactEmail) {
  const file = join(root, src.appealUrlFrom);
  const url = existsSync(file) ? parseStrings(readFileSync(file, 'utf8')).get('appeal_url') : undefined;
  if (url && /^https:\/\//.test(url) && !/placeholder/i.test(url)) return url;
  console.warn(`[privacy] ${slug}: appeal_url in ${src.appealUrlFrom} is ${url ? 'still a placeholder' : 'missing'}; the policy's appeal link points to ${contactEmail} for now`);
  return `mailto:${contactEmail}?subject=SlopSwipe%20creator%20appeal`;
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
  if (!contactEmail) {
    console.error(`[privacy] ${slug}: contactEmail missing in src/content/products/${slug}.json`);
    process.exitCode = 1;
    continue;
  }
  if (src.format === 'bilingual') {
    const { effectiveDate, parts } = parseBilingual(html, contactEmail, appealHref(slug, root, src, contactEmail));
    if (parts.length !== 2 || parts.some((p) => !p) || !effectiveDate) {
      console.error(`[privacy] ${slug}: could not parse the two halves or the effective date`);
      process.exitCode = 1;
      continue;
    }
    const [translated, english] = parts;
    writeJson(`src/content/privacy/${slug}/en.json`, { slug, locale: 'en', effectiveDate, governingLocale: 'en', html: english });
    writeJson(`src/content/privacy/${slug}/${src.firstLocale}.json`, { slug, locale: src.firstLocale, effectiveDate, governingLocale: 'en', html: translated });
    console.log(`[privacy] ${slug}: en + ${src.firstLocale}, effective ${effectiveDate}, ${english.length} + ${translated.length} chars`);
    continue;
  }
  const { effectiveDate, body } = src.format === 'main' ? parseMain(html, contactEmail) : src.format === 'body' ? parseBody(html, contactEmail) : parseWrap(html, contactEmail);
  if (!body || !effectiveDate) {
    console.error(`[privacy] ${slug}: could not parse body or effective date`);
    process.exitCode = 1;
    continue;
  }
  writeJson(`src/content/privacy/${slug}/en.json`, { slug, locale: 'en', effectiveDate, governingLocale: 'en', html: body });
  console.log(`[privacy] ${slug}: en, effective ${effectiveDate}, ${body.length} chars`);
}
