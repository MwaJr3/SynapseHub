'use server';

/**
 * Applications: apply once per job, withdraw your own, move candidates
 * through the pipeline with an append-only history, and keep hiring notes
 * that applicants can never read.
 */
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import {
  applicationAnswers,
  applicationStatusHistory,
  applications,
  candidateNotes,
  jobs,
  notifications,
  profiles,
  resumes,
  users,
} from '@/lib/db/schema';
import { requireUser } from '@/lib/auth';
import {
  requireApplicationAccess,
  requireJobAccess,
  listAssignableMembers,
} from '@/lib/authorization';
import { audit } from '@/lib/audit';
import {
  applicationSchema,
  applicationStatusSchema,
  candidateNoteSchema,
  zodFieldErrors,
  type ActionResult,
} from '@/lib/validation';

export async function applyToJobAction(input: unknown): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const db = getDb();
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, parsed.data.jobId))
    .limit(1);
  if (!job || job.status !== 'PUBLISHED') {
    return { ok: false, error: 'This role is not accepting applications.' };
  }
  if (job.applicationMethod === 'EXTERNAL') {
    return {
      ok: false,
      error: 'This employer directs applicants to their own careers page.',
    };
  }

  // The UNIQUE(job, applicant) index is the real guarantee; this surfaces a
  // friendly error before the insert.
  const [existing] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.jobId, job.id),
        eq(applications.applicantId, actor.id),
      ),
    )
    .limit(1);
  if (existing) {
    return { ok: false, error: 'You have already applied to this role.' };
  }

  if (parsed.data.resumeId) {
    const [resume] = await db
      .select({ id: resumes.id, deletedAt: resumes.deletedAt })
      .from(resumes)
      .where(eq(resumes.id, parsed.data.resumeId))
      .limit(1);
    if (!resume || resume.deletedAt != null) {
      return { ok: false, fieldErrors: { resumeId: ['Resume not found'] } };
    }
  }

  const [application] = await db
    .insert(applications)
    .values({
      jobId: job.id,
      applicantId: actor.id,
      coverLetter: parsed.data.coverLetter,
      resumeId: parsed.data.resumeId,
    })
    .returning({ id: applications.id });

  for (const answer of parsed.data.answers) {
    await db.insert(applicationAnswers).values({
      applicationId: application!.id,
      question: answer.question,
      answer: answer.answer,
    });
  }
  await db.insert(applicationStatusHistory).values({
    applicationId: application!.id,
    status: 'SUBMITTED',
    actorId: actor.id,
    note: 'Application submitted',
  });

  await audit({
    actorId: actor.id,
    action: 'application.submit',
    resourceType: 'application',
    resourceId: application!.id,
    metadata: { jobId: job.id },
  });
  return { ok: true };
}

export async function withdrawApplicationAction(
  applicationId: string,
): Promise<ActionResult> {
  const actor = await requireUser();
  const db = getDb();
  const [row] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row || row.applicantId !== actor.id) {
    return { ok: false, error: 'Application not found.' };
  }
  if (row.status === 'WITHDRAWN') return { ok: true };
  if (row.status === 'HIRED') {
    return { ok: false, error: 'A hired application cannot be withdrawn here.' };
  }

  await db
    .update(applications)
    .set({ status: 'WITHDRAWN', updatedAt: new Date() })
    .where(eq(applications.id, applicationId));
  await db.insert(applicationStatusHistory).values({
    applicationId,
    status: 'WITHDRAWN',
    actorId: actor.id,
    note: 'Withdrawn by the candidate',
  });
  await audit({
    actorId: actor.id,
    action: 'application.withdraw',
    resourceType: 'application',
    resourceId: applicationId,
  });
  return { ok: true };
}

/** Hiring team moves a candidate through the pipeline. History is append-only. */
export async function updateApplicationStatusAction(
  input: unknown,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = applicationStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const db = getDb();
  const [row] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, parsed.data.applicationId))
    .limit(1);
  if (!row) return { ok: false, error: 'Application not found.' };
  await requireApplicationAccess(actor, row.jobId, db);

  await db
    .update(applications)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(applications.id, row.id));
  await db.insert(applicationStatusHistory).values({
    applicationId: row.id,
    status: parsed.data.status,
    actorId: actor.id,
    note: parsed.data.note,
  });

  const [job] = await db
    .select({ title: jobs.title, slug: jobs.slug })
    .from(jobs)
    .where(eq(jobs.id, row.jobId))
    .limit(1);
  const statusLabel: Record<string, string> = {
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under review',
    SHORTLISTED: 'shortlisted',
    INTERVIEW: 'interviewing',
    OFFER: 'offered',
    REJECTED: 'not moving forward',
    WITHDRAWN: 'withdrawn',
    HIRED: 'hired',
  };
  await db
    .insert(notifications)
    .values({
      userId: row.applicantId,
      type: 'APPLICATION_STATUS',
      title: `Update on “${job?.title ?? 'your application'}”`,
      body: `Your application is now ${statusLabel[parsed.data.status] ?? parsed.data.status}.`,
      link: `/dashboard/applications/${row.id}`,
      dedupeKey: `application-status:${row.id}:${parsed.data.status}`,
    })
    .onConflictDoNothing();

  await audit({
    actorId: actor.id,
    action: 'application.status',
    resourceType: 'application',
    resourceId: row.id,
    metadata: { from: row.status, to: parsed.data.status },
  });
  return { ok: true };
}

/** Hiring-team-private note. Never exposed through any applicant query. */
export async function addCandidateNoteAction(input: unknown): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = candidateNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const db = getDb();
  const [row] = await db
    .select({ jobId: applications.jobId })
    .from(applications)
    .where(eq(applications.id, parsed.data.applicationId))
    .limit(1);
  if (!row) return { ok: false, error: 'Application not found.' };
  await requireApplicationAccess(actor, row.jobId, db);

  await db.insert(candidateNotes).values({
    applicationId: parsed.data.applicationId,
    authorId: actor.id,
    body: parsed.data.body,
  });
  return { ok: true };
}

export async function assignCandidateAction(
  applicationId: string,
  assigneeId: string | null,
): Promise<ActionResult> {
  const actor = await requireUser();
  const db = getDb();
  const [row] = await db
    .select({ jobId: applications.jobId })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row) return { ok: false, error: 'Application not found.' };
  const { job } = await requireJobAccess(actor, row.jobId, db);

  if (assigneeId) {
    const members = await listAssignableMembers(job.organizationId, db);
    if (!members.some((member) => member.userId === assigneeId)) {
      return { ok: false, error: 'That person is not on this hiring team.' };
    }
  }
  await db
    .update(applications)
    .set({ assignedToId: assigneeId, updatedAt: new Date() })
    .where(eq(applications.id, applicationId));
  return { ok: true };
}
