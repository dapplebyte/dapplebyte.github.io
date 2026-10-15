import type { ImageMetadata } from 'astro';
import { DEFAULT_LOCALE } from '../i18n/locales';

const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/screenshots/**/*.webp', { eager: true });

/** Screenshot `index` (1-based) for a product in a locale, falling back to English. */
export function screenshot(slug: string, locale: string, index: number): ImageMetadata | undefined {
  const name = String(index).padStart(2, '0');
  return files[`/src/assets/screenshots/${slug}/${locale}/${name}.webp`]?.default ?? files[`/src/assets/screenshots/${slug}/${DEFAULT_LOCALE}/${name}.webp`]?.default;
}

export function screenshots(slug: string, locale: string, count: number): ImageMetadata[] {
  const out: ImageMetadata[] = [];
  for (let i = 1; i <= count; i++) {
    const img = screenshot(slug, locale, i);
    if (img) out.push(img);
  }
  return out;
}
