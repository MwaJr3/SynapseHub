'use server';

/**
 * Organization + job actions. All of them re-check membership server-side;
 * the UI merely reflects what the server already decided.
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { getDb, type Db } from '@/lib/db';
import {
  applications,
  jobQuestions,
  jobs,
  jobSkills,
  notifications,
  organizationMemberships,
  organizations,
  savedJobs,
  skills,
  users,
} from '@/lib/db/schema';
import { requireUser } from '@/lib/auth';
import {
  AuthorizationError,
  listAssignableMembers,
  requireJobAccess,
  requireOrgAdmin,
  requireOrgMember,
} from '@/lib/authorization';
import { audit } from '@/lib/audit';
import { canTransitionJob, slugify } from '@/lib/job-lifecycle';
import {
  candidateNoteSchema,
  jobSchema,
  jobUpdateSchema,
  organizationSchema,
  zodFieldErrors,
  type ActionResult,
} from '@/lib/validation';

async function ensureUniqueSlug(
  db: Db,
  organizationId: string,
  base: string,
  excludeJobId?: string,
): Promise<string> {
  let candidate = base;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const [row] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          eq(jobs.organizationId, organizationId),
          eq(jobs.slug, candidate),
          excludeJobId ? sql`${jobs.id} <> ${excludeJobId}` : sql`TRUE`,
        ),
      )
      .limit(1);
    if (!row) return candidate;
    candidate = `${base}-${attempt + 2}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Resolve skill names to rows, creating missing ones. */
async function resolveSkillIds(db: Db, names: string[]): Promise<string[]> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const ids: string[] = [];
  for (const name of unique) {
    const [existing] = await db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.name, name))
      .limit(1);
    if (existing) {
      ids.push(existing.id);
    } else {
      const [created] = await db
        .insert(skills)
        .values({ name })
        .onConflictDoNothing()
        .returning({ id: skills.id });
      if (created) {
        ids.push(created.id);
      } else {
        const [row] = await db
          .select({ id: skills.id })
          .from(skills)
          .where(eq(skills.name, name))
          .limit(1);
        if (row) ids.push(row.id);
      }
    }
  }
  return ids;
}

export async function createOrganizationAction(
  input: unknown,
): Promise<ActionResult & { organizationId?: string; slug?: string }> {
  const actor = await requireUser();
  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const db = getDb();
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, parsed.data.slug))
    .limit(1);
  if (existing) {
    return {
      ok: false,
      fieldErrors: { slug: ['This company URL is taken'] },
    };
  }

  const [org] = await db
    .insert(organizations)
    .values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      industry: parsed.data.industry,
      website: parsed.data.website,
      headquarters: parsed.data.headquarters,
      remotePolicy: parsed.data.remotePolicy,
      companySize: parsed.data.companySize,
      socialLinks: parsed.data.socialLinks,
      benefits: parsed.data.benefits,
      createdById: actor.id,
    })
    .returning({ id: organizations.id, slug: organizations.slug });

  await db.insert(organizationMemberships).values({
    organizationId: org!.id,
    userId: actor.id,
    role: 'OWNER',
  });

  await audit({
    actorId: actor.id,
    action: 'organization.create',
    resourceType: 'organization',
    resourceId: org!.id,
    metadata: { name: parsed.data.name },
  });

  return { ok: true, organizationId: org!.id, slug: org!.slug };
}

export async function updateOrganizationAction(
  organizationId: string,
  input: unknown,
): Promise<ActionResult> {
  const actor = await requireUser();
  await requireOrgAdmin(actor, organizationId);
  const parsed = organizationSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const db = getDb();
  const { slug: slugValue, ...rest } = parsed.data;
  const values: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  if (slugValue !== undefined) values.slug = slugValue;
  await db
    .update(organizations)
    .set(values)
    .where(eq(organizations.id, organizationId));
  await audit({
    actorId: actor.id,
    action: 'organization.update',
    resourceType: 'organization',
    resourceId: organizationId,
  });
  return { ok: true };
}

