import Link from 'next/link';

import { BlurFade, DotPattern } from '@/components/decor-client';
import { IllustrativeLabel, Badge, StatusBadge, CompanyBadge } from '@/components/ui';
import { SEED_DATA_NOTICE } from '@/content';
import { listCompanies, listPublishedCaseStudies, listPublishedProducts, listPublishedPeople } from '@/lib/queries';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let data;
  try {
    const db = getDb();
    data = await Promise.all([
      listCompanies(db),
      listPublishedProducts(db),
      listPublishedCaseStudies(db),
      listPublishedPeople(db),
    ]);
  } catch (error) {
    console.error('[home] catalogue unavailable', error);
    return (
      <section className="card p-8" role="status">
        <h1 className="text-2xl font-semibold">Catalogue temporarily unavailable</h1>
        <p className="mt-3 text-muted">
          The content database could not be reached. Please try again in a few minutes.
        </p>
      </section>
    );
  }
  const [companies, products, caseStudies, people] = data;

  const featuredProducts = products.filter((product) => product.featured).slice(0, 6);

  return (
    <div className="space-y-14">
      <section aria-labelledby="hero-heading" className="card relative overflow-hidden p-8">
        <DotPattern />
        <BlurFade>
        <Badge tone="accent">Two independent companies · one shared platform</Badge>
        <h1 id="hero-heading" className="mt-4 text-3xl font-semibold leading-tight">
          Software and cyber engineering. Education technology.
          <span className="block accent-text">Discover the work behind both.</span>
        </h1>
        <p className="mt-4 max-w-prose text-muted">
          This platform presents the products, case studies, and people of two
          separate businesses — <strong>Velaqori Systems</strong> (software and
          cybersecurity) and <strong>Tamuzi Learning</strong> (education
          technology). Both names are working names pending trademark checks.
          No parent-subsidiary relationship, shared liability, or certification
          is claimed.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/products" className="btn btn-primary">Browse all products</Link>
          <Link href="/case-studies" className="btn btn-secondary">Read the case studies</Link>
        </div>
        </BlurFade>
      </section>

      <section aria-labelledby="companies-heading">
        <h2 id="companies-heading" className="text-xl font-semibold">The two companies</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {companies.map((company) => (
            <article key={company.slug} className="card">
              <h3 className="text-lg font-semibold">{company.name}</h3>
              <p className="mt-2 text-sm text-muted">{company.tagline}</p>
              <p className="mt-3 text-sm text-muted">{company.overview}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/companies/${company.slug}`} className="btn btn-primary">
                  Explore {company.name}
                </Link>
                <Link href={`/companies/${company.slug}/about`} className="btn btn-secondary">
                  About
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="featured-heading">
        <h2 id="featured-heading" className="text-xl font-semibold">Featured products</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((product) => (
            <article key={product.slug} className="card flex flex-col">
              <IllustrativeLabel label={product.visualLabel} />
              <h3 className="mt-3 text-base font-semibold">
                <Link href={`/products/${product.slug}`} className="hover:underline">
                  {product.name}
                </Link>
              </h3>
              <p className="mt-1 text-sm text-muted">{product.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <CompanyBadge name={product.companyName} />
                <StatusBadge status={product.status} />
              </div>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm">
          <Link href="/products" className="accent-text hover:underline">
            View all {products.length} products →
          </Link>
        </p>
      </section>

      <section aria-labelledby="cases-heading">
        <h2 id="cases-heading" className="text-xl font-semibold">Featured case studies</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {caseStudies.slice(0, 4).map((study) => (
            <article key={study.slug} className="card">
              <h3 className="text-base font-semibold">
                <Link href={`/case-studies/${study.slug}`} className="hover:underline">
                  {study.title}
                </Link>
              </h3>
              <p className="mt-2 text-sm text-muted">
                {study.productName} · {study.companyName}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="people-heading" className="card">
        <h2 id="people-heading" className="text-xl font-semibold">Meet the people</h2>
        <p className="mt-2 text-sm text-muted">
          Public profiles show only the fields each person has chosen to publish.
        </p>
        <p className="mt-3 text-sm">
          <Link href="/people" className="accent-text hover:underline">
            {people.length} published {people.length === 1 ? 'profile' : 'profiles'} →
          </Link>
        </p>
      </section>

      <section aria-labelledby="closing-heading" className="card">
        <h2 id="closing-heading" className="text-xl font-semibold">How the work is developed</h2>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Each product ships with a project-specific case study covering the
          problem, constraints, workflow, architecture, data model, engineering
          decisions, testing, and limitations. Status labels distinguish built
          work from deployed work. Unconfigured demo or source links are hidden —
          never faked.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/about" className="btn btn-secondary">About the platform</Link>
          <Link href="/contact" className="btn btn-secondary">Contact a company</Link>
        </div>
        <p className="mt-4 text-xs text-muted">{SEED_DATA_NOTICE}</p>
      </section>
    </div>
  );
}
