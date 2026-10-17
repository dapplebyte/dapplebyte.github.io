// Store listing (fastlane metadata) → src/content/product-copy/<slug>/<locale>.json
// Section ids are assigned by position so every locale lines up with the English order.
//
// Two listing shapes are supported:
// - `bold`  (Relaypad): an optional opening line, then blocks that start with an `<emoji> <b>Title</b>`
//   line followed by paragraphs or `•` bullets.
//   WhenDo uses the same shape with three options: `taglineFromTitle` (the hero line is the first heading,
//   not the first paragraph), `stripParagraphEmoji`, and `quotedBulletsAsParagraphs` (section ids whose
//   bullets that start with a quotation mark are example prompts, kept as paragraphs so they stay next
//   to their "Try requests such as:" line instead of being mixed into the feature bullets).
//   JoyLink adds `dropParagraphsStartingWith` (paragraphs that open with one of these emoji are left out:
//   its 🎯 closing line repeats the hero tagline and has no heading of its own).
//   Apk Extractor is the plain `bold` shape with `taglineFromTitle`: 14 `<emoji> <b>Title</b>` headings, the last
//   one (🎯) a closing line with a heading of its own and no body, kept as the `outro` section.
//   Gamepad Tester Pro is the plain `bold` shape with `taglineFromTitle` (12 headings, no closing line).
//   SlopSwipe is the plain `bold` shape with `taglineFromTitle` (10 headings; the last one is the support line).
// Every email address in the copy is replaced with the product's `contactEmail` (products/<slug>.json):
// a listing may still name the developer's own mailbox, and the site shows the studio address.
// - `emoji` (Gamepad Pro): no <b> tags. The first three paragraphs are the intro (the first one starts
//   with 👍); after that every block starts with an `<emoji> Title` line, followed by paragraphs,
//   `•` bullets or a `1.` numbered list (kept as bullets).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, LOCALES, localProducts, fastlaneLocale, writeJson, now } from './lib.mjs';

