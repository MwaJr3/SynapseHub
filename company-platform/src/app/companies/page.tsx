import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/ui';
import { getDb } from '@/lib/db';
import { listCompanies, listPublishedProducts } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Companies',
  description:
    'Two independent companies — Velaqori Systems and Tamuzi Learning — presented separately on one shared platform.',
};

export default async function CompaniesPage() {
  const db = getDb();
  const companies = await listCompanies(db);
  const products = await listPublishedProducts(db);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Companies</h1>
        <p className="mt-2 max-w-prose text-muted">
          Velaqori Systems and Tamuzi Learning are separate businesses that share
          this discovery platform. No parent-subsidiary relationship, shared
          staff, shared liability, or certification is claimed.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {companies.map((company) => {
          const count = products.filter((p) => p.companySlug === company.slug).length;
          return (
            <article key={company.slug} className="card">
              <Badge tone="accent">{company.accentToken === 'vela' ? 'Software & cybersecurity' : 'Education technology'}</Badge>
              <h2 className="mt-2 text-xl font-semibold">{company.name}</h2>
              <p className="mt-2 text-sm text-muted">{company.tagline}</p>
              <p className="mt-3 text-sm text-muted">{company.overview}</p>
              <p className="mt-3 text-sm">{count} published products</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/companies/${company.slug}`} className="btn btn-primary">
                  Company page
                </Link>
                <Link href={`/companies/${company.slug}/about`} className="btn btn-secondary">
                  About {company.name}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