export async function inviteMemberAction(
  organizationId: string,
  email: string,
  role: 'ADMIN' | 'RECRUITER',
): Promise<ActionResult> {
  const actor = await requireUser();
  await requireOrgAdmin(actor, organizationId);
  const db = getDb();
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, String(email).toLowerCase().trim()))
    .limit(1);
  if (!user) {
    return {
      ok: false,
      error: 'No account uses that email. Invitations require an existing account.',
    };
  }
  const [existing] = await db
    .select({ id: organizationMemberships.id })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, user.id),
      ),
    )
    .limit(1);
  if (existing) {
    return { ok: false, error: 'That person is already a member.' };
  }
  await db.insert(organizationMemberships).values({
    organizationId,
    userId: user.id,
    role,
  });
  await audit({
    actorId: actor.id,
    action: 'organization.member_add',
    resourceType: 'organization',
    resourceId: organizationId,
    metadata: { userId: user.id, role },
  });
  return { ok: true };
}

interface JobPayload {
  title: string;
  slug: string;
  department: string;
  categoryId: string | null;
  employmentType: string;
  experienceLevel: string;
  workplaceType: string;
  location: string;
  country: string;
  region: string;
  city: string;
  remoteRegions: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  benefits: string[];
  description: string;
  responsibilities: string;
  requiredQualifications: string;
  preferredQualifications: string;
  applicationMethod: string;
  externalApplicationUrl: string;
  applicationDeadline: Date | null;
  skills: string[];
  questions: Array<{ question: string; required: boolean }>;
}

async function writeJobRelations(
  db: Db,
  jobId: string,
  skillNames: string[],
  questionList: Array<{ question: string; required: boolean }>,
): Promise<void> {
  const skillIds = await resolveSkillIds(db, skillNames);
  await db.delete(jobSkills).where(eq(jobSkills.jobId, jobId));
  for (const skillId of skillIds) {
    await db
      .insert(jobSkills)
      .values({ jobId, skillId })
      .onConflictDoNothing();
  }
  await db.delete(jobQuestions).where(eq(jobQuestions.jobId, jobId));
  for (const [index, question] of questionList.entries()) {
    await db.insert(jobQuestions).values({
      jobId,
      question: question.question,
      required: question.required,
      position: index,
    });
  }
}

export async function createJobAction(
  organizationId: string,
  input: unknown,
): Promise<ActionResult & { jobId?: string; slug?: string }> {
  const actor = await requireUser();
  await requireOrgMember(actor, organizationId);
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const data = parsed.data;
  const db = getDb();
  const slug = await ensureUniqueSlug(
    db,
    organizationId,
    data.slug || slugify(data.title),
  );

  const [job] = await db
    .insert(jobs)
    .values({
      organizationId,
      title: data.title,
      slug,
      department: data.department,
      categoryId: data.categoryId,
      employmentType: data.employmentType as never,
      experienceLevel: data.experienceLevel as never,
      workplaceType: data.workplaceType as never,
      location: data.location,
      country: data.country,
      region: data.region,
      city: data.city,
      remoteRegions: data.remoteRegions,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      salaryCurrency: data.salaryCurrency,
      salaryPeriod: data.salaryPeriod as never,
      benefits: data.benefits,
      description: data.description,
      responsibilities: data.responsibilities,
      requiredQualifications: data.requiredQualifications,
      preferredQualifications: data.preferredQualifications,
      applicationMethod: data.applicationMethod,
      externalApplicationUrl: data.externalApplicationUrl,
      applicationDeadline: data.applicationDeadline,
    })
    .returning({ id: jobs.id, slug: jobs.slug });

  await writeJobRelations(db, job!.id, data.skills, data.questions);

  await audit({
    actorId: actor.id,
    action: 'job.create',
    resourceType: 'job',
    resourceId: job!.id,
    metadata: { title: data.title },
  });
  return { ok: true, jobId: job!.id, slug: job!.slug };
}

