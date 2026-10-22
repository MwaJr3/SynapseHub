/**
 * Read-model queries shared by dashboards. Contact-level candidate data is
 * only included when the viewer passes the visibility rule — hidden fields
 * are never selected into the result at all.
 */
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { getDb, rowsOf, type Db } from '@/lib/db';
import {
  applicationAnswers,
  applications,
  applicationStatusHistory,
  jobs,
  organizationMemberships,
  organizations,
  profiles,
  resumes,
  users,
} from '@/lib/db/schema';
import {
  requireApplicationAccess,
  visibilityRule,
  type Actor,
  type ProfileVisibility,
} from '@/lib/authorization';

export interface CandidateRow {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string | null;
  status: string;
  coverLetter: string;
  submittedAt: Date;
  updatedAt: Date;
  resumeId: string | null;
  resumeFilename: string | null;
  tags: string[];
  assignedToId: string | null;
  organizationVerification: string;
}

export async function listOrgApplications(
  organizationId: string,
  filter: { jobId?: string; status?: string } = {},
  db: Db = getDb(),
): Promise<CandidateRow[]> {
  const conditions = [eq(jobs.organizationId, organizationId)];
  if (filter.jobId) conditions.push(eq(applications.jobId, filter.jobId));
  if (filter.status) {
    conditions.push(
      sql`${applications.status} = ${filter.status}::application_status`,
    );
  }
  const rows = await db
    .select({
      applicationId: applications.id,
      jobId: applications.jobId,
      jobTitle: jobs.title,
      applicantId: applications.applicantId,
      applicantName: users.name,
      applicantEmail: users.email,
      status: applications.status,
      coverLetter: applications.coverLetter,
      submittedAt: applications.submittedAt,
      updatedAt: applications.updatedAt,
      resumeId: applications.resumeId,
      resumeFilename: resumes.filename,
      tags: applications.tags,
      assignedToId: applications.assignedToId,
      organizationVerification: organizations.verificationStatus,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .innerJoin(users, eq(users.id, applications.applicantId))
    .leftJoin(resumes, eq(resumes.id, applications.resumeId))
    .innerJoin(organizations, eq(organizations.id, jobs.organizationId))
    .where(and(...conditions))
    .orderBy(desc(applications.updatedAt));
  return rows.map((row) => ({
    ...row,
    tags: row.tags ?? [],
  }));
}

export interface CandidateDetail extends CandidateRow {
  answers: Array<{ question: string; answer: string }>;
  history: Array<{ status: string; note: string; createdAt: Date; actorName: string | null }>;
  profile: {
    headline: string;
    location: string;
    yearsExperience: number;
    skills: string[];
    visibility: ProfileVisibility;
  } | null;
}

/**
 * One candidate's file. Asserts the viewer belongs to the hiring team;
 * contact fields appear only when the profile's visibility rule allows it.
 */
export async function getCandidateDetail(
  viewer: Actor,
  applicationId: string,
  db: Db = getDb(),
): Promise<CandidateDetail | null> {
  const [base] = await db
    .select({
      applicationId: applications.id,
      jobId: applications.jobId,
      jobTitle: jobs.title,
      applicantId: applications.applicantId,
      applicantName: users.name,
      applicantEmail: users.email,
      status: applications.status,
      coverLetter: applications.coverLetter,
      submittedAt: applications.submittedAt,
      updatedAt: applications.updatedAt,
      resumeId: applications.resumeId,
      resumeFilename: resumes.filename,
      tags: applications.tags,
      assignedToId: applications.assignedToId,
      organizationVerification: organizations.verificationStatus,
      organizationId: jobs.organizationId,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .innerJoin(users, eq(users.id, applications.applicantId))
    .leftJoin(resumes, eq(resumes.id, applications.resumeId))
    .innerJoin(organizations, eq(organizations.id, jobs.organizationId))
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!base) return null;

  // Internal access check (admins included) before any candidate data leaves.
  await requireApplicationAccess(viewer, base.jobId, db);

  const [profileRow] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, base.applicantId))
    .limit(1);

  const showContact =
    profileRow != null &&
    visibilityRule(viewer, base.applicantId, profileRow.visibility);

  const answers = await db
    .select()
    .from(applicationAnswers)
    .where(eq(applicationAnswers.applicationId, applicationId));

  const historyRows = await db
    .select({
      status: applicationStatusHistory.status,
      note: applicationStatusHistory.note,
      createdAt: applicationStatusHistory.createdAt,
      actorName: users.name,
    })
    .from(applicationStatusHistory)
    .leftJoin(users, eq(users.id, applicationStatusHistory.actorId))
    .where(eq(applicationStatusHistory.applicationId, applicationId))
    .orderBy(asc(applicationStatusHistory.createdAt));

  return {
    applicationId: base.applicationId,
    jobId: base.jobId,
    jobTitle: base.jobTitle,
    applicantId: base.applicantId,
    applicantName: base.applicantName,
    applicantEmail: showContact ? base.applicantEmail : null,
    status: base.status,
    coverLetter: base.coverLetter,
    submittedAt: base.submittedAt,
    updatedAt: base.updatedAt,
    resumeId: base.resumeId,
    resumeFilename: base.resumeFilename,
    tags: base.tags ?? [],
    assignedToId: base.assignedToId,
    organizationVerification: base.organizationVerification,
    answers: answers.map((a) => ({ question: a.question, answer: a.answer })),
    history: historyRows.map((row) => ({
      status: row.status,
      note: row.note ?? '',
      createdAt: row.createdAt,
      actorName: row.actorName,
    })),
    profile: profileRow
      ? {
          headline: profileRow.headline ?? '',
          location: profileRow.location ?? '',
          yearsExperience: profileRow.yearsExperience ?? 0,
          skills: (profileRow.skills as string[]) ?? [],
          visibility: profileRow.visibility,
        }
      : null,
  };
}

export interface SeekerApplicationRow {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  organizationName: string;
  organizationVerification: string;
  status: string;
  submittedAt: Date;
  updatedAt: Date;
  resumeFilename: string | null;
}

export async function listSeekerApplications(
  applicantId: string,
  db: Db = getDb(),
): Promise<SeekerApplicationRow[]> {
  const rows = await db
    .select({
      applicationId: applications.id,
      jobId: applications.jobId,
      jobTitle: jobs.title,
      organizationName: organizations.name,
      organizationVerification: organizations.verificationStatus,
      status: applications.status,
      submittedAt: applications.submittedAt,
      updatedAt: applications.updatedAt,
      resumeFilename: resumes.filename,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .innerJoin(organizations, eq(organizations.id, jobs.organizationId))
    .leftJoin(resumes, eq(resumes.id, applications.resumeId))
    .where(eq(applications.applicantId, applicantId))
    .orderBy(desc(applications.updatedAt));
  return rows;
}

export interface SeekerApplicationDetail extends SeekerApplicationRow {
  coverLetter: string;
  answers: Array<{ question: string; answer: string }>;
  history: Array<{ status: string; createdAt: Date }>;
  resumeId: string | null;
  /** Candidate notes are hiring-team private and are never selected here. */
}

export async function getSeekerApplication(
  applicantId: string,
  applicationId: string,
  db: Db = getDb(),
): Promise<SeekerApplicationDetail | null> {
  const [base] = await db
    .select({
      applicationId: applications.id,
      jobId: applications.jobId,
      applicantId: applications.applicantId,
      jobTitle: jobs.title,
      organizationName: organizations.name,
      organizationVerification: organizations.verificationStatus,
      status: applications.status,
      submittedAt: applications.submittedAt,
      updatedAt: applications.updatedAt,
      resumeFilename: resumes.filename,
      resumeId: applications.resumeId,
      coverLetter: applications.coverLetter,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .innerJoin(organizations, eq(organizations.id, jobs.organizationId))
    .leftJoin(resumes, eq(resumes.id, applications.resumeId))
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!base || base.applicantId !== applicantId) return null;

  const answers = await db
    .select()
    .from(applicationAnswers)
    .where(eq(applicationAnswers.applicationId, applicationId));

  const historyRows = await db
    .select({
      status: applicationStatusHistory.status,
      createdAt: applicationStatusHistory.createdAt,
    })
    .from(applicationStatusHistory)
    .where(eq(applicationStatusHistory.applicationId, applicationId))
    .orderBy(asc(applicationStatusHistory.createdAt));

  return {
    applicationId: base.applicationId,
    jobId: base.jobId,
    jobTitle: base.jobTitle,
    organizationName: base.organizationName,
    organizationVerification: base.organizationVerification,
    status: base.status,
    submittedAt: base.submittedAt,
    updatedAt: base.updatedAt,
    resumeFilename: base.resumeFilename,
    resumeId: base.resumeId,
    coverLetter: base.coverLetter,
    answers: answers.map((a) => ({ question: a.question, answer: a.answer })),
    history: historyRows.map((row) => ({
      status: row.status,
      createdAt: row.createdAt,
    })),
  };
}

export interface EmployerJobRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: Date | null;
  applicationCount: number;
  newCount: number;
}

/** Jobs of one organization with live application counts. */
export async function listEmployerJobs(
  organizationId: string,
  status?: string,
  db: Db = getDb(),
): Promise<EmployerJobRow[]> {
  const statusCondition = status
    ? sql` AND j.status = ${status}::job_status`
    : sql``;
  const result: unknown = await db.execute(sql`
    SELECT j.id, j.title, j.slug, j.status::text AS status, j.published_at,
      (SELECT count(*)::int FROM applications a WHERE a.job_id = j.id) AS application_count,
      (SELECT count(*)::int FROM applications a WHERE a.job_id = j.id AND a.status = 'SUBMITTED') AS new_count
    FROM jobs j
    WHERE j.organization_id = ${organizationId}${statusCondition}
    ORDER BY j.created_at DESC
  `);
  return rowsOf(result).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    status: String(row.status),
    publishedAt: (row.published_at as Date | null) ?? null,
    applicationCount: Number(row.application_count ?? 0),
    newCount: Number(row.new_count ?? 0),
  }));
}

/** Resumes a candidate owns that are not soft-deleted. */
export async function listResumes(
  userId: string,
  db: Db = getDb(),
): Promise<Array<{ id: string; filename: string; sizeBytes: number; isDefault: boolean; createdAt: Date }>> {
  const rows = await db
    .select({
      id: resumes.id,
      filename: resumes.filename,
      sizeBytes: resumes.sizeBytes,
      isDefault: resumes.isDefault,
      createdAt: resumes.createdAt,
    })
    .from(resumes)
    .where(and(eq(resumes.userId, userId), isNull(resumes.deletedAt)))
    .orderBy(desc(resumes.createdAt));
  return rows;
}

/** Organizations where the user holds a membership. */
export async function listUserMemberships(
  userId: string,
  db: Db = getDb(),
): Promise<
  Array<{
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    verificationStatus: string;
    role: string;
  }>
> {
  const rows = await db
    .select({
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      verificationStatus: organizations.verificationStatus,
      role: organizationMemberships.role,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(eq(organizationMemberships.userId, userId));
  return rows;
}
