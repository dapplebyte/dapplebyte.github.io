// App FAQ → src/content/faq/<slug>/<locale>.json
//
// `kotlin` products (Relaypad, JoyLink, Gamepad Tester Pro, SlopSwipe): FaqContent.kt holds the grouping, order and ids;
// strings_faq.xml holds the text. SlopSwipe writes the constructors positionally (`FaqSection(R.string.title, listOf(
// FaqEntry("id", R.string.q, R.string.a, action)))`) instead of with named arguments; both forms are read. Its ids are the
// suffixes of its `faq_q_<id>` / `faq_a_<id>` keys and never change once released. The website always publishes the paid edition with nothing on sale:
// `answer(proOffered, free, paid)` picks `paid`, and the purchase section is `faq_section_purchase_paid`.
//
// `arrays` products (Gamepad Pro): res/values*/arrays.xml holds `faq_questions` / `faq_answers`, aligned
// by position, plus `faq_sections` (section index per question) and `faq_video_ids` (YouTube id per
// question, may be empty; not translated). Question ids are `q01`… by array position. Extra entries
// from single strings are appended to the end of a section, the same way the app shows them.
//
// `kotlin-flat` products (WhenDo): HelpData.kt holds flat `listOf(Item(R.string.q, R.string.a, videoId = "…"))`
// lists, one per section; the text is in every *.xml of res/values*. Entry ids are the question key
// without its prefix (`faq_q_presets` → `presets`).
//
// `java` products (Apk Extractor): FaqActivity.java builds the list with `section(items, R.string.faq_section_x)` and
// `question(items, R.string.faq_q_N, R.string.faq_a_N, pro)` calls, in display order; the text is in every *.xml of
// res/values*. Entry ids are `qNN` from the question key's number (`faq_q_7` → `q07`).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES, localProducts, parseStrings, unescapeAndroid, androidValues, writeJson, now } from './lib.mjs';

const CONFIG = {
  slopswipe: {
    kotlin: 'app/src/main/java/app/slopswipe/ui/faq/FaqContent.kt',
    stringsFile: 'strings_faq.xml',
    /** Section title keys in the order FaqContent.Sections lists them (the same order as in strings_faq.xml). */
    order: ['faq_section_start', 'faq_section_skip', 'faq_section_lists', 'faq_section_privacy', 'faq_section_more', 'faq_section_compat'],
    slugs: {
      faq_section_start: 'getting-started',
      faq_section_skip: 'skipping-rules',
      faq_section_lists: 'lists-keywords-reports',
      faq_section_privacy: 'privacy-data',
      faq_section_more: 'more-features',
      faq_section_compat: 'compatibility-support',
    },
  },
  'apk-extractor': {
    kind: 'java',
    java: 'app/src/main/java/com/dylan/win11/apkextractor/activities/FaqActivity.java',
    res: 'app/src/main/res',
    titleKey: 'activity_faq_title',
    /** URL slug per section title key. */
    slugs: {
      faq_section_basic: 'basics-extracting',
      faq_section_install: 'installing',
      faq_section_transfer: 'sharing-transfer',
      faq_section_backup: 'backup-version-history',
      faq_section_detail: 'details-analysis',
      faq_section_pro: 'pro-ads',
      faq_section_other: 'privacy-other',
    },
  },
  whendo: {
    kind: 'kotlin-flat',
    kotlin: 'app/src/main/java/top/xjunz/tasker/ui/help/HelpData.kt',
    res: 'app/src/main/res',
    titleKey: 'help_center',
    /** One `val NAME = listOf(Item(...))` per section, in the order HelpScreen shows them. */
    sections: [
      { id: 'questions', titleKey: 'help_section_faq', list: 'FAQ', idPrefix: 'faq_q_' },
      { id: 'glossary', titleKey: 'help_section_glossary', list: 'GLOSSARY', idPrefix: 'glossary_term_' },
    ],
  },
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
  joylink: {
    kotlin: 'app/src/main/java/com/dylan/joylink/ui/faq/FaqContent.kt',
    stringsFile: 'strings_faq.xml',
    /** Section title keys in the order FaqContent.Sections lists them. */
    order: [
      'faq_section_connection',
      'faq_section_gamepad',
      'faq_section_touchpad_remote',
      'faq_section_pro_modes',
      'faq_section_purchase',
      'faq_section_compat',
    ],
    slugs: {
      faq_section_connection: 'connection',
      faq_section_gamepad: 'gamepad',
      faq_section_touchpad_remote: 'touchpad-remote',
      faq_section_pro_modes: 'pro-modes',
      faq_section_purchase: 'purchase',
      faq_section_compat: 'compatibility',
    },
  },
  'gamepad-tester': {
    kotlin: 'app/src/main/java/com/swordfish/radialgamepad/faq/FaqContent.kt',
    stringsFile: 'strings_faq.xml',
    /** Section title keys in the order FaqContent.Sections lists them. */
    order: [
      'faq_section_connection',
      'faq_section_buttons',
      'faq_section_sticks',
      'faq_section_haptics',
      'faq_section_latency',
      'faq_section_purchase',
      'faq_section_compat',
    ],
    slugs: {
      faq_section_connection: 'connection',
      faq_section_buttons: 'buttons',
      faq_section_sticks: 'sticks',
      faq_section_haptics: 'vibration-motion-touchpad',
      faq_section_latency: 'latency',
      faq_section_purchase: 'purchase',
      faq_section_compat: 'privacy-compatibility',
    },
  },
  'gamepad-pro': {
    kind: 'arrays',
    res: 'app/src/main/res',
    /** Section index in `faq_sections` → URL slug and title key, in the order the app shows them. */
    sections: [
      { slug: 'setup', titleKey: 'faq_section_setup' },
      { slug: 'mapping', titleKey: 'faq_section_mapping' },
      { slug: 'controller', titleKey: 'faq_section_controller' },
      { slug: 'pro', titleKey: 'faq_section_pro' },
    ],
    /** Single-string entries appended to the end of a section (app: FaqScreen adds Shizuku under Mapping). */
    extra: [{ id: 'shizuku', section: 'mapping', qKey: 'shizuku_faq_question', aKey: 'shizuku_faq_answer' }],
  },
};

