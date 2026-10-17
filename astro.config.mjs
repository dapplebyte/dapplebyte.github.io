// @ts-check
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import locales from './src/i18n/locales.json' with { type: 'json' };

const SITE = 'https://dapplebyte.com';

/** Pages that exist but should stay out of the sitemap until their data is verified. */
function draftPaths() {
  const out = [];
  const compareDir = new URL('./src/content/compare/', import.meta.url);
  if (existsSync(compareDir)) {
    for (const file of readdirSync(compareDir)) {
      if (!file.endsWith('.json')) continue;
      const data = JSON.parse(readFileSync(new URL(file, compareDir), 'utf8'));
      if (data.draft) {
        out.push(`/${data.slug}/compare/`, `/${data.slug}/vs/`);
      }
    }
  }
  const videosDir = new URL('./src/content/videos/', import.meta.url);
  if (existsSync(videosDir)) {
    for (const file of readdirSync(videosDir)) {
      if (!file.endsWith('.json')) continue;
      const data = JSON.parse(readFileSync(new URL(file, videosDir), 'utf8'));
      if (!data.items || data.items.length === 0) out.push(`/${data.slug}/videos/`);
    }
  }
  // Release notes of a product with no published release yet (no changelog entries): the page exists but is empty.
  const productsDir = new URL('./src/content/products/', import.meta.url);
  if (existsSync(productsDir)) {
    for (const file of readdirSync(productsDir)) {
      if (!file.endsWith('.json')) continue;
      const { slug } = JSON.parse(readFileSync(new URL(file, productsDir), 'utf8'));
      const log = new URL(`./src/content/changelog/${slug}/en.json`, import.meta.url);
      const entries = existsSync(log) ? JSON.parse(readFileSync(log, 'utf8')).entries ?? [] : [];
      if (entries.length === 0) out.push(`/${slug}/changelog/`);
    }
  }
  return out;
}

const DRAFTS = draftPaths();
const LOCALE_PREFIX = new RegExp(`^/(${locales.map((l) => l.slug).join('|')})(?=/)`);

// https://astro.build/config
export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: locales.map((l) => ({ path: l.slug, codes: [l.lang] })),
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: Object.fromEntries(locales.map((l) => [l.slug, l.lang])),
      },
      filter: (page) => {
        const path = new URL(page).pathname.replace(LOCALE_PREFIX, '');
        if (path === '/404/' || path.startsWith('/404')) return false;
        return !DRAFTS.some((d) => path.startsWith(d));
      },
    }),
  ],
});
