import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, LOCALE_SLUGS } from '../i18n/locales';

export type Product = CollectionEntry<'products'>['data'];
export type ProductCopy = CollectionEntry<'productCopy'>['data'];
export type Faq = CollectionEntry<'faq'>['data'];

export async function allProducts(): Promise<Product[]> {
  const entries = await getCollection('products');
  return entries.map((e) => e.data).sort((a, b) => a.order - b.order);
}

export async function liveProducts(): Promise<Product[]> {
  return (await allProducts()).filter((p) => p.status === 'live');
}

export async function getProduct(slug: string): Promise<Product> {
  const entry = await getEntry('products', slug);
  if (!entry) throw new Error(`product ${slug} not found`);
  return entry.data;
}

/** Locales that have a `<slug>/<locale>` entry in a localized collection. */
export async function localesFor(collection: 'productCopy' | 'faq' | 'changelog' | 'privacy', slug: string): Promise<string[]> {
  const entries = await getCollection(collection);
  const have = new Set(entries.filter((e) => e.data.slug === slug).map((e) => e.data.locale));
  return LOCALE_SLUGS.filter((l) => have.has(l));
}

export async function getCopy(slug: string, locale: string): Promise<ProductCopy> {
  const entry = (await getEntry('productCopy', `${slug}/${locale}`)) ?? (await getEntry('productCopy', `${slug}/${DEFAULT_LOCALE}`));
  if (!entry) throw new Error(`product copy for ${slug} not found`);
  return entry.data;
}

export async function getFaq(slug: string, locale: string): Promise<Faq | undefined> {
  const entry = await getEntry('faq', `${slug}/${locale}`);
  return entry?.data;
}

export function faqEntryById(faq: Faq, id: string) {
  for (const section of faq.sections) {
    const entry = section.entries.find((e) => e.id === id);
    if (entry) return { section, entry };
  }
  return undefined;
}

export function copySection(copy: ProductCopy, id: string) {
  return copy.sections.find((s) => s.id === id);
}

/**
 * The FAQ in `locale`, or the English one when the app has no translation for it.
 * `fallback` is true when the English text is shown on a page in another language.
 */
export async function getFaqOrEnglish(slug: string, locale: string): Promise<{ faq: Faq; fallback: boolean } | undefined> {
  const own = await getFaq(slug, locale);
  if (own) return { faq: own, fallback: false };
  const en = await getFaq(slug, DEFAULT_LOCALE);
  return en ? { faq: en, fallback: locale !== DEFAULT_LOCALE } : undefined;
}

/** features.json `sectionId`s of a product, in order. */
export async function featureSectionIds(slug: string): Promise<string[]> {
  return ((await getEntry('features', slug))?.data.items ?? []).map((f) => f.sectionId);
}

/** "PT1M8S" / "PT68S" → "1:08". */
export function formatDuration(iso: string): string {
  const m = iso.match(/^PT(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return iso;
  const total = Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** compare.json cell values that are translated (`compare.values.<v>`); anything else is shown as written. */
export const COMPARE_VALUES = ['yes', 'no', 'partial', 'unknown', 'one-time', 'free', 'free-with-pro', 'subscription'];
