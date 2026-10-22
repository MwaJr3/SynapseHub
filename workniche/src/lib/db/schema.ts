/**
 * WorkNiche database schema. PostgreSQL via Drizzle — the same SQL runs on
 * an embedded PGlite file locally and on a real PostgreSQL server in
 * production (see src/lib/db/index.ts for the driver choice).
 *
 * Invariants encoded here rather than trusted to application code alone:
 * one application per candidate per job, one notification per dedupe key,
 * one membership per user per organization.
 */
import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const id = () =>
  text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  timestamp('created_at', { mode: 'date' }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { mode: 'date' }).notNull().defaultNow();

export const roleEnum = pgEnum('role', [
  'JOB_SEEKER',
  'EMPLOYER',
  'RECRUITER',
  'ADMIN',
]);
export const membershipRoleEnum = pgEnum('membership_role', [
  'OWNER',
  'ADMIN',
  'RECRUITER',
]);
export const verificationEnum = pgEnum('verification_status', [
  'UNVERIFIED',
  'UNDER_REVIEW',
  'VERIFIED',
  'SUSPENDED',
]);
export const jobStatusEnum = pgEnum('job_status', [
  'DRAFT',
  'PUBLISHED',
  'PAUSED',
  'CLOSED',
  'ARCHIVED',
]);
export const employmentEnum = pgEnum('employment_type', [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
]);
export const experienceEnum = pgEnum('experience_level', [
  'INTERN',
  'JUNIOR',
  'MID',
  'SENIOR',
  'LEAD',
  'EXECUTIVE',
]);
export const workplaceEnum = pgEnum('workplace_type', [
  'REMOTE',
  'HYBRID',
  'ONSITE',
]);
export const salaryPeriodEnum = pgEnum('salary_period', [
  'YEAR',
  'MONTH',
  'WEEK',
  'DAY',
  'HOUR',
]);
export const applicationStatusEnum = pgEnum('application_status', [
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
  'HIRED',
]);
export const reportReasonEnum = pgEnum('report_reason', [
  'FRAUD',
  'MISLEADING',
  'DISCRIMINATION',
  'SPAM',
  'OTHER',
]);
export const reportStatusEnum = pgEnum('report_status', [
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED',
  'DISMISSED',
]);
export const visibilityEnum = pgEnum('profile_visibility', [
  'PUBLIC',
  'VERIFIED_EMPLOYERS',
  'PRIVATE',
]);

