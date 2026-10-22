import Link from 'next/link';
import type { JSX } from 'react';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { listSeekerApplications } from '@/lib/queries';
import { formatDate, STATUS_LABELS } from '@/lib/format';
import { Badge, EmptyState, VerificationBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My applications' };

export default async function ApplicationsPage(): Promise<JSX.Element> {
  const actor = await requireUser();
  const applications = await listSeekerApplications(actor.id, getDb());

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My applications</h1>
      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          body="Applications you submit appear here with their full status history."
          action={<Link href="/jobs" className="btn-primary">Browse jobs</Link>}
        />
      ) : (
        <ul className="space-y-3">
          {applications.map((application) => (
            <li key={application.applicationId} className="card">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/dashboard/applications/${application.applicationId}`}
                  className="text-lg font-semibold hover:text-brand-700"
                >
                  {application.jobTitle}
                </Link>
                <Badge tone="info">{STATUS_LABELS[application.status] ?? application.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                <span>{application.organizationName}</span>
                <VerificationBadge status={application.organizationVerification} />
                <span>·</span>
                <span>Applied {formatDate(application.submittedAt)}</span>
                <span>·</span>
                <span>Updated {formatDate(application.updatedAt)}</span>
                {application.resumeFilename ? (
                  <span>· Résumé: {application.resumeFilename}</span>
                ) : (
                  <span>· No résumé attached</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
