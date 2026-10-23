import Link from 'next/link';
import type { JSX } from 'react';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { listSeekerApplications } from '@/lib/queries';
import { recommendForSeeker } from '@/lib/recommendations';
import { formatDate, STATUS_LABELS } from '@/lib/format';
import { Badge, EmptyState, StatCard } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard' };

export default async function DashboardPage(): Promise<JSX.Element> {
  const actor = await requireUser();
  const db = getDb();
  const applications = await listSeekerApplications(actor.id, db);
  const recommendations = await recommendForSeeker(actor.id, 5, db);

  const byStatus: Record<string, number> = {};
  for (const application of applications) {
    byStatus[application.status] = (byStatus[application.status] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {actor.name}</h1>
        <p className="mt-1 text-ink-muted">
          Real counts from your account — nothing here is estimated.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Applications" value={applications.length} />
        <StatCard
          label="In progress"
          value={applications.filter((a) => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(a.status)).length}
          hint="Submitted, under review, shortlisted, interviewing or offer"
        />
        <StatCard
          label="Closed"
          value={byStatus.REJECTED ?? 0}
          hint="Not moving forward"
        />
      </div>

      <section aria-labelledby="matches">
        <h2 id="matches" className="text-xl font-semibold">Recommended for you</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Scored from your profile&apos;s skills and preferences. Every match lists
          exactly why it appears.
        </p>
        {recommendations.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No recommendations yet"
              body="Add skills to your profile or browse the job list — matches use what you tell us, nothing else."
              action={<Link href="/jobs" className="btn-primary">Browse jobs</Link>}
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {recommendations.map((item) => (
              <li key={item.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/jobs/${item.slug}`} className="text-lg font-semibold hover:text-brand-700">
                      {item.title}
                    </Link>
                    <p className="text-sm text-ink-muted">
                      {item.organizationName} · {item.workplaceType.toLowerCase()}
                    </p>
                  </div>
                  <Badge tone="info">{item.match.score} point match</Badge>
                </div>
                <p className="mt-2 text-sm text-ink-muted">{item.match.summary}</p>
                {item.match.matchedSkills.length > 0 ? (
                  <p className="mt-1 text-xs text-signal-ok">
                    Matched: {item.match.matchedSkills.join(', ')}
                  </p>
                ) : null}
                {item.match.missingSkills.length > 0 ? (
                  <p className="mt-1 text-xs text-ink-subtle">
                    Not yet in your profile: {item.match.missingSkills.join(', ')}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="recent-applications">
        <h2 id="recent-applications" className="text-xl font-semibold">Recent applications</h2>
        {applications.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No applications yet"
              body="When you apply to a role, its status and history appear here."
              action={<Link href="/jobs" className="btn-primary">Find a role</Link>}
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {applications.slice(0, 5).map((application) => (
              <li key={application.applicationId} className="card flex flex-wrap items-center gap-3">
                <Link
                  href={`/dashboard/applications/${application.applicationId}`}
                  className="font-medium hover:text-brand-700"
                >
                  {application.jobTitle}
                </Link>
                <span className="text-sm text-ink-muted">{application.organizationName}</span>
                <Badge tone="info">{STATUS_LABELS[application.status] ?? application.status}</Badge>
                <span className="ml-auto text-xs text-ink-subtle">
                  Updated {formatDate(application.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