/** `<string-array>` / `<integer-array>` items by name, comments stripped. */
function parseArrays(xml) {
  const out = new Map();
  const clean = xml.replace(/<!--[\s\S]*?-->/g, '');
  for (const m of clean.matchAll(/<(string|integer)-array\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/\1-array>/g)) {
    out.set(m[2], [...m[3].matchAll(/<item>([\s\S]*?)<\/item>/g)].map((i) => unescapeAndroid(i[1])));
  }
  return out;
}

/** Every `<string>` in every *.xml of one res/values* folder. */
function readFolderStrings(dir) {
  const strings = new Map();
  const arrays = new Map();
  if (!existsSync(dir)) return { strings, arrays };
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.xml'))) {
    const xml = readFileSync(join(dir, f), 'utf8');
    for (const [k, v] of parseStrings(xml)) strings.set(k, v);
    for (const [k, v] of parseArrays(xml)) arrays.set(k, v);
  }
  return { strings, arrays };
}

const answerParagraphs = (a) => a.split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);

function extractArrays(slug, root, cfg) {
  const resDir = join(root, cfg.res);
  const base = readFolderStrings(join(resDir, 'values'));
  const sectionIdx = (base.arrays.get('faq_sections') ?? []).map(Number);
  const videos = base.arrays.get('faq_video_ids') ?? [];
  const tiktoks = base.arrays.get('faq_tiktok_ids') ?? [];
  const total = sectionIdx.length + cfg.extra.length;
  let written = 0;
  for (const locale of LOCALES) {
    const folder = androidValues(slug, locale);
    if (!folder) {
      console.log(`[faq] ${slug}/${locale.slug}: the app has no translation, skipped (the site shows English)`);
      continue;
    }
    const own = folder === 'values' ? base : readFolderStrings(join(resDir, folder));
    if (own.arrays.size === 0 && own.strings.size === 0) {
      console.warn(`[faq] ${slug}/${locale.slug}: ${folder} missing, locale skipped`);
      continue;
    }
    const qs = own.arrays.get('faq_questions') ?? [];
    const as = own.arrays.get('faq_answers') ?? [];
    if (qs.length !== sectionIdx.length || as.length !== sectionIdx.length) {
      console.error(`[faq] ${slug}/${locale.slug}: ${qs.length} questions / ${as.length} answers, expected ${sectionIdx.length}; locale not written (arrays are aligned by position)`);
      process.exitCode = 1;
      continue;
    }
    // Section titles may be untranslatable (`faq_section_pro`), so fall back to the default folder.
    const str = (k) => own.strings.get(k) ?? base.strings.get(k);
    let missing = 0;
    const sections = cfg.sections.map((s, idx) => ({
      id: s.slug,
      title: str(s.titleKey) ?? (missing++, ''),
      entries: sectionIdx
        .map((sec, i) => ({ sec, i }))
        .filter((x) => x.sec === idx)
        .map(({ i }) => ({
          id: `q${String(i + 1).padStart(2, '0')}`,
          q: qs[i],
          a: answerParagraphs(as[i]),
          ...(videos[i] ? { video: videos[i] } : {}),
          ...(tiktoks[i] ? { tiktok: tiktoks[i] } : {}),
        })),
    }));
    for (const e of cfg.extra) {
      const q = own.strings.get(e.qKey);
      const a = own.strings.get(e.aKey);
      if (q === undefined || a === undefined) {
        missing++;
        continue;
      }
      sections.find((s) => s.id === e.section).entries.push({ id: e.id, q, a: answerParagraphs(a) });
    }
    if (missing > 0 || sections.some((s) => s.entries.some((x) => !x.q || x.a.length === 0))) {
      console.error(`[faq] ${slug}/${locale.slug}: ${missing} strings missing, locale not written (no half-translated pages)`);
      process.exitCode = 1;
      continue;
    }
    writeJson(`src/content/faq/${slug}/${locale.slug}.json`, {
      slug,
      locale: locale.slug,
      title: str('faq_title') ?? 'FAQ',
      sections,
      extractedAt: now(),
    });
    written++;
  }
  console.log(`[faq] ${slug}: ${written} locales, ${cfg.sections.length} sections, ${total} questions`);
}

