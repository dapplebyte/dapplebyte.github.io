// Raw hero screenshot → src/assets/hero/<slug>.webp
// Source: the `hero` file of products.local.json, relative to the project root: the plain full-screen
// capture the store template was built from, so the site can show it whole instead of cropping the
// phone out of the store image (whose rounded corners let the light template background through).
// One file per product: the capture is the same in every locale. Resized to at most 1280 px wide.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT, localProductEntries } from './lib.mjs';

const WIDTH = 1280;
const out = join(ROOT, 'src/assets/hero');
mkdirSync(out, { recursive: true });
for (const [slug, { root, hero }] of Object.entries(localProductEntries())) {
  if (!hero) continue;
  const src = join(root, hero);
  if (!existsSync(src)) {
    console.log(`[hero] ${slug}: ${hero} not found in the project, skipped`);
    continue;
  }
  const target = join(out, `${slug}.webp`);
  await sharp(src).flatten({ background: '#000' }).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 84 }).toFile(target);
  const meta = await sharp(target).metadata();
  console.log(`[hero] ${slug}: ${hero} → ${meta.width}×${meta.height}`);
}
