import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge, Breadcrumbs, CompanyBadge, Section } from '@/components/ui';
import { CompanyTokenSync } from '@/components/company-token-sync';
import { getDb } from '@/lib/db';
import { getPublishedSolutionBySlug, listPublishedProducts } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const solution = await getPublishedSolutionBySlug(slug, getDb());
  if (!solution) return { title: 'Solution not found' };
  return {
    title: solution.title,
    description: solution.problem.slice(0, 160),
    robots: { index: true, follow: true },
  };
}

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  const solution = await getPublishedSolutionBySlug(slug, db);
  if (!solution) notFound();

  const products = (await listPublishedProducts(db)).filter(
    (product) => product.companySlug === solution.companySlug,
  );

  return (
    <div className="space-y-6">
      <CompanyTokenSync companySlug={solution.companySlug} />
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Solutions', href: '/solutions' },
          { label: solution.title },
        ]}
      />
      <header className="card">
        <CompanyBadge name={solution.companyName} />
        <h1 className="mt-3 text-2xl font-semibold">{solution.title}</h1>
      </header>
      <Section title="The problem">
        <p>{solution.problem}</p>
      </Section>
      <Section title="Our approach">
        <p>{solution.approach}</p>
      </Section>
      <Section title="Who this is for">
        <ul className="list-disc space-y-1 pl-5">
          {solution.audiences.map((audience) => (
            <li key={audience}>{audience}</li>
          ))}
        </ul>
      </Section>
      <Section title="Products in this area">
        <ul className="flex flex-wrap gap-2">
          {products.map((product) => (
            <li key={product.slug}>
              <Link href={`/products/${product.slug}`} className="btn btn-secondary">
                {product.name}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs">
          Products relate to solution areas by the operating company’s
          documentation; each product has exactly one operating company.
        </p>
      </Section>
    </div>
  );
}
