/**
 * Every server boundary validates with Zod first. Schemas are the single
 * source of truth for field limits; actions parse, they never trust.
 */
import { z } from 'zod';

export const ROLES = ['JOB_SEEKER', 'EMPLOYER', 'RECRUITER', 'ADMIN'] as const;
export const MEMBERSHIP_ROLES = ['OWNER', 'ADMIN', 'RECRUITER'] as const;
export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
] as const;
export const EXPERIENCE_LEVELS = [
  'INTERN',
  'JUNIOR',
  'MID',
  'SENIOR',
  'LEAD',
  'EXECUTIVE',
] as const;
export const WORKPLACE_TYPES = ['REMOTE', 'HYBRID', 'ONSITE'] as const;
export const SALARY_PERIODS = ['YEAR', 'MONTH', 'WEEK', 'DAY', 'HOUR'] as const;
export const JOB_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'PAUSED',
  'CLOSED',
  'ARCHIVED',
] as const;
export const APPLICATION_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
  'HIRED',
] as const;
export const REPORT_REASONS = [
  'FRAUD',
  'MISLEADING',
  'DISCRIMINATION',
  'SPAM',
  'OTHER',
] as const;

/** Uniform shape returned by every server action. */
export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const password = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(200, 'Too long');

const email = z.string().email('Enter a valid email').max(200);

const url = z
  .string()
  .max(500)
  .refine(
    (value) => value === '' || /^https?:\/\/[^\s]+$/i.test(value),
    'Must be a full http(s) URL',
  );

const slugPart = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only');

const salary = z
  .number()
  .int('Whole numbers only')
  .min(0)
  .max(100_000_000)
  .nullable();

const stringList = (max: number, itemMax = 80) =>
  z
    .array(z.string().trim().min(1).max(itemMax))
    .max(max, `At most ${max} items`);

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name').max(120),
  email,
  password,
  role: z.enum(['JOB_SEEKER', 'EMPLOYER']),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(200),
});

export const profileSchema = z.object({
  headline: z.string().trim().max(160).default(''),
  bio: z.string().trim().max(4000).default(''),
  location: z.string().trim().max(160).default(''),
  remotePreference: z
    .enum(['REMOTE_ONLY', 'HYBRID_OK', 'ONSITE_OK', 'ANY'])
    .default('ANY'),
  yearsExperience: z.number().int().min(0).max(80).default(0),
  skills: stringList(30).default([]),
  technologies: stringList(30).default([]),
  education: z
    .array(
      z.object({
        institution: z.string().trim().min(1).max(160),
        credential: z.string().trim().min(1).max(160),
        year: z.string().trim().max(20).optional(),
      }),
    )
    .max(10)
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(160),
        issuer: z.string().trim().min(1).max(160),
        year: z.string().trim().max(20).optional(),
      }),
    )
    .max(15)
    .default([]),
  portfolioUrl: url.default(''),
  githubUrl: url.default(''),
  linkedinUrl: url.default(''),
  websiteUrl: url.default(''),
  availability: z.string().trim().max(200).default(''),
  preferredEmploymentTypes: z
    .array(z.enum(EMPLOYMENT_TYPES))
    .max(4)
    .default([]),
  salaryExpectationMin: salary.default(null),
  salaryExpectationMax: salary.default(null),
  salaryCurrency: z.string().trim().max(8).default('USD'),
  visibility: z
    .enum(['PUBLIC', 'VERIFIED_EMPLOYERS', 'PRIVATE'])
    .default('VERIFIED_EMPLOYERS'),
  showEmail: z.boolean().default(false),
});

export const organizationSchema = z.object({
  name: z.string().trim().min(2, 'Company name is required').max(160),
  slug: slugPart,
  description: z.string().trim().max(4000).default(''),
  industry: z.string().trim().max(120).default(''),
  website: url.default(''),
  headquarters: z.string().trim().max(160).default(''),
  remotePolicy: z.string().trim().max(300).default(''),
  companySize: z.string().trim().max(60).default(''),
  socialLinks: z.record(z.string().trim().max(60), url).default({}),
  benefits: stringList(20).default([]),
});

export const questionSchema = z.object({
  question: z.string().trim().min(3, 'Write the question').max(300),
  required: z.boolean().default(true),
});

