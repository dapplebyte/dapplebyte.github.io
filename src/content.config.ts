import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** `<slug>/<locale>.json` → id `<slug>/<locale>` (the default would use the `slug` field and collide across locales). */
const byPath = ({ entry }: { entry: string }) => entry.replace(/\.json$/, '');

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

/** One product. Locale-independent facts only; copy comes from `productCopy`. */
const products = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/products', generateId: byPath }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    order: z.number(),
    status: z.enum(['live', 'placeholder']),
    platform: z.string().default('Android'),
    applicationId: z.string().optional(),
    playUrl: z.string().url().optional(),
    sourceUrl: z.string().url().optional(),
    sourceLicense: z.string().optional(),
    category: z.string().default('SoftwareApplication'),
    minOs: z.string().optional(),
    firstReleased: z.string().optional(),
    versions: z.array(z.object({ code: z.number(), name: z.string(), date: z.string().optional() })).default([]),
    contactEmail: z.string().email().optional(),
    accent: z.object({ solid: hex, bright: hex, ink: hex }).optional(),
    displayFont: z.string().optional(),
    screenshotCount: z.number().default(0),
    /** Store screenshots are landscape (cropped into a wide frame) or portrait (shown side by side). */
    screenshotOrientation: z.enum(['landscape', 'portrait']).default('landscape'),
    featuredFaq: z.array(z.string()).default([]),
    trademark: z.string().optional(),
    languages: z.number().optional(),
    /** YouTube playlist id with every video of the product. */
    youtubePlaylist: z.string().optional(),
    /** TikTok profile URL; video links are `<profile>/video/<id>`. */
    tiktokProfile: z.string().url().optional(),
    /**
     * Which product-copy sections fill the fixed blocks of the product page.
     * `useCases`: bullets in two columns under the screenshots. `steps`: an ordered list there instead.
     * `cells`: up to three cells after the FAQ (paragraphs and bullets). `privacyLinkIn`: the cell that
     * gets a link to the privacy policy. `fine`: small print under "Get {name}".
     */
    overview: z
      .object({
        useCases: z.string().optional(),
        steps: z.string().optional(),
        cells: z.array(z.string()).default([]),
        privacyLinkIn: z.string().optional(),
        fine: z.string().optional(),
      })
      .default({ cells: [] }),
  }),
});

const section = z.object({
  id: z.string(),
  title: z.string(),
  paragraphs: z.array(z.string()).default([]),
  bullets: z.array(z.string()).default([]),
});

/** Generated from the store listing by scripts/extract-store-copy.mjs. Id: `<slug>/<locale>`. */
const productCopy = defineCollection({
  loader: glob({ pattern: '*/*.json', base: './src/content/product-copy', generateId: byPath }),
  schema: z.object({
    slug: z.string(),
    locale: z.string(),
    title: z.string(),
    shortDescription: z.string(),
    requires: z.string().optional(),
    tagline: z.string(),
    sections: z.array(section),
    extractedAt: z.string(),
  }),
});

/** Generated from the app's strings_faq.xml by scripts/extract-faq.mjs. Id: `<slug>/<locale>`. */
const faq = defineCollection({
  loader: glob({ pattern: '*/*.json', base: './src/content/faq', generateId: byPath }),
  schema: z.object({
    slug: z.string(),
    locale: z.string(),
    title: z.string(),
    intro: z.string().optional(),
    sections: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        entries: z.array(z.object({ id: z.string(), q: z.string(), a: z.array(z.string()), video: z.string().optional(), tiktok: z.string().optional() })),
      }),
    ),
    extractedAt: z.string(),
  }),
});

/** Generated from fastlane changelogs. Id: `<slug>/<locale>`. */
const changelog = defineCollection({
  loader: glob({ pattern: '*/*.json', base: './src/content/changelog', generateId: byPath }),
  schema: z.object({
    slug: z.string(),
    locale: z.string(),
    entries: z.array(z.object({ code: z.number(), name: z.string(), date: z.string().optional(), items: z.array(z.string()) })),
    extractedAt: z.string(),
  }),
});

/** Privacy policy body as HTML. Id: `<slug>/<locale>`. */
const privacy = defineCollection({
  loader: glob({ pattern: '*/*.json', base: './src/content/privacy', generateId: byPath }),
  schema: z.object({
    slug: z.string(),
    locale: z.string(),
    effectiveDate: z.string(),
    governingLocale: z.string().default('en'),
    html: z.string(),
  }),
});

const videos = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/videos', generateId: byPath }),
  schema: z.object({
    slug: z.string(),
    items: z.array(
      z.object({
        id: z.string(),
        youtubeId: z.string(),
        /** The same clip on TikTok (video id only). */
        tiktokId: z.string().optional(),
        kind: z.enum(['promo', 'tutorial', 'troubleshooting']),
        uploadDate: z.string(),
        duration: z.string(),
        titleKey: z.string(),
        descriptionKey: z.string(),
        feature: z.string().optional(),
        faq: z.string().optional(),
        /** Frame of the video. Portrait videos get a 9:16 player. */
        aspect: z.enum(['16:9', '9:16']).default('16:9'),
      }),
    ),
  }),
});

const compare = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/compare', generateId: byPath }),
  schema: z.object({
    slug: z.string(),
    draft: z.boolean().default(true),
    verifiedOn: z.string().nullable().default(null),
    /** Row ids (labels in `compare.rows`) listed under the table as facts about this product only. */
    highlights: z.array(z.string()).default([]),
    competitors: z.array(z.object({ id: z.string(), name: z.string(), url: z.string().url().optional(), platforms: z.string().optional() })),
    rows: z.array(
      z.object({
        id: z.string(),
        values: z.record(z.string(), z.union([z.enum(['yes', 'no', 'partial', 'unknown']), z.string()])),
      }),
    ),
  }),
});

const features = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/features', generateId: byPath }),
  schema: z.object({
    slug: z.string(),
    items: z.array(
      z.object({
        id: z.string(),
        sectionId: z.string(),
        screenshots: z.array(z.number()).default([]),
        faq: z.array(z.string()).default([]),
        video: z.string().optional(),
      }),
    ),
  }),
});

export const collections = { products, productCopy, faq, changelog, privacy, videos, compare, features };
