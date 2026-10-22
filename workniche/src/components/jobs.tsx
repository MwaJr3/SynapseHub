/** Job presentation: cards and metadata lines. Server-rendered. */
import Link from 'next/link';
import type { JSX } from 'react';

import type { JobCardData } from '@/lib/search';
import {
  EMPLOYMENT_LABELS,
  EXPERIENCE_LABELS,
  WORKPLACE_LABELS,
  formatSalary,
  formatDate,
} from '@/lib/format';
import { Badge, VerificationBadge } from '@/components/ui';

export function JobCard({ job }: { job: JobCardData }): JSX.Element {
  return (
    <article className="card flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            <Link href={`/jobs/${job.slug}`} className="hover:text-brand-700">
              {job.title}
            </Link>
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <Link href={`/companies/${job.organizationSlug}`} className="font-medium text-ink hover:text-brand-700">
              {job.organizationName}
            </Link>
            <VerificationBadge status={job.organizationVerification} />
          </div>
        </div>
        {job.category ? <Badge tone="info">{job.category}</Badge> : null}
      </div>

      <p className="text-sm text-ink-muted">{job.descriptionExcerpt}</p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        <Badge>{EMPLOYMENT_LABELS[job.employmentType] ?? job.employmentType}</Badge>
        <Badge>{WORKPLACE_LABELS[job.workplaceType] ?? job.workplaceType}</Badge>
        <Badge>{EXPERIENCE_LABELS[job.experienceLevel] ?? job.experienceLevel}</Badge>
        {job.location ? <Badge>{job.location}</Badge> : null}
        <Badge tone="neutral">
          {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryPeriod)}
        </Badge>
      </div>

      {job.skills.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Skills">
          {job.skills.slice(0, 6).map((skill) => (
            <li key={skill} className="rounded bg-surface-sunken px-2 py-0.5 text-xs text-ink-muted">
              {skill}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-ink-subtle">
        {job.publishedAt ? `Posted ${formatDate(job.publishedAt)}` : 'Unpublished listing'}
        {job.applicationDeadline
          ? ` · Applications close ${formatDate(job.applicationDeadline)}`
          : ''}
      </p>
    </article>
  );
}