export async function updateJobAction(
  jobId: string,
  input: unknown,
): Promise<ActionResult> {
  const actor = await requireUser();
  const { job } = await requireJobAccess(actor, jobId);
  const parsed = jobUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const data = parsed.data;
  const db = getDb();

  const values: Record<string, unknown> = { updatedAt: new Date() };
  const scalarKeys = [
    'title', 'department', 'categoryId', 'location', 'country', 'region', 'city',
    'remoteRegions', 'salaryMin', 'salaryMax', 'salaryCurrency', 'benefits',
    'description', 'responsibilities', 'requiredQualifications',
    'preferredQualifications', 'applicationMethod', 'externalApplicationUrl',
    'applicationDeadline',
  ] as const;
  for (const key of scalarKeys) {
    if (data[key] !== undefined) values[key] = data[key];
  }
  if (data.employmentType !== undefined) values.employmentType = data.employmentType;
  if (data.experienceLevel !== undefined) values.experienceLevel = data.experienceLevel;
  if (data.workplaceType !== undefined) values.workplaceType = data.workplaceType;
  if (data.salaryPeriod !== undefined) values.salaryPeriod = data.salaryPeriod;
  if (data.slug !== undefined && data.slug !== '') {
    values.slug = await ensureUniqueSlug(db, job.organizationId, data.slug, jobId);
  }

  await db.update(jobs).set(values).where(eq(jobs.id, jobId));

  if (data.skills !== undefined || data.questions !== undefined) {
    const currentSkills = data.skills ?? [];
    const currentQuestions = data.questions ?? [];
    await writeJobRelations(db, jobId, currentSkills, currentQuestions);
  }

  await audit({
    actorId: actor.id,
    action: 'job.update',
    resourceType: 'job',
    resourceId: jobId,
  });
  return { ok: true };
}

export async function setJobStatusAction(
  jobId: string,
  nextStatus: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'ARCHIVED',
): Promise<ActionResult> {
  const actor = await requireUser();
  const { job } = await requireJobAccess(actor, jobId);
  if (!canTransitionJob(job.status, nextStatus)) {
    return {
      ok: false,
      error: `A ${job.status.toLowerCase()} job cannot become ${nextStatus.toLowerCase()}.`,
    };
  }
  const db = getDb();
  const values: Record<string, unknown> = {
    status: nextStatus,
    updatedAt: new Date(),
  };
  if (nextStatus === 'PUBLISHED' && !job.publishedAt) {
    values.publishedAt = new Date();
  }
  if (nextStatus === 'CLOSED') values.closedAt = new Date();

  await db.update(jobs).set(values).where(eq(jobs.id, jobId));

  // Tell applicants when a job they applied to closes.
  if (nextStatus === 'CLOSED') {
    const applicants = await db
      .select({ applicantId: applications.applicantId })
      .from(applications)
      .where(eq(applications.jobId, jobId));
    for (const { applicantId } of applicants) {
      await db
        .insert(notifications)
        .values({
          userId: applicantId,
          type: 'JOB_CLOSED',
          title: `The role “${job.title}” has closed`,
          body: 'The hiring team closed this role. Your application history is unchanged.',
          link: `/jobs/${job.slug}`,
          dedupeKey: `job-closed:${jobId}:${applicantId}`,
        })
        .onConflictDoNothing();
    }
  }

  await audit({
    actorId: actor.id,
    action: 'job.status',
    resourceType: 'job',
    resourceId: jobId,
    metadata: { from: job.status, to: nextStatus },
  });
  return { ok: true };
}

export async function saveJobAction(jobId: string): Promise<ActionResult> {
  const actor = await requireUser();
  const db = getDb();
  await db
    .insert(savedJobs)
    .values({ userId: actor.id, jobId })
    .onConflictDoNothing();
  return { ok: true };
}

export async function unsaveJobAction(jobId: string): Promise<ActionResult> {
  const actor = await requireUser();
  const db = getDb();
  await db
    .delete(savedJobs)
    .where(and(eq(savedJobs.userId, actor.id), eq(savedJobs.jobId, jobId)));
  return { ok: true };
}
