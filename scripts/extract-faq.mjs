// App FAQ (strings_faq.xml + FaqContent.kt) → src/content/faq/<slug>/<locale>.json
// FaqContent.kt holds the grouping, order and ids; the strings files hold the text.
// The website always publishes the paid edition with nothing on sale (docs/17 D10):
// `answer(proOffered, free, paid)` picks `paid`, and the purchase section is `faq_section_purchase_paid`.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES, localProducts, parseStrings, writeJson, now } from './lib.mjs';

const CONFIG = {
  relaypad: {
    kotlin: 'app/src/main/kotlin/com/dylan/remotepad/faq/FaqContent.kt',
    stringsFile: 'strings_faq.xml',
    /** Section title keys in the order FaqContent.sections() returns them for the paid edition. */
    order: [
      'faq_section_modes',
      'faq_section_connection',
      'faq_section_login',
      'faq_section_quality',
      'faq_section_gamepad',
      'faq_section_copilot',
      'faq_section_purchase_paid',
      'faq_section_other',
    ],
    /** URL slug per section title key. */
    slugs: {
      faq_section_modes: 'modes',
      faq_section_connection: 'connection',
      faq_section_login: 'login',
      faq_section_quality: 'quality',
      faq_section_gamepad: 'gamepad',
      faq_section_copilot: 'copilot',
      faq_section_purchase_paid: 'purchase',
      faq_section_other: 'other',
    },
  },
};

/** Return the text of the balanced `(...)` that starts at `open` (index of the `(`). */
function balanced(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')') {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  throw new Error('unbalanced parentheses');
}

/** Parse every FaqSection(...) block: { titleKey, entries: [{ id, qKey, aKey }] } in file order. */
function parseKotlin(src) {
  const sections = [];
  const re = /FaqSection\(/g;
  let m;
  while ((m = re.exec(src))) {
    const body = balanced(src, m.index + 'FaqSection'.length);
    const titleKey = body.match(/titleRes\s*=\s*R\.string\.(\w+)/)?.[1];
    if (!titleKey) continue;
    const entries = [];
    const er = /FaqEntry\(/g;
    let e;
    while ((e = er.exec(body))) {
      const eb = balanced(body, e.index + 'FaqEntry'.length);
      const id = eb.match(/\bid\s*=\s*"([^"]+)"/)?.[1];
      const qKey = eb.match(/questionRes\s*=\s*R\.string\.(\w+)/)?.[1];
      const paid = eb.match(/answerRes\s*=\s*answer\(\s*proOffered\s*,\s*R\.string\.(\w+)\s*,\s*R\.string\.(\w+)\s*\)/);
      const aKey = paid ? paid[2] : eb.match(/answerRes\s*=\s*R\.string\.(\w+)/)?.[1];
      if (!id || !qKey || !aKey) {
        console.error(`[faq] could not parse an entry in ${titleKey}: ${eb.slice(0, 80)}`);
        process.exitCode = 1;
        continue;
      }
      entries.push({ id, qKey, aKey });
    }
    sections.push({ titleKey, entries });
  }
  return sections;
}

const products = localProducts();
for (const [slug, root] of Object.entries(products)) {
  const cfg = CONFIG[slug];
  if (!cfg) {
    console.warn(`[faq] no CONFIG for ${slug}, skipping`);
    continue;
  }
  const parsed = parseKotlin(readFileSync(join(root, cfg.kotlin), 'utf8'));
  const byTitle = new Map(parsed.map((s) => [s.titleKey, s]));
  const ordered = cfg.order.map((k) => {
    const s = byTitle.get(k);
    if (!s) throw new Error(`[faq] section ${k} not found in FaqContent.kt`);
    return s;
  });
  const total = ordered.reduce((n, s) => n + s.entries.length, 0);
  let written = 0;
  const counts = new Set();
  for (const locale of LOCALES) {
    const file = join(root, 'app/src/main/res', locale.android, cfg.stringsFile);
    if (!existsSync(file)) {
      console.warn(`[faq] ${slug}/${locale.slug}: ${file} missing, locale skipped`);
      continue;
    }
    const strings = parseStrings(readFileSync(file, 'utf8'));
    let missing = 0;
    const sections = ordered.map((s) => ({
      id: cfg.slugs[s.titleKey],
      title: strings.get(s.titleKey) ?? (missing++, ''),
      entries: s.entries.map((e) => {
        const q = strings.get(e.qKey);
        const a = strings.get(e.aKey);
        if (q === undefined || a === undefined) missing++;
        return { id: e.id, q: q ?? '', a: (a ?? '').split(/\n{1,}/).map((p) => p.trim()).filter(Boolean) };
      }),
    }));
    if (missing > 0) {
      console.error(`[faq] ${slug}/${locale.slug}: ${missing} strings missing, locale not written (no half-translated pages)`);
      process.exitCode = 1;
      continue;
    }
    writeJson(`src/content/faq/${slug}/${locale.slug}.json`, {
      slug,
      locale: locale.slug,
      title: strings.get('faq_title') ?? 'FAQ',
      intro: strings.get('faq_intro'),
      sections,
      extractedAt: now(),
    });
    counts.add(total);
    written++;
  }
  console.log(`[faq] ${slug}: ${written} locales, ${ordered.length} sections, ${total} questions`);
}
