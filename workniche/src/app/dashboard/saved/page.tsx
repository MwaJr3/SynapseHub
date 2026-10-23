import Link from 'next/link';
import type { JSX } from 'react';
import { eq } from 'drizzle-orm';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { savedJobs } from '@/lib/db/schema';
import { searchJobs } from '@/lib/search';
import { jobQuerySchema } from '@/lib/validation';
import { JobCard } from '@/components/jobs';
import { EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Saved jobs' };

export default async function SavedJobsPage(): Promise<JSX.Element> {
  const actor = await requireUser();
  const db = getDb();
  const rows = await db
    .select({ jobId: savedJobs.jobId })
    .from(savedJobs)
    .where(eq(savedJobs.userId, actor.id));
  const savedIds = new Set(rows.map((row) => row.jobId));

  const result = await searchJobs(jobQuerySchema.parse({ perPage: 50 }), db);
  const jobs = result.jobs.filter((job) => savedIds.has(job.id));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Saved jobs</h1>
      {jobs.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          body="Save interesting roles from their listing pages and they collect here."
          action={<Link href="/jobs" className="btn-primary">Browse jobs</Link>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