export const users = pgTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  role: roleEnum('role').notNull().default('JOB_SEEKER'),
  emailVerifiedAt: timestamp('email_verified_at', { mode: 'date' }),
  suspendedAt: timestamp('suspended_at', { mode: 'date' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const profiles = pgTable('profiles', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  headline: text('headline').default(''),
  bio: text('bio').default(''),
  location: text('location').default(''),
  remotePreference: text('remote_preference').default('ANY'),
  yearsExperience: integer('years_experience').default(0),
  skills: json('skills').$type<string[]>().notNull().default([]),
  technologies: json('technologies').$type<string[]>().notNull().default([]),
  education: json('education')
    .$type<Array<{ institution: string; credential: string; year?: string }>>()
    .notNull()
    .default([]),
  certifications: json('certifications')
    .$type<Array<{ name: string; issuer: string; year?: string }>>()
    .notNull()
    .default([]),
  portfolioUrl: text('portfolio_url').default(''),
  githubUrl: text('github_url').default(''),
  linkedinUrl: text('linkedin_url').default(''),
  websiteUrl: text('website_url').default(''),
  availability: text('availability').default(''),
  preferredEmploymentTypes: json('preferred_employment_types')
    .$type<string[]>()
    .notNull()
    .default([]),
  salaryExpectationMin: integer('salary_expectation_min'),
  salaryExpectationMax: integer('salary_expectation_max'),
  salaryCurrency: text('salary_currency').default('USD'),
  visibility: visibilityEnum('visibility').notNull().default('VERIFIED_EMPLOYERS'),
  showEmail: boolean('show_email').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const organizations = pgTable('organizations', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').default(''),
  industry: text('industry').default(''),
  website: text('website').default(''),
  headquarters: text('headquarters').default(''),
  remotePolicy: text('remote_policy').default(''),
  companySize: text('company_size').default(''),
  socialLinks: json('social_links')
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  benefits: json('benefits').$type<string[]>().notNull().default([]),
  verificationStatus: verificationEnum('verification_status')
    .notNull()
    .default('UNVERIFIED'),
  logoStorageKey: text('logo_storage_key'),
  createdById: text('created_by_id').references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const organizationMemberships = pgTable(
  'organization_memberships',
  {
    id: id(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: membershipRoleEnum('role').notNull().default('RECRUITER'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('memberships_org_user_unique').on(
      table.organizationId,
      table.userId,
    ),
  ],
);

export const jobCategories = pgTable('job_categories', {
  id: id(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
});

export const jobs = pgTable(
  'jobs',
  {
    id: id(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    department: text('department').default(''),
    categoryId: text('category_id').references(() => jobCategories.id),
    employmentType: employmentEnum('employment_type').notNull(),
    experienceLevel: experienceEnum('experience_level').notNull(),
    workplaceType: workplaceEnum('workplace_type').notNull(),
    location: text('location').default(''),
    country: text('country').default(''),
    region: text('region').default(''),
    city: text('city').default(''),
    remoteRegions: json('remote_regions')
      .$type<string[]>()
      .notNull()
      .default([]),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    salaryCurrency: text('salary_currency').notNull().default('USD'),
    salaryPeriod: salaryPeriodEnum('salary_period').notNull().default('YEAR'),
    benefits: json('benefits').$type<string[]>().notNull().default([]),
    description: text('description').notNull(),
    responsibilities: text('responsibilities').notNull().default(''),
    requiredQualifications: text('required_qualifications').notNull().default(''),
    preferredQualifications: text('preferred_qualifications')
      .notNull()
      .default(''),
    applicationMethod: text('application_method').notNull().default('INTERNAL'),
    externalApplicationUrl: text('external_application_url').notNull().default(''),
    applicationDeadline: timestamp('application_deadline', { mode: 'date' }),
    status: jobStatusEnum('status').notNull().default('DRAFT'),
    publishedAt: timestamp('published_at', { mode: 'date' }),
    closedAt: timestamp('closed_at', { mode: 'date' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex('jobs_org_slug_unique').on(table.organizationId, table.slug)],
);

export const skills = pgTable('skills', {
  id: id(),
  name: text('name').notNull().unique(),
});

export const jobSkills = pgTable(
  'job_skills',
  {
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    skillId: text('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('job_skills_unique').on(table.jobId, table.skillId),
    index('job_skills_skill_idx').on(table.skillId),
  ],
);

export const jobQuestions = pgTable('job_questions', {
  id: id(),
  jobId: text('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  required: boolean('required').notNull().default(true),
  position: integer('position').notNull().default(0),
});

export const applications = pgTable(
  'applications',
  {
    id: id(),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    applicantId: text('applicant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: applicationStatusEnum('status').notNull().default('SUBMITTED'),
    coverLetter: text('cover_letter').notNull().default(''),
    resumeId: text('resume_id'),
    tags: json('tags').$type<string[]>().notNull().default([]),
    assignedToId: text('assigned_to_id').references(() => users.id),
    submittedAt: timestamp('submitted_at', { mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // One application per candidate per job — the product invariant.
    uniqueIndex('applications_job_applicant_unique').on(
      table.jobId,
      table.applicantId,
    ),
    index('applications_applicant_idx').on(table.applicantId),
  ],
);

export const applicationAnswers = pgTable('application_answers', {
  id: id(),
  applicationId: text('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
});

export const applicationStatusHistory = pgTable(
  'application_status_history',
  {
    id: id(),
    applicationId: text('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    status: applicationStatusEnum('status').notNull(),
    actorId: text('actor_id').references(() => users.id),
    note: text('note').default(''),
    createdAt: createdAt(),
  },
  (table) => [index('status_history_app_idx').on(table.applicationId)],
);

export const candidateNotes = pgTable('candidate_notes', {
  id: id(),
  applicationId: text('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  authorId: text('author_id').references(() => users.id),
  body: text('body').notNull(),
  createdAt: createdAt(),
});

export const resumes = pgTable('resumes', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  storageKey: text('storage_key').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
  createdAt: createdAt(),
});

export const savedJobs = pgTable(
  'saved_jobs',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('saved_jobs_user_job_unique').on(table.userId, table.jobId),
  ],
);

export const jobAlerts = pgTable('job_alerts', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  keywords: text('keywords').default(''),
  categories: json('categories').$type<string[]>().notNull().default([]),
  skills: json('skills').$type<string[]>().notNull().default([]),
  location: text('location').default(''),
  remoteOnly: boolean('remote_only').notNull().default(false),
  salaryMin: integer('salary_min'),
  employmentTypes: json('employment_types')
    .$type<string[]>()
    .notNull()
    .default([]),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: createdAt(),
});

export const reports = pgTable('reports', {
  id: id(),
  reporterId: text('reporter_id').references(() => users.id),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  organizationId: text('organization_id').references(() => organizations.id, {
    onDelete: 'set null',
  }),
  reason: reportReasonEnum('reason').notNull(),
  details: text('details').default(''),
  status: reportStatusEnum('status').notNull().default('OPEN'),
  resolutionNote: text('resolution_note'),
  resolvedAt: timestamp('resolved_at', { mode: 'date' }),
  createdAt: createdAt(),
});

export const moderationActions = pgTable('moderation_actions', {
  id: id(),
  adminId: text('admin_id').references(() => users.id),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  reason: text('reason').default(''),
  createdAt: createdAt(),
});

export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').default(''),
    link: text('link').default(''),
    dedupeKey: text('dedupe_key'),
    readAt: timestamp('read_at', { mode: 'date' }),
    createdAt: createdAt(),
  },
  (table) => [
    // At most one notification per dedupe key, ever.
    uniqueIndex('notifications_dedupe_unique').on(table.dedupeKey),
    index('notifications_user_idx').on(table.userId),
  ],
);

export const auditEvents = pgTable('audit_events', {
  id: id(),
  actorId: text('actor_id').references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  metadata: json('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
});

export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));