/** `val NAME = listOf(...)` → entries `{ id, qKey, aKey, video? }`; the first two R.string refs of each item are the question and the answer. */
function parseFlatList(src, name, idPrefix) {
  const m = src.match(new RegExp(`val\\s+${name}\\s*=\\s*listOf\\(`));
  if (!m) throw new Error(`[faq] list ${name} not found in HelpData.kt`);
  const body = balanced(src, m.index + m[0].length - 1).replace(/\/\/[^\n]*/g, '');
  const entries = [];
  for (const item of body.matchAll(/\w+Item\(([\s\S]*?)\)\s*(?:,|$)/g)) {
    const refs = [...item[1].matchAll(/R\.string\.(\w+)/g)].map((r) => r[1]);
    if (refs.length < 2) continue;
    const video = item[1].match(/videoId\s*=\s*"([^"]+)"/)?.[1];
    entries.push({ id: refs[0].replace(idPrefix, ''), qKey: refs[0], aKey: refs[1], ...(video ? { video } : {}) });
  }
  return entries;
}

function extractKotlinFlat(slug, root, cfg) {
  const src = readFileSync(join(root, cfg.kotlin), 'utf8');
  const lists = cfg.sections.map((s) => ({ ...s, entries: parseFlatList(src, s.list, s.idPrefix) }));
  const total = lists.reduce((n, s) => n + s.entries.length, 0);
  const resDir = join(root, cfg.res);
  const base = readFolderStrings(join(resDir, 'values'));
  let written = 0;
  for (const locale of LOCALES) {
    const folder = androidValues(slug, locale);
    if (!folder) {
      console.log(`[faq] ${slug}/${locale.slug}: the app has no translation, skipped (the site shows English)`);
      continue;
    }
    const own = folder === 'values' ? base : readFolderStrings(join(resDir, folder));
    if (own.strings.size === 0) {
      console.warn(`[faq] ${slug}/${locale.slug}: ${folder} missing, locale skipped`);
      continue;
    }
    let missing = 0;
    const sections = lists.map((s) => ({
      id: s.id,
      title: own.strings.get(s.titleKey) ?? (missing++, ''),
      entries: s.entries.map((e) => {
        const q = own.strings.get(e.qKey);
        const a = own.strings.get(e.aKey);
        if (q === undefined || a === undefined) missing++;
        return { id: e.id, q: q ?? '', a: answerParagraphs(a ?? ''), ...(e.video ? { video: e.video } : {}) };
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
      title: own.strings.get(cfg.titleKey) ?? base.strings.get(cfg.titleKey) ?? 'FAQ',
      sections,
      extractedAt: now(),
    });
    written++;
  }
  console.log(`[faq] ${slug}: ${written} locales, ${lists.length} sections, ${total} questions`);
}

/** Return the text of the balanced `(...)` that starts at `open` (index of the `(`). */
/** `section(items, R.string.X)` / `question(items, R.string.Q, R.string.A, pro)` calls after `buildItems()`, in file order. */
function parseJava(src) {
  const start = src.indexOf('buildItems()');
  if (start < 0) throw new Error('[faq] buildItems() not found in FaqActivity.java');
  const sections = [];
  for (const m of src.slice(start).matchAll(/\b(section|question)\(\s*items\s*,\s*R\.string\.(\w+)(?:\s*,\s*R\.string\.(\w+))?/g)) {
    if (m[1] === 'section') sections.push({ titleKey: m[2], entries: [] });
    else if (sections.length) {
      const n = m[2].match(/(\d+)$/)?.[1] ?? String(sections.at(-1).entries.length + 1);
      sections.at(-1).entries.push({ id: `q${n.padStart(2, '0')}`, qKey: m[2], aKey: m[3] });
    }
  }
  return sections;
}

function extractJava(slug, root, cfg) {
  const parsed = parseJava(readFileSync(join(root, cfg.java), 'utf8'));
  const total = parsed.reduce((n, s) => n + s.entries.length, 0);
  const resDir = join(root, cfg.res);
  const base = readFolderStrings(join(resDir, 'values'));
  let written = 0;
  for (const locale of LOCALES) {
    const folder = androidValues(slug, locale);
    if (!folder) {
      console.log(`[faq] ${slug}/${locale.slug}: the app has no translation, skipped (the site shows English)`);
      continue;
    }
    const own = folder === 'values' ? base : readFolderStrings(join(resDir, folder));
    if (own.strings.size === 0) {
      console.warn(`[faq] ${slug}/${locale.slug}: ${folder} missing, locale skipped`);
      continue;
    }
    let missing = 0;
    const sections = parsed.map((s) => ({
      id: cfg.slugs[s.titleKey] ?? s.titleKey,
      title: own.strings.get(s.titleKey) ?? (missing++, ''),
      entries: s.entries.map((e) => {
        const q = own.strings.get(e.qKey);
        const a = own.strings.get(e.aKey);
        if (q === undefined || a === undefined) missing++;
        return { id: e.id, q: q ?? '', a: answerParagraphs(a ?? '') };
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
      title: own.strings.get(cfg.titleKey) ?? base.strings.get(cfg.titleKey) ?? 'FAQ',
      sections,
      extractedAt: now(),
    });
    written++;
  }
  console.log(`[faq] ${slug}: ${written} locales, ${parsed.length} sections, ${total} questions`);
}

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
    // Named (`titleRes = R.string.x`) or positional (`R.string.x` as the first argument).
    const titleKey = body.match(/titleRes\s*=\s*R\.string\.(\w+)/)?.[1] ?? body.match(/^\s*R\.string\.(\w+)/)?.[1];
    if (!titleKey) continue;
    const entries = [];
    const er = /FaqEntry\(/g;
    let e;
    while ((e = er.exec(body))) {
      const eb = balanced(body, e.index + 'FaqEntry'.length);
      // Positional form: `"id", R.string.q, R.string.a, …`.
      const positional = eb.match(/^\s*"([^"]+)"\s*,\s*R\.string\.(\w+)\s*,\s*R\.string\.(\w+)/);
      const id = eb.match(/\bid\s*=\s*"([^"]+)"/)?.[1] ?? positional?.[1];
      const qKey = eb.match(/questionRes\s*=\s*R\.string\.(\w+)/)?.[1] ?? positional?.[2];
      const paid = eb.match(/answerRes\s*=\s*answer\(\s*proOffered\s*,\s*R\.string\.(\w+)\s*,\s*R\.string\.(\w+)\s*\)/);
      const aKey = paid ? paid[2] : (eb.match(/answerRes\s*=\s*R\.string\.(\w+)/)?.[1] ?? positional?.[3]);
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
  if (cfg.kind === 'arrays') {
    extractArrays(slug, root, cfg);
    continue;
  }
  if (cfg.kind === 'kotlin-flat') {
    extractKotlinFlat(slug, root, cfg);
    continue;
  }
  if (cfg.kind === 'java') {
    extractJava(slug, root, cfg);
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
    const folder = androidValues(slug, locale);
    if (!folder) {
      console.log(`[faq] ${slug}/${locale.slug}: the app has no translation, skipped (the site shows English)`);
      continue;
    }
    const file = join(root, 'app/src/main/res', folder, cfg.stringsFile);
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
