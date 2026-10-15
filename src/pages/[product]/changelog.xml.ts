import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { liveProducts, getProduct } from '../../lib/content';
import { SITE } from '../../lib/jsonld';

// Atom feed of releases (English).
export async function getStaticPaths() {
  return (await liveProducts()).map((p) => ({ params: { product: p.slug } }));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ params }) => {
  const slug = params.product!;
  const product = await getProduct(slug);
  const log = (await getEntry('changelog', `${slug}/en`))?.data;
  const entries = log?.entries ?? [];
  const updated = entries[0]?.date ? `${entries[0].date}T00:00:00Z` : new Date().toISOString();
  const feedUrl = `${SITE}/${slug}/changelog.xml`;
  const pageUrl = `${SITE}/${slug}/changelog/`;
  const items = entries
    .map((e) => {
      const id = `${pageUrl}#v${e.name.replace(/\./g, '-')}`;
      const date = e.date ? `${e.date}T00:00:00Z` : updated;
      const html = `<ul>${e.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
      return `  <entry>\n    <title>${esc(product.name)} ${esc(e.name)}</title>\n    <id>${id}</id>\n    <link href="${id}"/>\n    <updated>${date}</updated>\n    <content type="html">${esc(html)}</content>\n  </entry>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <title>${esc(product.name)} release notes</title>\n  <id>${feedUrl}</id>\n  <link href="${feedUrl}" rel="self"/>\n  <link href="${pageUrl}"/>\n  <updated>${updated}</updated>\n  <author><name>DappleByte</name><email>hello@dapplebyte.com</email></author>\n${items}\n</feed>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } });
};
