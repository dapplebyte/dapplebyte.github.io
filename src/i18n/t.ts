import en from './en.json';
import { DEFAULT_LOCALE } from './locales';

type Dict = Record<string, unknown>;
const files = import.meta.glob<{ default: Dict }>('./*.json', { eager: true });

function dictFor(locale: string): Dict {
  return (files[`./${locale}.json`]?.default as Dict | undefined) ?? (en as Dict);
}

function lookup(dict: Dict, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Dict)[k] : undefined), dict);
}

export type Vars = Record<string, string | number>;

/** Returns `t(key, vars)` for one locale, falling back to English key by key. */
export function useT(locale: string = DEFAULT_LOCALE) {
  const dict = dictFor(locale);
  const t = (key: string, vars: Vars = {}): string => {
    let value = lookup(dict, key);
    if (value === undefined || value === '') value = lookup(en as Dict, key);
    if (typeof value !== 'string') return key;
    return value.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`));
  };
  /** For arrays of strings or objects (principles, checklist items). */
  const list = <T = unknown>(key: string): T[] => {
    const value = lookup(dict, key) ?? lookup(en as Dict, key);
    return Array.isArray(value) ? (value as T[]) : [];
  };
  /** `t` for the site's own words about one product: `products.<slug>.<key>`. */
  const tp = (slug: string, key: string, vars: Vars = {}): string => t(`products.${slug}.${key}`, vars);
  /** `list` for `products.<slug>.<key>`. */
  const listp = <T = unknown>(slug: string, key: string): T[] => list<T>(`products.${slug}.${key}`);
  /** `[key, text]` pairs of an object of strings, in English key order, each falling back to English. */
  const pairs = (key: string): [string, string][] => {
    const base = lookup(en as Dict, key);
    if (!base || typeof base !== 'object' || Array.isArray(base)) return [];
    return Object.keys(base as Dict).map((k) => [k, t(`${key}.${k}`)]);
  };
  return { t, list, tp, listp, pairs };
}

export function formatDate(locale: string, iso: string | undefined, lang: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(d);
  } catch {
    return iso;
  }
}
