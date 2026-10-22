import Link from 'next/link';
import type { JSX } from 'react';

import { getDb } from '@/lib/db';
import { searchJobs } from '@/lib/search';
import { jobQuerySchema } from '@/lib/validation';
import { JobCard } from '@/components/jobs';
import { getSessionActor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage(): Promise<JSX.Element> {
  const query = jobQuerySchema.parse({ perPage: 6, sort: 'recent' });
  const result = await searchJobs(query, getDb());
  const actor = await getSessionActor();

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-line bg-gradient-to-br from-brand-50 to-white p-8">
        <h1 className="max-w-2xl text-3xl font-bold text-ink">
          Specialized technical work, matched with care
        </h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          WorkNiche is a demonstration job marketplace where candidates see honest
          listings, explainable matches and real application state — and hiring teams
          get a pipeline that respects both sides. Every company, person and listing
          in this build is fictional sample data.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/jobs" className="btn-primary">Browse jobs</Link>
          <Link href={actor ? '/dashboard' : '/register'} className="btn-secondary">
            {actor ? 'Open your dashboard' : 'Create an account'}
          </Link>
          <Link href="/companies" className="btn-secondary">Explore companies</Link>
        </div>
      </section>

      <section aria-labelledby="recent-jobs">
        <div className="flex items-center justify-between">
          <h2 id="recent-jobs" className="text-xl font-semibold">
            Recently published roles
          </h2>
          <Link href="/jobs" className="text-sm font-medium text-brand-700 hover:text-brand-800">
            See all jobs →
          </Link>
        </div>
        {result.jobs.length === 0 ? (
          <p className="mt-4 text-ink-muted">No published roles yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {result.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <h2 className="font-semibold">Explainable matches</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Recommendations list the skills and preferences behind every score —
            no invented confidence numbers.
          </p>
        </div>
        <div className="card">
          <h2 className="font-semibold">One application per role</h2>
          <p className="mt-2 text-sm text-ink-muted">
            The database itself enforces one application per candidate per job,
            with an append-only status history you can audit.
          </p>
        </div>
        <div className="card">
          <h2 className="font-semibold">Verified companies</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Verification states are explicit: verified, under review, unverified
            or suspended — always labelled where they appear.
          </p>
        </div>
      </section>
    </div>
  );
}
