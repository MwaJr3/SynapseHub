import Link from 'next/link';
import type { JSX } from 'react';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { listEmployerJobs, listOrgApplications } from '@/lib/queries';
import { resolveEmployerContext } from '@/lib/employer-context';
import { formatDate, STATUS_LABELS } from '@/lib/format';
import { Badge, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Candidates' };

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<JSX.Element> {
  const actor = await requireUser();
  const params = await searchParams;
  const context = await resolveEmployerContext(actor, params.org);
  const db = getDb();
  const jobFilter =
    typeof params.job === 'string' && params.job !== '' ? params.job : undefined;
  const rows = await listOrgApplications(
    context.organizationId,
    jobFilter ? { jobId: jobFilter } : {},
    db,
  );
  const jobs = await listEmployerJobs(context.organizationId, undefined, db);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Candidates</h1>
      <p className="text-ink-muted">
        Applicants for {context.organizationName}. Contact details follow each
        candidate&apos;s profile visibility — hidden fields never leave the server.
      </p>

      <form className="flex flex-wrap items-center gap-2">
        <label htmlFor="job-filter" className="text-sm font-medium">
          Filter by job
        </label>
        <select
          id="job-filter"
          name="job"
          className="input w-auto"
          defaultValue={jobFilter ?? ''}
        >
          <option value="">All jobs</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">Apply filter</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="No applications yet"
          body="When candidates apply, their files appear here with the full pipeline history."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.applicationId} className="card flex flex-wrap items-center gap-3">
              <Link
                href={`/employer/candidates/${row.applicationId}`}
                className="font-medium hover:text-brand-700"
              >
                {row.applicantName}
              </Link>
              <span className="text-sm text-ink-muted">{row.jobTitle}</span>
              <Badge tone="info">{STATUS_LABELS[row.status] ?? row.status}</Badge>
              <span className="ml-auto text-xs text-ink-subtle">
                Applied {formatDate(row.submittedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
