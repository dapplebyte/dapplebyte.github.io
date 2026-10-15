import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LOCALES = JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales.json'), 'utf8'));

/**
 * products.local.json, normalised. Each value may be a string (the project root) or an object
 * `{ "root": "...", "screenshots": "store/export/site", "hero": "store/shots/02-stream.png" }` where
 * `screenshots` is relative to the root and replaces `fastlane/metadata/android` as the place to look for
 * `<fastlane-locale>/images/phoneScreenshots`, and `hero` is the raw full-screen capture (no store
 * template around it) that the home page card and the product page hero show whole, without cropping.
 * Returns `{ slug: { root, screenshots?, hero? } }`.
 */
export function localProductEntries() {
  const file = join(ROOT, 'products.local.json');
  if (!existsSync(file)) {
    console.error('products.local.json is missing. Copy products.local.example.json and fill in the local paths.');
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const out = {};
  for (const [slug, value] of Object.entries(raw)) {
    if (typeof value === 'string') out[slug] = { root: value };
    else if (value && typeof value.root === 'string') out[slug] = { root: value.root, screenshots: value.screenshots, hero: value.hero };
    else console.warn(`[products.local] ${slug}: expected a path or { "root": "..." }, skipped`);
  }
  return out;
}

/** `{ slug: projectRoot }` for every product whose source project lives on this machine. */
export function localProducts() {
  return Object.fromEntries(Object.entries(localProductEntries()).map(([slug, e]) => [slug, e.root]));
}

/**
 * Per-product exceptions to the folder names in src/i18n/locales.json.
 * `fastlane`: website locale → fastlane folder. `android`: website locale → res folder, or null when the
 * app has no translation for that locale (the locale is skipped, which is not an error).
 */
const LOCALE_OVERRIDES = {
  /** Apk Extractor: the app's Portuguese is `values-pt` (the site's pt-br); every other locale uses the default folders. */
  'apk-extractor': {
    android: { 'pt-br': 'values-pt' },
  },
  'gamepad-pro': {
    fastlane: { es: 'es-419' },
    android: { 'pt-br': 'values-pt', id: null, vi: null },
  },
  /** The app has no Dutch or Polish; the store listing has both, so only the FAQ falls back to English. */
  'gamepad-tester': {
    android: { nl: null, pl: null },
  },
};

/** fastlane metadata folder name for a website locale. */
export function fastlaneLocale(slug, locale) {
  return LOCALE_OVERRIDES[slug]?.fastlane?.[locale.slug] ?? locale.fastlane;
}

/** Android res folder for a website locale, or null when the app is not translated into it. */
export function androidValues(slug, locale) {
  const map = LOCALE_OVERRIDES[slug]?.android ?? {};
  return locale.slug in map ? map[locale.slug] : locale.android;
}

export function writeJson(relPath, data) {
  const file = join(ROOT, relPath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  return file;
}

export function readText(file) {
  return readFileSync(file, 'utf8');
}

export const now = () => new Date().toISOString().slice(0, 10);

/** Android string resource unescape: \' \" \n \@ \? and the XML entities. */
export function unescapeAndroid(s) {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\@/g, '@')
    .replace(/\\\?/g, '?')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+\n/g, '\n')
    .trim();
}

/** Parse `<string name="x">y</string>` pairs out of a strings.xml file. */
export function parseStrings(xml) {
  const out = new Map();
  const re = /<string\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/string>/g;
  let m;
  while ((m = re.exec(xml))) {
    let body = m[2];
    const cdata = body.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
    if (cdata) body = cdata[1];
    out.set(m[1], unescapeAndroid(body));
  }
  return out;
}

export function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
