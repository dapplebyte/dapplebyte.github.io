import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A product's downloadable rule library: `public/<slug>/rules/v1/latest.json` points at the current
 * version directory (each version directory never changes once published). Products without that file
 * have no rule library, and get no rules page or nav tab.
 */
export interface RulesPlatform {
  platform: string;
  packages: string[];
  min: string;
  max: string;
}
export interface RulesLatest {
  schema: number;
  version: string;
  published: string;
  /** Relative to the `v1/` directory, e.g. `2026.10.22.1/slopswipe-rules-2026.10.22.1.zip`. */
  zip: string;
  zipSize: number;
  zipSha256: string;
  platforms: RulesPlatform[];
}

export const RULES_DIR = 'rules/v1';
const VERSION = /^\d+(\.\d+){1,5}$/;
const cache = new Map<string, RulesLatest | undefined>();

function latestFile(slug: string): string {
  return join(process.cwd(), 'public', slug, RULES_DIR, 'latest.json');
}

/** The product's `latest.json`, or undefined when it has no rule library. Throws on a malformed file. */
export function rulesLatest(slug: string): RulesLatest | undefined {
  if (cache.has(slug)) return cache.get(slug);
  const file = latestFile(slug);
  let out: RulesLatest | undefined;
  if (existsSync(file)) {
    const data = JSON.parse(readFileSync(file, 'utf8')) as RulesLatest;
    if (!VERSION.test(data.version ?? '')) throw new Error(`${slug} rules: bad version "${data.version}"`);
    if (!data.zip || data.zip.startsWith('/') || data.zip.split('/').includes('..')) throw new Error(`${slug} rules: bad zip path "${data.zip}"`);
    if (!existsSync(join(process.cwd(), 'public', slug, RULES_DIR, data.zip))) throw new Error(`${slug} rules: ${data.zip} is missing`);
    out = { ...data, platforms: data.platforms ?? [] };
  }
  cache.set(slug, out);
  return out;
}

export function hasRules(slug: string): boolean {
  return rulesLatest(slug) !== undefined;
}

/** Site path of the zip, e.g. `/slopswipe/rules/v1/2026.10.22.1/slopswipe-rules-2026.10.22.1.zip`. */
export function rulesZipPath(slug: string, latest: RulesLatest): string {
  return `/${slug}/${RULES_DIR}/${latest.zip}`;
}

/** Display names of the apps a profile targets: brand names, the same in every language. */
const PLATFORM_NAMES: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

export function platformName(platform: string): string {
  return PLATFORM_NAMES[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

/** "123456" → "121 KB" in the page's language. */
export function formatSize(bytes: number, lang: string): string {
  const mb = bytes >= 1024 * 1024;
  const value = mb ? bytes / (1024 * 1024) : Math.max(1, Math.round(bytes / 1024));
  try {
    return new Intl.NumberFormat(lang, { style: 'unit', unit: mb ? 'megabyte' : 'kilobyte', unitDisplay: 'short', maximumFractionDigits: mb ? 1 : 0 }).format(value);
  } catch {
    return mb ? `${value.toFixed(1)} MB` : `${value} KB`;
  }
}
