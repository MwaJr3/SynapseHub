import type { JSX } from 'react';
import { desc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { jobs, organizations, reports } from '@/lib/db/schema';
import { ModerationForm } from '@/components/server-forms';
import { Badge, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Moderation queue' };

export default async function AdminReportsPage(): Promise<JSX.Element> {
  const db = getDb();
  const rows = await db
    .select({
      id: reports.id,
      reason: reports.reason,
      details: reports.details,
      status: reports.status,
      createdAt: reports.createdAt,
      resolutionNote: reports.resolutionNote,
      jobTitle: jobs.title,
      organizationName: organizations.name,
    })
    .from(reports)
    .leftJoin(jobs, eq(jobs.id, reports.jobId))
    .leftJoin(organizations, eq(organizations.id, reports.organizationId))
    .orderBy(desc(reports.createdAt));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Moderation queue</h1>
      {rows.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          body="Reports filed from job and company pages appear here."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="card space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={row.status === 'OPEN' ? 'warn' : 'neutral'}>
                  {row.status}
                </Badge>
                <Badge tone="bad">{row.reason}</Badge>
                <span className="text-sm text-ink-muted">
                  {row.jobTitle ? `Job: ${row.jobTitle}` : ''}
                  {row.organizationName ? ` · Org: ${row.organizationName}` : ''}
                </span>
              </div>
              {row.details ? <p className="text-sm text-ink-muted">{row.details}</p> : null}
              {row.resolutionNote ? (
                <p className="text-xs text-ink-subtle">Resolution: {row.resolutionNote}</p>
              ) : null}
              {row.status === 'OPEN' || row.status === 'UNDER_REVIEW' ? (
                <ModerationForm reportId={row.id} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
