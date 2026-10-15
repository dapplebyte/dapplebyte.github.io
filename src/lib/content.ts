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
