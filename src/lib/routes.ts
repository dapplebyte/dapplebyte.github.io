import { DEFAULT_LOCALE, LOCALE_SLUGS } from '../i18n/locales';
import { liveProducts, localesFor } from './content';

const langParam = (slug: string) => (slug === DEFAULT_LOCALE ? undefined : slug);

/** `[...lang]` paths for every locale. */
export function langPaths(slugs: readonly string[] = LOCALE_SLUGS) {
  return slugs.map((slug) => ({ params: { lang: langParam(slug) }, props: { locale: slug } }));
}

/** `[...lang]/[product]` paths for every live product in every locale that has its copy. */
export async function productLangPaths() {
  const out: { params: { lang: string | undefined; product: string }; props: { locale: string; slug: string; alternates: string[] } }[] = [];
  for (const p of await liveProducts()) {
    const alternates = await localesFor('productCopy', p.slug);
    for (const locale of alternates) {
      out.push({ params: { lang: langParam(locale), product: p.slug }, props: { locale, slug: p.slug, alternates } });
    }
  }
  return out;
}
