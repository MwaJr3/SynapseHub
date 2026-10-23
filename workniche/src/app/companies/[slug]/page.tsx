import { notFound } from 'next/navigation';
import type { JSX } from 'react';
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { searchJobs } from '@/lib/search';
import { jobQuerySchema } from '@/lib/validation';
import { JobCard } from '@/components/jobs';
import { VerificationBadge, BackLink, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const db = getDb();
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  if (!org) notFound();

  // Company pages list published roles only — drafts stay internal.
  const result = await searchJobs(
    jobQuerySchema.parse({ perPage: 50, sort: 'recent' }),
    db,
  );
  const jobs = result.jobs.filter((job) => job.organizationSlug === org.slug);

  return (
    <div className="space-y-6">
      <BackLink href="/companies">Back to companies</BackLink>
      <header className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <p className="mt-1 text-ink-muted">
              {[org.industry, org.headquarters].filter(Boolean).join(' · ') ||
                'No company details provided'}
            </p>
          </div>
          <VerificationBadge status={org.verificationStatus} />
        </div>
        <p className="mt-4 whitespace-pre-wrap text-ink-muted">
          {org.description || 'No description provided.'}
        </p>
        {org.remotePolicy ? (
          <p className="mt-3 text-sm">Remote policy: {org.remotePolicy}</p>
        ) : null}
      </header>

      <section aria-labelledby="open-roles">
        <h2 id="open-roles" className="text-xl font-semibold">
          Published roles
        </h2>
        {jobs.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No published roles right now"
              body="This company has no open listings at the moment. Saved searches and alerts can tell you when that changes."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
