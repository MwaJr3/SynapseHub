import Link from 'next/link';
import type { JSX } from 'react';

import { requireUser } from '@/lib/auth';
import { AuthorizationError } from '@/lib/authorization';
import { getDb } from '@/lib/db';
import { listEmployerJobs } from '@/lib/queries';
import { employerOverviewStats } from '@/lib/recommendations';
import { resolveEmployerContext } from '@/lib/employer-context';
import { STATUS_LABELS } from '@/lib/format';
import { Badge, StatCard, VerificationBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Employer overview' };

export default async function EmployerOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<JSX.Element> {
  const actor = await requireUser();
  if (actor.role === 'JOB_SEEKER') {
    throw new AuthorizationError('Employer tools need a hiring account.', 403);
  }
  const params = await searchParams;
  const context = await resolveEmployerContext(actor, params.org);
  const db = getDb();
  const stats = await employerOverviewStats(context.organizationId, db);
  const jobs = await listEmployerJobs(context.organizationId, undefined, db);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{context.organizationName}</h1>
        <VerificationBadge status={context.verificationStatus} />
        {context.memberships.length > 1 ? (
          <form className="ml-auto flex items-center gap-2 text-sm">
            <label htmlFor="org-switch">Acting for</label>
            <select
              id="org-switch"
              name="org"
              className="input w-auto"
              defaultValue={context.organizationId}
            >
              {context.memberships.map((membership) => (
                <option key={membership.organizationId} value={membership.organizationId}>
                  {membership.organizationName}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-secondary">Switch</button>
          </form>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Published jobs"
          value={stats.jobsByStatus.PUBLISHED ?? 0}
          hint="Visible on the public job board right now"
        />
        <StatCard
          label="Applications (all time)"
          value={Object.values(stats.applicationsByStatus).reduce((a, b) => a + b, 0)}
        />
        <StatCard
          label="Applications (last 7 days)"
          value={stats.applicationsLast7Days}
          hint="Counted from submission timestamps"
        />
      </div>

      <section aria-labelledby="pipeline">
        <h2 id="pipeline" className="text-xl font-semibold">Pipeline by stage</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.keys(stats.applicationsByStatus).length === 0 ? (
            <p className="text-sm text-ink-muted">No applications yet.</p>
          ) : (
            Object.entries(stats.applicationsByStatus).map(([status, count]) => (
              <Badge key={status} tone="info">
                {STATUS_LABELS[status] ?? status}: {count}
              </Badge>
            ))
          )}
        </div>
      </section>

      <section aria-labelledby="recent-jobs">
        <div className="flex items-center justify-between">
          <h2 id="recent-jobs" className="text-xl font-semibold">Your jobs</h2>
          <Link href="/employer/jobs/new" className="btn-primary">Post a job</Link>
        </div>
        <ul className="mt-4 space-y-2">
          {jobs.slice(0, 6).map((job) => (
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
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
