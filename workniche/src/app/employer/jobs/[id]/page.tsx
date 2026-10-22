import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { JSX } from 'react';
import { eq } from 'drizzle-orm';

import { requireUser } from '@/lib/auth';
import { requireJobAccess } from '@/lib/authorization';
import { getDb } from '@/lib/db';
import { jobs } from '@/lib/db/schema';
import { formatDate, formatSalary, STATUS_LABELS } from '@/lib/format';
import { JobStatusButtons } from '@/components/server-forms';
import { Badge, BackLink } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function EmployerJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  const actor = await requireUser();
  const { job } = await requireJobAccess(actor, id);
  const [full] = await getDb().select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!full) notFound();

  return (
    <div className="space-y-6">
      <BackLink href="/employer/jobs">Back to jobs</BackLink>
      <header className="card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{full.title}</h1>
          <Badge tone={full.status === 'PUBLISHED' ? 'ok' : 'neutral'}>
            {STATUS_LABELS[full.status] ?? full.status}
          </Badge>
        </div>
        <p className="text-sm text-ink-muted">
          {formatSalary(full.salaryMin, full.salaryMax, full.salaryCurrency, full.salaryPeriod)}
          {full.publishedAt ? ` · Published ${formatDate(full.publishedAt)}` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <JobStatusButtons jobId={full.id} status={full.status} />
          <Link href={`/employer/jobs/${full.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <Link href={`/employer/candidates?job=${full.id}`} className="btn-secondary">
            View candidates
          </Link>
          {full.status === 'PUBLISHED' ? (
            <Link href={`/jobs/${full.slug}`} className="text-sm font-medium text-brand-700">
              Public listing ↗
            </Link>
          ) : null}
        </div>
      </header>

      <section className="card">
        <h2 className="text-lg font-semibold">Description</h2>
        <p className="mt-3 whitespace-pre-wrap text-ink-muted">{full.description}</p>
      </section>
      {full.applicationMethod === 'EXTERNAL' ? (
        <p className="text-sm text-ink-muted">
          Applications are directed to your own careers page: {full.externalApplicationUrl}
        </p>
      ) : null}
    </div>
  );
}
