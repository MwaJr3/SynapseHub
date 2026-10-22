import { notFound } from 'next/navigation';
import type { JSX } from 'react';
import { eq } from 'drizzle-orm';

import { requireUser } from '@/lib/auth';
import { requireJobAccess } from '@/lib/authorization';
import { getDb } from '@/lib/db';
import { jobQuestions, jobSkills, jobs, skills } from '@/lib/db/schema';
import { JobForm } from '@/components/job-form';
import { BackLink } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  const actor = await requireUser();
  await requireJobAccess(actor, id);
  const db = getDb();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) notFound();

  const skillRows = await db
    .select({ name: skills.name })
    .from(jobSkills)
    .innerJoin(skills, eq(skills.id, jobSkills.skillId))
    .where(eq(jobSkills.jobId, id));
  const questionRows = await db
    .select()
    .from(jobQuestions)
    .where(eq(jobQuestions.jobId, id));

  return (
    <div className="space-y-4">
      <BackLink href={`/employer/jobs/${id}`}>Back to job</BackLink>
      <h1 className="text-2xl font-bold">Edit {job.title}</h1>
      <JobForm
        organizationId={job.organizationId}
        jobId={job.id}
        initial={{
          title: job.title,
          department: job.department ?? '',
          employmentType: job.employmentType,
          experienceLevel: job.experienceLevel,
          workplaceType: job.workplaceType,
          location: job.location ?? '',
          description: job.description,
          responsibilities: job.responsibilities ?? '',
          requiredQualifications: job.requiredQualifications ?? '',
          preferredQualifications: job.preferredQualifications ?? '',
          salaryMin: job.salaryMin != null ? String(job.salaryMin) : '',
          salaryMax: job.salaryMax != null ? String(job.salaryMax) : '',
          salaryCurrency: job.salaryCurrency,
          salaryPeriod: job.salaryPeriod,
          applicationMethod: job.applicationMethod,
          externalApplicationUrl: job.externalApplicationUrl ?? '',
          applicationDeadline: job.applicationDeadline
            ? job.applicationDeadline.toISOString().slice(0, 10)
            : '',
          skills: skillRows.map((row) => row.name).join(', '),
          questions: questionRows.map((row) => row.question).join('\n'),
        }}
      />
    </div>
  );
}
