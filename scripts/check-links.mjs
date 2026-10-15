// After `astro build`: every internal link resolves, every hreflang alternate points back,
// every page has exactly one <h1>, and every JSON-LD block parses.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT } from './lib.mjs';

const DIST = join(ROOT, 'dist');
if (!existsSync(DIST)) {
  console.error('dist/ not found, run `npm run build` first');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith('.html')) out.push(p);
  }
  return out;
}

const pages = walk(DIST);
const routes = new Set(pages.map((p) => '/' + relative(DIST, p).replace(/index\.html$/, '').replace(/\.html$/, '/').replace(/\\/g, '/')));
const files = new Set();
(function all(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) all(p);
    else files.add('/' + relative(DIST, p).replace(/\\/g, '/'));
  }
})(DIST);

const exists = (href) => {
  const path = href.split('#')[0].split('?')[0];
  if (!path) return true;
  const withSlash = path.endsWith('/') ? path : `${path}/`;
  return routes.has(withSlash) || files.has(path) || routes.has(path);
};

let errors = 0;
const alternates = new Map(); // route → Set(alternate routes)
for (const file of pages) {
  const route = '/' + relative(DIST, file).replace(/index\.html$/, '').replace(/\\/g, '/');
  const html = readFileSync(file, 'utf8');
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1s !== 1) {
    console.error(`[links] ${route}: ${h1s} <h1>`);
    errors++;
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch (e) {
      console.error(`[links] ${route}: JSON-LD does not parse: ${e.message}`);
      errors++;
    }
  }
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|tel:|#)/.test(href)) continue;
    if (!exists(href)) {
      console.error(`[links] ${route}: broken link ${href}`);
      errors++;
    }
  }
  const alts = new Set();
  for (const m of html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)) {
    const u = new URL(m[2]);
    alts.add(u.pathname);
    if (!exists(u.pathname)) {
      console.error(`[links] ${route}: hreflang ${m[1]} → ${u.pathname} does not exist`);
      errors++;
    }
  }
  alternates.set(route, alts);
}
for (const [route, alts] of alternates) {
  for (const alt of alts) {
    if (alt === route) continue;
    const back = alternates.get(alt);
    if (back && !back.has(route)) {
      console.error(`[links] ${route} lists ${alt} but ${alt} does not list it back`);
      errors++;
    }
  }
}
console.log(`[links] ${pages.length} pages checked, ${errors} errors`);
if (errors) process.exit(1);
