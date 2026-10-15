// Store listing (fastlane metadata) → src/content/product-copy/<slug>/<locale>.json
// The full description has a fixed shape: an optional opening line, then blocks that start
// with an `<emoji> <b>Title</b>` line followed by paragraphs or `•` bullets. Section ids are
// assigned by position so every locale lines up with the English order.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES, localProducts, writeJson, now } from './lib.mjs';

/** Position → section id. Must match the number of `<b>` headings in full_description.txt. */
const SECTION_IDS = {
  relaypad: [
    'intro',
    'use-cases',
    'virtual-gamepad',
    'console-streaming',
    'remote-play-away',
    'connection-doctor',
    'guided-setup',
    'pricing',
    'privacy',
    'before-you-buy',
    'support',
    'trademark',
  ],
};

function parseFullDescription(text, ids) {
  const lines = text.replace(/\r/g, '').split('\n');
  let requires;
  const sections = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(/<b>(.*?)<\/b>/);
    if (heading) {
      current = { id: ids[sections.length] ?? `section-${sections.length + 1}`, title: heading[1].trim(), paragraphs: [], bullets: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      requires = requires ? `${requires} ${line}` : line;
      continue;
    }
    if (/^[•\-*·]\s*/.test(line)) current.bullets.push(line.replace(/^[•\-*·]\s*/, ''));
    else if (/^Source code/i.test(line) || /codeberg\.org/.test(line)) continue; // the hero already links the source
    else current.paragraphs.push(line.replace(/<\/?[^>]+>/g, ''));
  }
  return { requires, sections };
}

const products = localProducts();
for (const [slug, root] of Object.entries(products)) {
  const ids = SECTION_IDS[slug];
  if (!ids) {
    console.warn(`[store-copy] no SECTION_IDS for ${slug}, skipping`);
    continue;
  }
  const base = join(root, 'fastlane/metadata/android');
  let written = 0;
  for (const locale of LOCALES) {
    const dir = join(base, locale.fastlane);
    if (!existsSync(join(dir, 'full_description.txt'))) {
      console.warn(`[store-copy] ${slug}/${locale.slug}: no fastlane folder ${locale.fastlane}`);
      continue;
    }
    const title = readFileSync(join(dir, 'title.txt'), 'utf8').trim();
    const shortDescription = readFileSync(join(dir, 'short_description.txt'), 'utf8').trim();
    const { requires, sections } = parseFullDescription(readFileSync(join(dir, 'full_description.txt'), 'utf8'), ids);
    if (sections.length !== ids.length) {
      console.error(`[store-copy] ${slug}/${locale.slug}: expected ${ids.length} sections, found ${sections.length}`);
      process.exitCode = 1;
      continue;
    }
    const intro = sections[0];
    const tagline = intro.paragraphs[0] ?? shortDescription;
    writeJson(`src/content/product-copy/${slug}/${locale.slug}.json`, {
      slug,
      locale: locale.slug,
      title,
      shortDescription,
      requires,
      tagline,
      sections,
      extractedAt: now(),
    });
    written++;
  }
  console.log(`[store-copy] ${slug}: ${written} locales`);
}
