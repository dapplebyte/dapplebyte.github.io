import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { liveProducts, getCopy, getFaq } from '../lib/content';
import { SITE } from '../lib/jsonld';
import { useT } from '../i18n/t';

// The English product pages and FAQ as one Markdown document.
export const GET: APIRoute = async () => {
  const { t, list } = useT('en');
  const out: string[] = [];
  out.push('# DappleByte', '', t('site.definition'), '', t('site.tagline'), '');
  out.push('## How we work', '');
  for (const p of list<{ title: string; body: string }>('home.principles')) out.push(`- **${p.title}** ${p.body.replace('{email}', 'hello@dapplebyte.com')}`);
  out.push('');
  for (const p of await liveProducts()) {
    const copy = await getCopy(p.slug, 'en');
    const faq = await getFaq(p.slug, 'en');
    const log = (await getEntry('changelog', `${p.slug}/en`))?.data;
    out.push(`# ${p.name}`, '', `${copy.tagline}`, '');
    out.push(`- Website: ${SITE}/${p.slug}/`);
    if (p.playUrl) out.push(`- Google Play: ${p.playUrl}`);
    if (p.sourceUrl) out.push(`- Source code (${p.sourceLicense}): ${p.sourceUrl}`);
    if (p.minOs) out.push(`- Requires: ${p.minOs} or later. ${copy.requires ?? ''}`.trim());
    if (p.versions.length) out.push(`- Current version: ${p.versions.at(-1)!.name}`);
    out.push('');
    for (const s of copy.sections) {
      if (s.id === 'intro') continue;
      out.push(`## ${s.title}`, '');
      for (const para of s.paragraphs) out.push(para, '');
      for (const b of s.bullets) out.push(`- ${b}`);
      if (s.bullets.length) out.push('');
    }
    if (faq) {
      out.push(`# ${p.name} FAQ`, '');
      for (const s of faq.sections) {
        out.push(`## ${s.title}`, '', `${SITE}/${p.slug}/faq/${s.id}/`, '');
        for (const e of s.entries) {
          out.push(`### ${e.q}`, '', ...e.a.flatMap((a) => [a, '']));
        }
      }
    }
    if (log) {
      out.push(`# ${p.name} release notes`, '');
      for (const e of log.entries) {
        out.push(`## Version ${e.name}${e.date ? ` (${e.date})` : ''}`, '', ...e.items.map((i) => `- ${i}`), '');
      }
    }
  }
  return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
