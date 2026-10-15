// Store screenshots (fastlane phoneScreenshots) → src/assets/screenshots/<slug>/<locale>/NN.webp
// Resized to 1280 px wide WebP so the repository stays small and Astro's <Image> can serve them.
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT, LOCALES, localProducts } from './lib.mjs';

const WIDTH = 1280;
const products = localProducts();
for (const [slug, root] of Object.entries(products)) {
  const base = join(root, 'fastlane/metadata/android');
  let count = 0;
  for (const locale of LOCALES) {
    const dir = join(base, locale.fastlane, 'images/phoneScreenshots');
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
    const out = join(ROOT, 'src/assets/screenshots', slug, locale.slug);
    mkdirSync(out, { recursive: true });
    for (const [i, f] of files.entries()) {
      const target = join(out, `${String(i + 1).padStart(2, '0')}.webp`);
      await sharp(join(dir, f)).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 82 }).toFile(target);
      count++;
    }
  }
  console.log(`[screenshots] ${slug}: ${count} files`);
}