/** Position → section id. Must match the number of headings in full_description.txt. */
const CONFIG = {
  slopswipe: {
    format: 'bold',
    taglineFromTitle: true,
    stripParagraphEmoji: true,
    ids: ['intro', 'use-cases', 'detection', 'auto-swipe', 'schedule', 'wellbeing', 'guides', 'privacy', 'note', 'support'],
  },
  'apk-extractor': {
    format: 'bold',
    taglineFromTitle: true,
    stripParagraphEmoji: true,
    ids: [
      'intro',
      'use-cases',
      'extract',
      'version-history',
      'installer',
      'migration',
      'compare',
      'manager',
      'analyzer',
      'stats',
      'transfer',
      'settings',
      'privacy',
      'outro',
    ],
  },
  relaypad: {
    format: 'bold',
    ids: [
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
  },
  whendo: {
    format: 'bold',
    taglineFromTitle: true,
    stripParagraphEmoji: true,
    quotedBulletsAsParagraphs: ['ai'],
    ids: ['intro', 'ai', 'clicker', 'triggers', 'actions', 'workflows', 'ideas', 'privacy', 'audience', 'outro'],
  },
  joylink: {
    format: 'bold',
    taglineFromTitle: true,
    stripParagraphEmoji: true,
    dropParagraphsStartingWith: ['🎯'],
    ids: [
      'intro',
      'use-cases',
      'gamepad',
      'touchpad',
      'tv-remote',
      'layouts-macros',
      'racing-wheel',
      'themes',
      'long-sessions',
      'pricing',
      'privacy',
      'before-you-install',
    ],
  },
  'gamepad-tester': {
    format: 'bold',
    taglineFromTitle: true,
    stripParagraphEmoji: true,
    ids: [
      'intro',
      'use-cases',
      'full-test',
      'button-test',
      'stick-drift',
      'latency',
      'vibration',
      'led',
      'motion-touchpad',
      'controller-info',
      'please-note',
      'support',
    ],
  },
  'gamepad-pro': {
    format: 'emoji',
    introParagraphs: 3,
    ids: [
      'intro',
      'drag-map-play',
      'mapping',
      'multi-button',
      'profiles',
      'phases',
      'phase-switch',
      'combos',
      'macros',
      'turbo',
      'vibration',
      'any-game',
      'no-root',
      'controllers',
      'get-started',
      'permissions',
      'keyboard',
      'compatibility',
      'help',
    ],
  },
};

const BULLET = /^[•\-*·]\s*/;
const NUMBERED = /^\d+[.)]\s+/;
/** One emoji: a pictograph with optional variation selector / skin tone / ZWJ sequence. */
const EMOJI = '(?:\\p{Extended_Pictographic}|\\p{Emoji_Modifier}|\\uFE0F|\\u200D|\\u20E3)';
const LEADING_EMOJI = new RegExp(`^(?:${EMOJI})+\\s*`, 'u');
const TRAILING_EMOJI = new RegExp(`\\s*(?:${EMOJI})+$`, 'u');
const STARTS_WITH_EMOJI = /^\p{Extended_Pictographic}/u;
/** Opening quotation marks across the store locales: “ " « „ ‚ ‘ ' 「 『 ‹ */
const STARTS_WITH_QUOTE = /^[“"«„‚‘'「『‹]/u;

const stripEmoji = (s) => s.replace(LEADING_EMOJI, '').replace(TRAILING_EMOJI, '').trim();

/** Words whose spelling must survive the sentence-case conversion. Matched case-insensitively. */
const KEEP = ['Gamepad Pro', 'Android', 'Shizuku', 'ADB', 'L2/R2', 'D-pad', 'USB', 'MOBA', 'MMORPG', 'RPG'];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const KEEP_RE = new RegExp(`(?<![\\p{L}\\p{N}])(?:${KEEP.map(escapeRe).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
const canonical = (m) => KEEP.find((k) => k.toLowerCase() === m.toLowerCase()) ?? m;

/**
 * Store headings are written in capitals ("DRAG. MAP. PLAY."). Convert a heading to sentence case,
 * but only when every cased letter outside the protected words (and "root", which some locales keep
 * lowercase inside a capitalised line) is upper case. German is left as written: lower-casing it
 * would also lower-case its nouns.
 */
function sentenceCase(title, lang) {
  if (lang === 'de') return title;
  const rest = title.replace(KEEP_RE, '').replace(/\broot\b/g, '');
  if (!/\p{Lu}/u.test(rest) || /\p{Ll}/u.test(rest)) return title;
  let out = title.toLocaleLowerCase(lang);
  // Capitalise the first letter of the line and of each sentence ("Drag. Map. Play.").
  out = out.replace(/(^|[.!?]\s+)([^\p{L}]*)(\p{L})/gu, (_, a, b, c) => a + b + c.toLocaleUpperCase(lang));
  return out.replace(KEEP_RE, canonical);
}

function parseBold(text, ids, cfg = {}) {
  const lines = text.replace(/\r/g, '').split('\n');
  let requires;
  const sections = [];
  let current = null;
  const paragraph = (s) => (cfg.stripParagraphEmoji ? stripEmoji(s) : s);
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
    if (BULLET.test(line)) {
      const item = line.replace(BULLET, '');
      if (cfg.quotedBulletsAsParagraphs?.includes(current.id) && STARTS_WITH_QUOTE.test(item)) current.paragraphs.push(item);
      else current.bullets.push(item);
    } else if (/^Source code/i.test(line) || /codeberg\.org/.test(line)) continue; // the hero already links the source
    else if (cfg.dropParagraphsStartingWith?.some((e) => line.startsWith(e))) continue;
    else current.paragraphs.push(paragraph(line.replace(/<\/?[^>]+>/g, '')));
  }
  return { requires, sections };
}

function parseEmoji(text, ids, cfg, title, lang) {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const intro = { id: ids[0], title, paragraphs: [], bullets: [] };
  const sections = [intro];
  let current = intro;
  for (const line of lines) {
    if (intro.paragraphs.length < cfg.introParagraphs && current === intro) {
      intro.paragraphs.push(stripEmoji(line));
      continue;
    }
    if (STARTS_WITH_EMOJI.test(line)) {
      const heading = sentenceCase(stripEmoji(line).replace(/\s*[:：]$/, ''), lang);
      current = { id: ids[sections.length] ?? `section-${sections.length + 1}`, title: heading, paragraphs: [], bullets: [] };
      sections.push(current);
      continue;
    }
    if (BULLET.test(line)) current.bullets.push(line.replace(BULLET, ''));
    else if (NUMBERED.test(line)) current.bullets.push(line.replace(NUMBERED, ''));
    else current.paragraphs.push(stripEmoji(line));
  }
  return { requires: undefined, sections };
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

const products = localProducts();
for (const [slug, root] of Object.entries(products)) {
  const cfg = CONFIG[slug];
  if (!cfg) {
    console.warn(`[store-copy] no CONFIG for ${slug}, skipping`);
    continue;
  }
  const { ids } = cfg;
  const productFile = join(ROOT, 'src/content/products', `${slug}.json`);
  const contactEmail = existsSync(productFile) ? JSON.parse(readFileSync(productFile, 'utf8')).contactEmail : undefined;
  const studioEmail = (s) => (contactEmail ? s.replace(EMAIL, contactEmail) : s);
  const base = join(root, 'fastlane/metadata/android');
  let written = 0;
  for (const locale of LOCALES) {
    const dir = join(base, fastlaneLocale(slug, locale));
    if (!existsSync(join(dir, 'full_description.txt'))) {
      console.warn(`[store-copy] ${slug}/${locale.slug}: no fastlane folder ${fastlaneLocale(slug, locale)}`);
      continue;
    }
    const title = readFileSync(join(dir, 'title.txt'), 'utf8').trim();
    const shortDescription = readFileSync(join(dir, 'short_description.txt'), 'utf8').trim();
    const full = readFileSync(join(dir, 'full_description.txt'), 'utf8');
    const { requires, sections } = cfg.format === 'emoji' ? parseEmoji(full, ids, cfg, title, locale.lang) : parseBold(full, ids, cfg);
    if (sections.length !== ids.length) {
      console.error(`[store-copy] ${slug}/${locale.slug}: expected ${ids.length} sections, found ${sections.length}`);
      process.exitCode = 1;
      continue;
    }
    for (const s of sections) {
      s.paragraphs = s.paragraphs.map(studioEmail);
      s.bullets = s.bullets.map(studioEmail);
    }
    const intro = sections[0];
    const tagline = (cfg.taglineFromTitle ? intro.title : intro.paragraphs[0]) ?? shortDescription;
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