const jobObjectSchema = z.object({
  title: z.string().trim().min(3, 'Job title is required').max(160),
  // Empty means "derive from the title" (see createJobFor).
  slug: z.union([z.literal(''), slugPart]).default(''),
  department: z.string().trim().max(120).default(''),
  categoryId: z.string().trim().min(1).nullable(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  workplaceType: z.enum(WORKPLACE_TYPES),
  location: z.string().trim().max(160).default(''),
  country: z.string().trim().max(100).default(''),
  region: z.string().trim().max(100).default(''),
  city: z.string().trim().max(100).default(''),
  remoteRegions: stringList(10).default([]),
  salaryMin: salary.default(null),
  salaryMax: salary.default(null),
  salaryCurrency: z.string().trim().max(8).default('USD'),
  salaryPeriod: z.enum(SALARY_PERIODS).default('YEAR'),
  benefits: stringList(20).default([]),
  description: z.string().trim().min(40, 'Describe the role').max(20000),
  responsibilities: z.string().trim().max(10000).default(''),
  requiredQualifications: z.string().trim().max(10000).default(''),
  preferredQualifications: z.string().trim().max(10000).default(''),
  applicationMethod: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'),
  externalApplicationUrl: url.default(''),
  applicationDeadline: z.coerce.date().nullable().default(null),
  skills: stringList(20).default([]),
  questions: z.array(questionSchema).max(10).default([]),
});

type JobInvariantsInput = Partial<z.infer<typeof jobObjectSchema>>;

/** Invariants every job payload must satisfy, create or update. */
function jobInvariants(job: JobInvariantsInput, ctx: z.RefinementCtx): void {
  if (
    job.salaryMin != null &&
    job.salaryMax != null &&
    job.salaryMin > job.salaryMax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimum salary cannot exceed maximum',
      path: ['salaryMin'],
    });
  }
  if (
    job.applicationMethod === 'EXTERNAL' &&
    (job.externalApplicationUrl ?? '').length === 0
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'External applications need a destination URL',
      path: ['externalApplicationUrl'],
    });
  }
}

/** Create: every required field present. */
export const jobSchema = jobObjectSchema.superRefine(jobInvariants);

/** Update: any subset, still checked against the same invariants. */
export const jobUpdateSchema = jobObjectSchema
  .partial()
  .superRefine(jobInvariants);

export type JobInput = z.infer<typeof jobObjectSchema>;

export const applicationSchema = z.object({
  jobId: z.string().min(1),
  resumeId: z.string().min(1).nullable().default(null),
  coverLetter: z.string().trim().max(8000).default(''),
  answers: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(300),
        answer: z.string().trim().min(1, 'Answer the question').max(4000),
      }),
    )
    .max(10)
    .default([]),
});

export const applicationStatusSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(APPLICATION_STATUSES),
  note: z.string().trim().max(1000).default(''),
});

export const candidateNoteSchema = z.object({
  applicationId: z.string().min(1),
  body: z.string().trim().min(1, 'Write the note').max(4000),
});

export const jobAlertSchema = z.object({
  keywords: z.string().trim().max(200).default(''),
  categories: stringList(10).default([]),
  skills: stringList(15).default([]),
  location: z.string().trim().max(160).default(''),
  remoteOnly: z.boolean().default(false),
  salaryMin: salary.default(null),
  employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)).max(4).default([]),
  enabled: z.boolean().default(true),
});

export const reportSchema = z
  .object({
    reason: z.enum(REPORT_REASONS),
    details: z.string().trim().max(4000).default(''),
    jobId: z.string().min(1).nullable().default(null),
    organizationId: z.string().min(1).nullable().default(null),
  })
  .refine((report) => report.jobId != null || report.organizationId != null, {
    message: 'Select what you are reporting',
    path: ['jobId'],
  });

export const moderationSchema = z.object({
  reportId: z.string().min(1),
  action: z.enum([
    'RESOLVE',
    'DISMISS',
    'SUSPEND_ORG',
    'UNSUSPEND_ORG',
    'REMOVE_JOB',
  ]),
  note: z.string().trim().max(2000).default(''),
});

/* ------------------------------------------------------------------ */
/* Job discovery query                                                 */
/* ------------------------------------------------------------------ */

export const jobQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  category: z.string().trim().max(120).default(''),
  employmentType: z.string().trim().max(40).default(''),
  workplaceType: z.string().trim().max(40).default(''),
  experienceLevel: z.string().trim().max(40).default(''),
  location: z.string().trim().max(160).default(''),
  skill: z.string().trim().max(120).default(''),
  salaryMin: z.coerce.number().int().min(0).nullable().default(null),
  postedWithinDays: z.coerce.number().int().min(1).max(365).nullable().default(null),
  sort: z.enum(['relevance', 'recent', 'salary', 'deadline']).default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(10),
});
export type JobQuery = z.infer<typeof jobQuerySchema>;

/** Field-level errors for UI forms, keyed the way React Hook Form expects. */
export function zodFieldErrors(
  error: z.ZodError,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
