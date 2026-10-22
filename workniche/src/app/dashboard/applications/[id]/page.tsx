import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { JSX } from 'react';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getSeekerApplication } from '@/lib/queries';
import { formatDate, STATUS_LABELS } from '@/lib/format';
import { WithdrawButton } from '@/components/job-actions';
import { Badge, BackLink, EmptyState, VerificationBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Application' };

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  const actor = await requireUser();
  const application = await getSeekerApplication(actor.id, id, getDb());
  if (!application) notFound();

  return (
    <div className="space-y-6">
      <BackLink href="/dashboard/applications">Back to my applications</BackLink>

      <header className="card">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{application.jobTitle}</h1>
          <Badge tone="info">{STATUS_LABELS[application.status] ?? application.status}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <span>{application.organizationName}</span>
          <VerificationBadge status={application.organizationVerification} />
          <span>·</span>
          <span>Applied {formatDate(application.submittedAt)}</span>
        </div>
        {!['WITHDRAWN', 'HIRED', 'REJECTED'].includes(application.status) ? (
          <div className="mt-4">
            <WithdrawButton applicationId={application.applicationId} />
          </div>
        ) : null}
      </header>

      <section className="card">
        <h2 className="text-lg font-semibold">Status history</h2>
        <ol className="mt-3 space-y-2">
          {application.history.map((entry, index) => (
            <li key={`${entry.status}-${index}`} className="flex items-center gap-3 text-sm">
              <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />
              <span className="font-medium">{STATUS_LABELS[entry.status] ?? entry.status}</span>
              <span className="text-ink-subtle">{formatDate(entry.createdAt)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Your cover letter</h2>
        <p className="mt-3 whitespace-pre-wrap text-ink-muted">
          {application.coverLetter || 'No cover letter provided.'}
        </p>
      </section>

      {application.answers.length > 0 ? (
        <section className="card">
          <h2 className="text-lg font-semibold">Your answers</h2>
          <dl className="mt-3 space-y-4">
            {application.answers.map((answer, index) => (
              <div key={index}>
                <dt className="font-medium">{answer.question}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-ink-muted">{answer.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="card">
        <h2 className="text-lg font-semibold">Résumé</h2>
        {application.resumeFilename && application.resumeId ? (
          <p className="mt-2 text-sm">
            <a
              href={`/api/files/${application.resumeId}`}
              className="font-medium text-brand-700 hover:text-brand-800"
              download
            >
              Download {application.resumeFilename}
            </a>
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">No résumé was attached.</p>
        )}
      </section>

      <p className="text-xs text-ink-subtle">
        Notes written by the hiring team are private to that team and are not part of
        this view by design.
      </p>
    </div>
  );
}
