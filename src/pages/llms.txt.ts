import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { liveProducts, getCopy, getFaq } from '../lib/content';
import { SITE } from '../lib/jsonld';
import { useT } from '../i18n/t';

// https://llmstxt.org — a short, plain-text map of the site for language models.
export const GET: APIRoute = async () => {
  const { t } = useT('en');
  const lines: string[] = [];
  lines.push('# DappleByte', '', `> ${t('site.definition')} ${t('site.tagline')}`, '');
  lines.push('No ads, no subscriptions, no server between the user and their hardware, source published under AGPL-3.0. Contact: hello@dapplebyte.com. Pages exist in 19 languages; English is at the root, other languages under a prefix such as /ja/ or /zh-tw/.', '');
  lines.push('## Studio', '', `- [About DappleByte](${SITE}/about/): what the studio is and how it works`, `- [Website privacy](${SITE}/privacy/): no cookies, no analytics`, '');
  for (const p of await liveProducts()) {
    const copy = await getCopy(p.slug, 'en');
    const faq = await getFaq(p.slug, 'en');
    const compare = (await getEntry('compare', p.slug))?.data;
    const videos = (await getEntry('videos', p.slug))?.data.items ?? [];
    const features = (await getEntry('features', p.slug))?.data.items ?? [];
    lines.push(`## ${p.name}`, '', `> ${copy.tagline}`, '');
    if (copy.requires) lines.push(copy.requires, '');
    lines.push(`- [${p.name} overview](${SITE}/${p.slug}/): features, screenshots, requirements, pricing model`);
    lines.push(`- [Features](${SITE}/${p.slug}/features/): one page per feature`);
    for (const f of features) {
      const s = copy.sections.find((x) => x.id === f.sectionId);
      if (s) lines.push(`  - [${s.title}](${SITE}/${p.slug}/features/${f.id}/)`);
    }
    if (faq) {
      lines.push(`- [FAQ](${SITE}/${p.slug}/faq/): ${faq.sections.reduce((n, s) => n + s.entries.length, 0)} questions in ${faq.sections.length} sections`);
      for (const s of faq.sections) lines.push(`  - [${s.title}](${SITE}/${p.slug}/faq/${s.id}/): ${s.entries.length} questions`);
    }
    lines.push(`- [Support](${SITE}/${p.slug}/support/): how to get help, what to include, refunds`);
    lines.push(`- [Privacy policy](${SITE}/${p.slug}/privacy/)`);
    lines.push(`- [Release notes](${SITE}/${p.slug}/changelog/)`);
    lines.push(`- [Press kit](${SITE}/${p.slug}/press/): fact sheet, boilerplate, assets`);
    if (videos.length) lines.push(`- [Videos](${SITE}/${p.slug}/videos/)`);
    if (compare && !compare.draft) lines.push(`- [Compared with other apps](${SITE}/${p.slug}/compare/)`);
    if (p.playUrl) lines.push(`- [Google Play listing](${p.playUrl})`);
    if (p.sourceUrl) lines.push(`- [Source code](${p.sourceUrl})`);
    lines.push('');
  }
  lines.push('## Full text', '', `- [llms-full.txt](${SITE}/llms-full.txt): the English product pages and FAQ in one file`, '');
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
