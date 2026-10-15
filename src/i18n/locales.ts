import locales from './locales.json';

export type Locale = (typeof locales)[number];
export type LocaleSlug = Locale['slug'];

export const LOCALES: readonly Locale[] = locales;
export const DEFAULT_LOCALE: LocaleSlug = 'en';
export const LOCALE_SLUGS = LOCALES.map((l) => l.slug) as LocaleSlug[];

export function getLocale(slug: string | undefined): Locale {
  return LOCALES.find((l) => l.slug === (slug ?? DEFAULT_LOCALE)) ?? LOCALES[0];
}

/** Path for a locale: English lives at the root, every other locale gets a prefix. */
export function localePath(slug: string, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const withSlash = clean.endsWith('/') ? clean : `${clean}/`;
  return slug === DEFAULT_LOCALE ? withSlash : `/${slug}${withSlash}`;
}

/** Static paths for `[...lang]` routes: `undefined` for English (root), the slug for the rest. */
export function langParams(slugs: readonly string[] = LOCALE_SLUGS) {
  return slugs.map((slug) => ({ params: { lang: slug === DEFAULT_LOCALE ? undefined : slug }, props: { locale: slug } }));
}
