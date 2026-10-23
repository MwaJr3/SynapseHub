import { notFound } from 'next/navigation';
import type { JSX } from 'react';
import { eq } from 'drizzle-orm';

import { jobs } from '@/lib/db/schema';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getCandidateDetail } from '@/lib/queries';
import { listAssignableMembers } from '@/lib/authorization';
import { formatDate, STATUS_LABELS } from '@/lib/format';
import {
  AssignSelect,
  NoteForm,
  StatusSelect,
} from '@/components/server-forms';
import { Badge, BackLink, VerificationBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  const actor = await requireUser();
  const db = getDb();
  const candidate = await getCandidateDetail(actor, id, db);
  if (!candidate) notFound();

  // Organization of the job — access already proven by getCandidateDetail.
  const orgId = await orgIdForJob(candidate.jobId, db);
  const members = await listAssignableMembers(orgId, db);

  return (
    <div className="space-y-6">
      <BackLink href="/employer/candidates">Back to candidates</BackLink>

      <header className="card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{candidate.applicantName}</h1>
          <Badge tone="info">{STATUS_LABELS[candidate.status] ?? candidate.status}</Badge>
          <VerificationBadge status={candidate.organizationVerification} />
        </div>
        <p className="text-sm text-ink-muted">
          Applied to {candidate.jobTitle} on {formatDate(candidate.submittedAt)}
          {candidate.applicantEmail ? ` · ${candidate.applicantEmail}` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <StatusSelect applicationId={candidate.applicationId} current={candidate.status} />
          <AssignSelect
            applicationId={candidate.applicationId}
            current={candidate.assignedToId}
            members={members.map((member) => ({ userId: member.userId, name: member.name }))}
          />
        </div>
        {candidate.resumeFilename && candidate.resumeId ? (
          <p className="text-sm">
            <a
              href={`/api/files/${candidate.resumeId}`}
              className="font-medium text-brand-700"
            >
              Download résumé ({candidate.resumeFilename})
            </a>
          </p>
        ) : (
          <p className="text-sm text-ink-muted">No résumé attached.</p>
        )}
      </header>

      {candidate.profile ? (
        <section className="card">
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {candidate.profile.headline || 'No headline.'} ·{' '}
            {candidate.profile.location || 'Location not provided'} ·{' '}
            {candidate.profile.yearsExperience} years experience
          </p>
          {candidate.profile.skills.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {candidate.profile.skills.map((skill) => (
                <li key={skill} className="rounded bg-surface-sunken px-2 py-0.5 text-xs">
                  {skill}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="card">
        <h2 className="text-lg font-semibold">Cover letter</h2>
        <p className="mt-3 whitespace-pre-wrap text-ink-muted">
          {candidate.coverLetter || 'No cover letter.'}
        </p>
      </section>

      {candidate.answers.length > 0 ? (
        <section className="card">
          <h2 className="text-lg font-semibold">Screening answers</h2>
          <dl className="mt-3 space-y-3">
            {candidate.answers.map((answer, index) => (
              <div key={index}>
                <dt className="font-medium">{answer.question}</dt>
                <dd className="mt-1 text-ink-muted">{answer.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="card">
        <h2 className="text-lg font-semibold">Status history</h2>
        <ol className="mt-3 space-y-2">
          {candidate.history.map((entry, index) => (
            <li key={index} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">
                {STATUS_LABELS[entry.status] ?? entry.status}
              </span>
              <span className="text-ink-subtle">{formatDate(entry.createdAt)}</span>
              {entry.actorName ? <span className="text-ink-subtle">by {entry.actorName}</span> : null}
              {entry.note ? <span className="text-ink-muted">— {entry.note}</span> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Private notes</h2>
        <p className="text-sm text-ink-muted">
          Visible to your hiring team only — candidates never see these.
        </p>
        <div className="mt-3">
          <NoteForm applicationId={candidate.applicationId} />
        </div>
      </section>
    </div>
  );
}

async function orgIdForJob(jobId: string, db: ReturnType<typeof getDb>): Promise<string> {
  const [row] = await db
    .select({ organizationId: jobs.organizationId })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  return row?.organizationId ?? '';
}
