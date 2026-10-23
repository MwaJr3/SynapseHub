import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  Badge,
  Breadcrumbs,
  CompanyBadge,
  IllustrativeLabel,
  Section,
  StatusBadge,
  ExternalLinkButton,
} from '@/components/ui';
import { CompanyTokenSync } from '@/components/company-token-sync';
import { getDb } from '@/lib/db';
import { getPublishedProductBySlug, getCaseStudyBySlug, listPublishedProducts } from '@/lib/queries';
import { isConfiguredUrl } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug, getDb());
  if (!product) return { title: 'Product not found' };
  return {
    title: `${product.name} — ${product.companyName}`,
    description: product.purpose,
    robots: { index: true, follow: true },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  const product = await getPublishedProductBySlug(slug, db);
  if (!product) notFound();

  const caseStudy = await getCaseStudyBySlug(`${product.slug}-case-study`, db);
  const all = await listPublishedProducts(db);
  const related = all
    .filter((p) => p.companySlug === product.companySlug && p.slug !== product.slug)
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <CompanyTokenSync companySlug={product.companySlug} />
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Products', href: '/products' },
          { label: product.name },
        ]}
      />
      <header className="card">
        <div className="flex flex-wrap items-center gap-2">
          <CompanyBadge name={product.companyName} />
          <StatusBadge status={product.status} />
          {product.categories.map((category) => (
            <Badge key={category}>{category}</Badge>
          ))}
        </div>
        <h1 className="mt-3 text-2xl font-semibold">{product.name}</h1>
        <p className="mt-2 max-w-prose text-muted">{product.purpose}</p>
        <p className="mt-2 text-sm text-muted">{product.statusNote}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {caseStudy ? (
            <Link href={`/case-studies/${caseStudy.slug}`} className="btn btn-primary">
              Read the case study
            </Link>
          ) : null}
          <Link href={`/companies/${product.companySlug}`} className="btn btn-secondary">
            {product.companyName}
          </Link>
          {isConfiguredUrl(product.liveDemoUrl) ? (
            <ExternalLinkButton href={product.liveDemoUrl}>Live Demo</ExternalLinkButton>
          ) : null}
          {isConfiguredUrl(product.repositoryUrl) ? (
            <ExternalLinkButton href={product.repositoryUrl}>Source Code</ExternalLinkButton>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="What it does">
          <p>{product.summary}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {product.features.map((feature) => (
              <li key={feature.title}>
                <strong className="text-[var(--ink)]">{feature.title}:</strong>{' '}
                {feature.description}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Technologies and categories">
          <div className="flex flex-wrap gap-1.5">
            {product.technologies.map((tech) => (
              <Badge key={tech}>{tech}</Badge>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.categories.map((category) => (
              <Badge key={category} tone="accent">{category}</Badge>
            ))}
          </div>
          <p className="mt-4 text-xs">{product.verificationNote}</p>
        </Section>
      </div>

      <IllustrativeLabel label={product.visualLabel} />

      {related.length > 0 ? (
        <section aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-lg font-semibold">
            More from {product.companyName}
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {related.map((item) => (
              <li key={item.slug} className="card text-sm">
                <Link href={`/products/${item.slug}`} className="font-medium hover:underline">
                  {item.name}
                </Link>
                <p className="mt-1 text-muted">{item.category}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
