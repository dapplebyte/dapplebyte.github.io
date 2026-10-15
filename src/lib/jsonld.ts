import type { Product, ProductCopy } from './content';

export const SITE = 'https://dapplebyte.com';
export const ORG_ID = `${SITE}/#org`;
export const WEBSITE_ID = `${SITE}/#website`;

export function organization() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'DappleByte',
    url: SITE,
    logo: `${SITE}/favicon.svg`,
    email: 'hello@dapplebyte.com',
    sameAs: ['https://github.com/dapplebyte'],
  };
}

export function website(lang: string) {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE,
    name: 'DappleByte',
    inLanguage: lang,
    publisher: { '@id': ORG_ID },
  };
}

export function webPage(url: string, name: string, description: string, lang: string, dateModified?: string) {
  return {
    '@type': 'WebPage',
    '@id': url,
    url,
    name,
    description,
    inLanguage: lang,
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORG_ID },
    ...(dateModified ? { dateModified } : {}),
  };
}

/**
 * `featureSectionIds`: the product's features.json `sectionId`s, in order. Each feature contributes its
 * bullets, or its first paragraph when it has none.
 */
export function softwareApplication(product: Product, copy: ProductCopy, langs: string[], screenshotUrls: string[], full = true, featureSectionIds: string[] = []) {
  const id = `${SITE}/${product.slug}/#app`;
  if (!full) return { '@type': 'SoftwareApplication', '@id': id };
  const latest = product.versions.at(-1);
  const features = featureSectionIds
    .map((sid) => copy.sections.find((s) => s.id === sid))
    .flatMap((s) => (!s ? [] : s.bullets.length ? s.bullets : s.paragraphs.slice(0, 1)));
  return {
    '@type': 'SoftwareApplication',
    '@id': id,
    name: product.name,
    url: `${SITE}/${product.slug}/`,
    description: copy.tagline,
    applicationCategory: product.category,
    operatingSystem: product.minOs ? `${product.minOs} or later` : product.platform,
    ...(latest ? { softwareVersion: latest.name } : {}),
    ...(product.firstReleased ? { datePublished: product.firstReleased } : {}),
    ...(copy.requires ? { softwareRequirements: copy.requires } : {}),
    ...(features.length ? { featureList: features } : {}),
    screenshot: screenshotUrls,
    inLanguage: langs,
    ...(product.playUrl ? { installUrl: product.playUrl, downloadUrl: product.playUrl } : {}),
    ...(product.sourceUrl ? { codeRepository: product.sourceUrl } : {}),
    ...(product.sourceLicense ? { license: licenseUrl(product.sourceLicense) } : {}),
    publisher: { '@id': ORG_ID },
    author: { '@id': ORG_ID },
  };
}

function licenseUrl(license: string) {
  return license === 'AGPL-3.0' ? 'https://www.gnu.org/licenses/agpl-3.0.html' : license;
}

export function faqPage(url: string, entries: { q: string; a: string[] }[], lang: string) {
  return {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    url,
    inLanguage: lang,
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.q,
      acceptedAnswer: { '@type': 'Answer', text: e.a.join('\n\n') },
    })),
  };
}

export function breadcrumbs(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: item.url })),
  };
}

export function videoObject(v: { name: string; description: string; youtubeId: string; uploadDate: string; duration: string }) {
  return {
    '@type': 'VideoObject',
    name: v.name,
    description: v.description,
    thumbnailUrl: `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`,
    uploadDate: v.uploadDate,
    duration: v.duration,
    embedUrl: `https://www.youtube-nocookie.com/embed/${v.youtubeId}`,
    contentUrl: `https://www.youtube.com/watch?v=${v.youtubeId}`,
  };
}

export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
