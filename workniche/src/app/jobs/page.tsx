import Link from 'next/link';
import { Suspense, type JSX } from 'react';

import { getDb } from '@/lib/db';
import { searchJobs } from '@/lib/search';
import { jobQuerySchema } from '@/lib/validation';
import { JobCard } from '@/components/jobs';
import { FilterBar } from '@/components/job-filters';
import { EmptyState, Skeleton } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Jobs' };

/** Query params → validated JobQuery. Empty strings become defaults. */
function parseParams(searchParams: Record<string, string | string[] | undefined>) {
  const raw: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single != null && single !== '') raw[key] = single;
  }
  return jobQuerySchema.parse(raw);
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<JSX.Element> {
  const params = await searchParams;
  const query = parseParams(params);
  const result = await searchJobs(query, getDb());
  const totalPages = Math.max(1, Math.ceil(result.total / result.perPage));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jobs</h1>
        <p className="mt-1 text-ink-muted">{result.explanation}</p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <FilterBar resultCount={result.total} />
      </Suspense>

      {result.jobs.length === 0 ? (
        <EmptyState
          title="No jobs match these filters"
          body="Try removing a filter or broadening your keywords. The filters currently applied are listed above."
          action={
            <Link href="/jobs" className="btn-secondary">
              Clear all filters
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {result.jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center gap-3">
          {query.page > 1 ? (
            <Link className="btn-secondary" href={pageHref(params, query.page - 1)}>
              Previous
            </Link>
          ) : null}
          <p className="text-sm text-ink-muted">
            Page {query.page} of {totalPages}
          </p>
          {query.page < totalPages ? (
            <Link className="btn-secondary" href={pageHref(params, query.page + 1)}>
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

function pageHref(
  params: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single != null && single !== '' && key !== 'page') search.set(key, single);
  }
  search.set('page', String(page));
  return `/jobs?${search.toString()}`;
}
