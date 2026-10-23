import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  Badge,
  Breadcrumbs,
  IllustrativeLabel,
  Section,
  StatusBadge,
} from '@/components/ui';
import { CompanyTokenSync } from '@/components/company-token-sync';
import { getDb } from '@/lib/db';
import {
  getCompanyBySlug,
  listPublishedCaseStudies,
  listPublishedProducts,
  listPublishedSolutions,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug, getDb());
  if (!company) return { title: 'Company not found' };
  return {
    title: company.name,
    description: company.overview.slice(0, 160),
    robots: { index: true, follow: true },
  };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  const company = await getCompanyBySlug(slug, db);
  if (!company) notFound();

  const products = (await listPublishedProducts(db)).filter(
    (product) => product.companySlug === company.slug,
  );
  const caseStudies = (await listPublishedCaseStudies(db)).filter(
    (study) => study.companySlug === company.slug,
  );
  const solutions = (await listPublishedSolutions(db)).filter(
    (solution) => solution.companySlug === company.slug,
  );
  const featured = products.filter((product) =>
    company.featuredProductSlugs.includes(product.slug),
  );
  const featuredCaseStudies = caseStudies.filter((study) =>
    company.featuredCaseStudySlugs.includes(study.slug),
  );

  return (
    <div className="space-y-8">
      <CompanyTokenSync companySlug={company.slug} />
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Companies', href: '/companies' },
          { label: company.name },
        ]}
      />
      <header className="card">
        <Badge tone="accent">Independent company · working name</Badge>
        <h1 className="mt-3 text-2xl font-semibold">{company.name}</h1>
        <p className="mt-2 max-w-prose text-lg text-muted">{company.tagline}</p>
        <p className="mt-3 max-w-prose text-muted">{company.overview}</p>
        <p className="mt-3 text-xs text-muted">{company.workingNameNotice}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/companies/${company.slug}/about`} className="btn btn-primary">
            About {company.name}
          </Link>
          <Link href={`/products?company=${company.slug}`} className="btn btn-secondary">
            All products
          </Link>
          <Link href="/contact" className="btn btn-secondary">Contact</Link>
        </div>
      </header>

      <section aria-labelledby="focus-heading">
        <h2 id="focus-heading" className="text-lg font-semibold">Focus areas</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {company.focusAreas.map((area) => (
            <Badge key={area} tone="accent">{area}</Badge>
          ))}
        </div>
      </section>

      {solutions.length > 0 ? (
        <section aria-labelledby="solutions-heading">
          <h2 id="solutions-heading" className="text-lg font-semibold">Solutions</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {solutions.map((solution) => (
              <article key={solution.slug} className="card">
                <h3 className="text-base font-semibold">
                  <Link href={`/solutions/${solution.slug}`} className="hover:underline">
                    {solution.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-muted">{solution.problem}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section aria-labelledby="featured-heading">
          <h2 id="featured-heading" className="text-lg font-semibold">Featured products</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <article key={product.slug} className="card flex flex-col">
                <IllustrativeLabel label={product.visualLabel} />
                <h3 className="mt-3 text-base font-semibold">
                  <Link href={`/products/${product.slug}`} className="hover:underline">
                    {product.name}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-muted">{product.summary}</p>
                <div className="mt-2">
                  <StatusBadge status={product.status} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <Section title="All products from this company">
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {products.map((product) => (
            <li key={product.slug}>
              <Link href={`/products/${product.slug}`} className="accent-text hover:underline">
                {product.name}
              </Link>
              <span className="text-xs text-muted"> — {product.category}</span>
            </li>
          ))}
        </ul>
      </Section>

      {featuredCaseStudies.length > 0 ? (
        <Section title="Featured case studies">
          <ul className="space-y-1.5">
            {featuredCaseStudies.map((study) => (
              <li key={study.slug}>
                <Link href={`/case-studies/${study.slug}`} className="accent-text hover:underline">
                  {study.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
