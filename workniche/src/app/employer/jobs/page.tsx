import Link from 'next/link';
import type { JSX } from 'react';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { listEmployerJobs } from '@/lib/queries';
import { resolveEmployerContext } from '@/lib/employer-context';
import { formatDate, STATUS_LABELS } from '@/lib/format';
import { Badge, EmptyState, VerificationBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Employer jobs' };

export default async function EmployerJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<JSX.Element> {
  const actor = await requireUser();
  const params = await searchParams;
  const context = await resolveEmployerContext(actor, params.org);
  const jobs = await listEmployerJobs(context.organizationId, undefined, getDb());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Jobs at {context.organizationName}</h1>
        <VerificationBadge status={context.verificationStatus} />
        <Link href="/employer/jobs/new" className="btn-primary ml-auto">Post a job</Link>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          body="Create your first listing. Drafts stay private until you publish them."
          action={<Link href="/employer/jobs/new" className="btn-primary">Post a job</Link>}
        />
      ) : (
        <ul className="space-y-2">
          {jobs.map((job) => (
            <li key={job.id} className="card flex flex-wrap items-center gap-3">
              <Link href={`/employer/jobs/${job.id}`} className="font-medium hover:text-brand-700">
                {job.title}
              </Link>
              <Badge tone={job.status === 'PUBLISHED' ? 'ok' : 'neutral'}>
                {STATUS_LABELS[job.status] ?? job.status}
              </Badge>
              <span className="text-sm text-ink-muted">
                {job.applicationCount} application{job.applicationCount === 1 ? '' : 's'}
                {job.newCount > 0 ? ` · ${job.newCount} new` : ''}
              </span>
              <span className="ml-auto text-xs text-ink-subtle">
                {job.publishedAt ? `Published ${formatDate(job.publishedAt)}` : 'Not published'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
