// Store screenshots → src/assets/screenshots/<slug>/<locale>/NN.webp
// Source: `<project>/fastlane/metadata/android/<fastlane-locale>/images/phoneScreenshots`, or, when
// products.local.json gives `{ "root": ..., "screenshots": "<dir>" }`, `<project>/<dir>/<fastlane-locale>/images/phoneScreenshots`.
// Files are taken in name order. Resized to at most 1280 px wide WebP so the repository stays small
// and Astro's <Image> can serve them. A product whose folder does not exist yet is skipped.
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT, LOCALES, localProductEntries, fastlaneLocale } from './lib.mjs';

const WIDTH = 1280;
const products = localProductEntries();
for (const [slug, { root, screenshots }] of Object.entries(products)) {
  const base = join(root, screenshots ?? 'fastlane/metadata/android');
  if (!existsSync(base)) {
    console.log(`[screenshots] ${slug}: ${screenshots ?? 'fastlane/metadata/android'} not found in the project yet, skipped`);
    continue;
  }
  let count = 0;
  let locales = 0;
  for (const locale of LOCALES) {
    const dir = join(base, fastlaneLocale(slug, locale), 'images/phoneScreenshots');
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
    if (files.length === 0) continue;
    const out = join(ROOT, 'src/assets/screenshots', slug, locale.slug);
    mkdirSync(out, { recursive: true });
    for (const [i, f] of files.entries()) {
      const target = join(out, `${String(i + 1).padStart(2, '0')}.webp`);
      await sharp(join(dir, f)).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 82 }).toFile(target);
      count++;
    }
    locales++;
  }
  console.log(`[screenshots] ${slug}: ${count} files in ${locales} locales`);
}
