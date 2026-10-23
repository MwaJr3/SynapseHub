import Link from 'next/link';
import type { JSX } from 'react';
import { desc, eq, sql } from 'drizzle-orm';

import { getDb, rowsOf } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { formatDate } from '@/lib/format';
import { VerifyOrgButtons } from '@/components/server-forms';
import { VerificationBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Organizations' };

export default async function AdminOrganizationsPage(): Promise<JSX.Element> {
  const db = getDb();
  const orgs = await db
    .select()
    .from(organizations)
    .orderBy(desc(organizations.createdAt));
  const counts: unknown = await db.execute(sql`
    SELECT organization_id, count(*)::int AS n FROM jobs GROUP BY organization_id
  `);
  const jobCounts = new Map(
    rowsOf(counts).map((row) => [String(row.organization_id), Number(row.n)]),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Organizations</h1>
      <ul className="space-y-3">
        {orgs.map((org) => (
          <li key={org.id} className="card space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/companies/${org.slug}`} className="text-lg font-semibold">
                {org.name}
              </Link>
              <VerificationBadge status={org.verificationStatus} />
              <span className="text-sm text-ink-muted">
                {jobCounts.get(org.id) ?? 0} job(s) · created {formatDate(org.createdAt)}
              </span>
            </div>
            <VerifyOrgButtons
              organizationId={org.id}
              current={org.verificationStatus}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
