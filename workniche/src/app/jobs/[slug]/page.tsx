import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { JSX } from 'react';
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import {
  applications,
  jobQuestions,
  jobs,
  organizations,
  resumes,
  savedJobs,
} from '@/lib/db/schema';
import { getSessionActor } from '@/lib/auth';
import {
  EMPLOYMENT_LABELS,
  EXPERIENCE_LABELS,
  WORKPLACE_LABELS,
  formatDate,
  formatSalary,
  daysUntil,
} from '@/lib/format';
import { ApplyForm } from '@/components/apply-form';
import { ReportButton, SaveJobButton } from '@/components/job-actions';
import { Badge, BackLink, VerificationBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const db = getDb();
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.slug, slug))
    .limit(1);
  if (!job) notFound();

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, job.organizationId))
    .limit(1);

  const actor = await getSessionActor();
  const isPublished = job.status === 'PUBLISHED';
  // Unpublished jobs are invisible unless the viewer helps hire for the org.
  if (!isPublished) {
    if (!actor) notFound();
    const { getMembership } = await import('@/lib/authorization');
    const membership = actor.role === 'ADMIN' ? { role: 'ADMIN' as const } : await getMembership(actor.id, job.organizationId, db);
    if (!membership) notFound();
  }

  const questions = await db
    .select()
    .from(jobQuestions)
    .where(eq(jobQuestions.jobId, job.id));

  let applied = false;
  let saved = false;
  let defaultResumeId: string | null = null;
  if (actor) {
    const [existingApplication] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(eq(applications.jobId, job.id), eq(applications.applicantId, actor.id)),
      )
      .limit(1);
    applied = Boolean(existingApplication);
    const [savedRow] = await db
      .select({ id: savedJobs.id })
      .from(savedJobs)
      .where(and(eq(savedJobs.userId, actor.id), eq(savedJobs.jobId, job.id)))
      .limit(1);
    saved = Boolean(savedRow);
    const [defaultResume] = await db
      .select({ id: resumes.id })
      .from(resumes)
      .where(and(eq(resumes.userId, actor.id), eq(resumes.isDefault, true)))
      .limit(1);
    defaultResumeId = defaultResume?.id ?? null;
  }

  const deadlineDays = daysUntil(job.applicationDeadline);
  const canApply =
    isPublished &&
    actor?.role === 'JOB_SEEKER' &&
    !applied &&
    job.applicationMethod === 'INTERNAL';

  // JobPosting structured data for published jobs only.
  const jsonLd =
    isPublished && org
      ? {
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: job.title,
          description: job.description,
          datePosted: job.publishedAt?.toISOString(),
          employmentType: job.employmentType,
          hiringOrganization: {
            '@type': 'Organization',
            name: org.name,
          },
          jobLocationType: job.workplaceType === 'REMOTE' ? 'TELECOMMUTE' : undefined,
          baseSalary:
            job.salaryMin != null || job.salaryMax != null
              ? {
                  '@type': 'MonetaryAmount',
                  currency: job.salaryCurrency,
                  value: {
                    '@type': 'QuantitativeValue',
                    minValue: job.salaryMin ?? undefined,
                    maxValue: job.salaryMax ?? undefined,
                    unitText: job.salaryPeriod,
                  },
                }
              : undefined,
        }
      : null;

  return (
    <div className="space-y-6">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <BackLink href="/jobs">Back to jobs</BackLink>

      <header className="card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Link
                href={`/companies/${org?.slug ?? ''}`}
                className="font-medium text-ink hover:text-brand-700"
              >
                {org?.name ?? 'Unknown organization'}
              </Link>
              {org ? <VerificationBadge status={org.verificationStatus} /> : null}
              {job.status !== 'PUBLISHED' ? <Badge tone="warn">{job.status}</Badge> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {actor?.role === 'JOB_SEEKER' ? (
              <SaveJobButton jobId={job.id} saved={saved} />
            ) : null}
            <ReportButton jobId={job.id} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge>{EMPLOYMENT_LABELS[job.employmentType] ?? job.employmentType}</Badge>
          <Badge>{WORKPLACE_LABELS[job.workplaceType] ?? job.workplaceType}</Badge>
          <Badge>{EXPERIENCE_LABELS[job.experienceLevel] ?? job.experienceLevel}</Badge>
          {job.location ? <Badge>{job.location}</Badge> : null}
          <Badge>
            {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryPeriod)}
          </Badge>
        </div>

        <p className="text-sm text-ink-muted">
          {job.publishedAt ? `Posted ${formatDate(job.publishedAt)}` : 'Not published yet'}
          {job.applicationDeadline
            ? ` · Applications close ${formatDate(job.applicationDeadline)}${
                deadlineDays != null && deadlineDays >= 0 && deadlineDays <= 7
                  ? ` (in ${deadlineDays} day${deadlineDays === 1 ? '' : 's'})`
                  : ''
              }`
            : ''}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="text-lg font-semibold">About the role</h2>
            <p className="mt-3 whitespace-pre-wrap text-ink-muted">{job.description}</p>
          </section>
          {job.responsibilities ? (
            <section className="card">
              <h2 className="text-lg font-semibold">Responsibilities</h2>
              <p className="mt-3 whitespace-pre-wrap text-ink-muted">{job.responsibilities}</p>
            </section>
          ) : null}
          {job.requiredQualifications ? (
            <section className="card">
              <h2 className="text-lg font-semibold">Required qualifications</h2>
              <p className="mt-3 whitespace-pre-wrap text-ink-muted">
                {job.requiredQualifications}
              </p>
            </section>
          ) : null}
          {job.preferredQualifications ? (
            <section className="card">
              <h2 className="text-lg font-semibold">Preferred qualifications</h2>
              <p className="mt-3 whitespace-pre-wrap text-ink-muted">
                {job.preferredQualifications}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          {job.applicationMethod === 'EXTERNAL' ? (
            <div className="card">
              <h2 className="font-semibold">Apply on the company&apos;s site</h2>
              <p className="mt-2 text-sm text-ink-muted">
                This employer handles applications on their own careers page.
              </p>
              <a
                href={job.externalApplicationUrl}
                rel="noopener noreferrer"
                target="_blank"
                className="btn-primary mt-3"
              >
                Continue to the employer&apos;s careers page ↗
              </a>
            </div>
          ) : canApply ? (
            <ApplyForm
              jobId={job.id}
              questions={questions.map((question) => ({
                id: question.id,
                question: question.question,
                required: question.required,
              }))}
              defaultResumeId={defaultResumeId}
            />
          ) : actor?.role === 'JOB_SEEKER' && applied ? (
            <div className="card">
              <h2 className="font-semibold">You have applied</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Track the status from your dashboard.
              </p>
              <Link href="/dashboard/applications" className="btn-secondary mt-3">
                View my applications
              </Link>
            </div>
          ) : !actor ? (
            <div className="card">
              <h2 className="font-semibold">Interested in this role?</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Sign in as a candidate to apply, save the job and set alerts.
              </p>
              <Link href="/login" className="btn-primary mt-3">
                Sign in to apply
              </Link>
            </div>
          ) : null}

          <div className="card text-sm text-ink-muted">
            <h2 className="font-semibold text-ink">About {org?.name}</h2>
            <p className="mt-2">{org?.description || 'No company description provided.'}</p>
            {org?.headquarters ? <p className="mt-2">Headquarters: {org.headquarters}</p> : null}
            {org?.remotePolicy ? <p className="mt-1">Remote policy: {org.remotePolicy}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
