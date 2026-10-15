import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LOCALES = JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales.json'), 'utf8'));

/** `{ slug: localPath }` for every product whose source project lives on this machine. */
export function localProducts() {
  const file = join(ROOT, 'products.local.json');
  if (!existsSync(file)) {
    console.error('products.local.json is missing. Copy products.local.example.json and fill in the local paths.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(file, 'utf8'));
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
