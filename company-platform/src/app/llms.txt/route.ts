import { getDb } from '@/lib/db';
import { listCompanies, listPublishedCaseStudies, listPublishedProducts } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/** A plain-text map of the published site for language-model crawlers (llmstxt.org). Published records only. */
export async function GET(): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const db = getDb();
  const [companies, products, studies] = await Promise.all([
    listCompanies(db),
    listPublishedProducts(db),
    listPublishedCaseStudies(db),
  ]);
  const lines = [
    '# Velaqori Systems & Tamuzi Learning',
    '',
    '> One shared discovery platform for two independent companies: Velaqori Systems (software and cybersecurity) and Tamuzi Learning (education technology).',
    '',
    '## Companies',
    ...companies.map((c) => `- [${c.name}](${base}/companies/${c.slug})`),
    '',
    '## Products',
    ...products.map((p) => `- [${p.name}](${base}/products/${p.slug})`),
    '',
    '## Case studies',
    ...studies.map((s) => `- [${s.title}](${base}/case-studies/${s.slug})`),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
