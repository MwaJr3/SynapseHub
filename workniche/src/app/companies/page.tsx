import Link from 'next/link';
import type { JSX } from 'react';
import { desc, sql } from 'drizzle-orm';

import { getDb, rowsOf } from '@/lib/db';
import { VerificationBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Companies' };

export default async function CompaniesPage(): Promise<JSX.Element> {
  const db = getDb();
  const result: unknown = await db.execute(sql`
    SELECT o.id, o.name, o.slug, o.industry, o.headquarters,
      o.verification_status::text AS verification_status,
      (SELECT count(*)::int FROM jobs j
       WHERE j.organization_id = o.id AND j.status = 'PUBLISHED') AS published_jobs
    FROM organizations o
    ORDER BY o.name
  `);
  const companies = rowsOf(result);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Companies</h1>
        <p className="mt-1 text-ink-muted">
          Every company below is fictional demonstration data. Verification labels
          are applied by platform administrators and shown exactly as stored.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <article key={String(company.id)} className="card">
            <h2 className="text-lg font-semibold">
              <Link
                href={`/companies/${String(company.slug)}`}
                className="hover:text-brand-700"
              >
                {String(company.name)}
              </Link>
            </h2>
            <div className="mt-2">
              <VerificationBadge status={String(company.verification_status)} />
            </div>
            <p className="mt-3 text-sm text-ink-muted">
              {String(company.industry) || 'Industry not specified'}
              {String(company.headquarters) ? ` · ${String(company.headquarters)}` : ''}
            </p>
            <p className="mt-2 text-sm">
              {Number(company.published_jobs)} published role
              {Number(company.published_jobs) === 1 ? '' : 's'}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
