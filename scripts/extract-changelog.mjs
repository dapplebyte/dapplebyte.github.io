// fastlane changelogs/<versionCode>.txt → src/content/changelog/<slug>/<locale>.json
// Version names and dates come from src/content/products/<slug>.json (`versions`). When `versions` is
// set, only those builds are published; older changelog files in the project are left out.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, LOCALES, localProducts, fastlaneLocale, writeJson, now } from './lib.mjs';

const products = localProducts();
for (const [slug, root] of Object.entries(products)) {
  const productFile = join(ROOT, 'src/content/products', `${slug}.json`);
  const product = existsSync(productFile) ? JSON.parse(readFileSync(productFile, 'utf8')) : {};
  const versions = new Map((product.versions ?? []).map((v) => [v.code, v]));
  const base = join(root, 'fastlane/metadata/android');
  let written = 0;
  for (const locale of LOCALES) {
    const dir = join(base, fastlaneLocale(slug, locale), 'changelogs');
    if (!existsSync(dir)) continue;
    const entries = readdirSync(dir)
      .filter((f) => /^\d+\.txt$/.test(f))
      .map((f) => Number(f.replace('.txt', '')))
      .filter((code) => versions.size === 0 || versions.has(code))
      .sort((a, b) => b - a)
      .map((code) => {
        const v = versions.get(code) ?? {};
        const items = readFileSync(join(dir, `${code}.txt`), 'utf8')
          .split('\n')
          .map((l) => l.trim().replace(/^[•\-*·]\s*/, ''))
          .filter(Boolean);
        return { code, name: v.name ?? String(code), date: v.date, items };
      });
    writeJson(`src/content/changelog/${slug}/${locale.slug}.json`, { slug, locale: locale.slug, entries, extractedAt: now() });
    written++;
  }
  console.log(`[changelog] ${slug}: ${written} locales`);
}
