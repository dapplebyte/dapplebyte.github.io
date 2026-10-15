import type { Product } from './content';

/** Display faces the site ships (see the @fontsource imports in Base.astro), with the weight each is loaded in. */
const DISPLAY_FONTS: Record<string, { family: string; weight: number }> = {
  'Chakra Petch': { family: "'Chakra Petch'", weight: 700 },
  Saira: { family: "'Saira'", weight: 600 },
  /** Products without a display face of their own use the site's sans. */
  'IBM Plex Sans': { family: "'IBM Plex Sans'", weight: 600 },
};

/** CSS custom properties that give an element a product's accent colours and display face. */
export function productStyle(product: Pick<Product, 'accent' | 'displayFont'> | undefined): string | undefined {
  if (!product) return undefined;
  const parts: string[] = [];
  const { accent, displayFont } = product;
  if (accent) parts.push(`--product:${accent.bright}`, `--product-ink:${accent.ink}`, `--product-solid:${accent.solid}`);
  const font = displayFont ? DISPLAY_FONTS[displayFont] : undefined;
  if (font) parts.push(`--font-display:${font.family}, var(--font-sans)`, `--display-weight:${font.weight}`);
  return parts.length ? parts.join(';') : undefined;
}
