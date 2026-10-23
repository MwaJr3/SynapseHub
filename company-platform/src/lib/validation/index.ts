/**
 * Zod schemas for every mutating boundary, plus the external-link rules the
 * whole platform shares: optional configuration, safe schemes, and never an
 * invented destination.
 */
import { z } from 'zod';

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

const SAFE_URL_MESSAGE =
  'Must be a full http(s) URL, or empty to hide the button.';

/** Optional external URL: empty is valid and means "not configured". */
export const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === '' || /^https?:\/\/[^\s]+$/i.test(value),
    SAFE_URL_MESSAGE,
  );

/** Reject unsafe schemes outright (javascript:, data:, …). */
export function isSafeExternalUrl(value: string): boolean {
  if (value === '') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isConfiguredUrl(value: string): boolean {
  return value !== '' && isSafeExternalUrl(value);
}

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email').max(200),
  password: z.string().min(1, 'Enter your password').max(200),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Name is required').max(120),
  pronouns: z.string().trim().max(60).default(''),
  headline: z.string().trim().max(200).default(''),
  shortBio: z.string().trim().max(600).default(''),
  longBio: z.string().trim().max(8000).default(''),
  technicalSkills: z
    .array(z.string().trim().min(1).max(80))
    .max(30)
    .default([]),
  softSkills: z.array(z.string().trim().min(1).max(80)).max(15).default([]),
  domains: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  personalPortfolioUrl: optionalUrl.default(''),
  githubUrl: optionalUrl.default(''),
  professionalProfileUrl: optionalUrl.default(''),
  contactVisible: z.boolean().default(false),
});

export const educationEntrySchema = z.object({
  institution: z.string().trim().min(2).max(200),
  qualification: z.string().trim().min(2).max(200),
  subject: z.string().trim().max(200).default(''),
  period: z.string().trim().max(100).default(''),
  description: z.string().trim().max(1000).default(''),
});

export const experienceEntrySchema = z.object({
  role: z.string().trim().min(2).max(200),
  organization: z.string().trim().min(2).max(200),
  period: z.string().trim().max(100).default(''),
  description: z.string().trim().max(2000).default(''),
  linkUrl: optionalUrl.default(''),
});

export const certificationSchema = z.object({
  name: z.string().trim().min(2).max(200),
  issuer: z.string().trim().max(200).default(''),
  period: z.string().trim().max(100).default(''),
  note: z.string().trim().max(500).default(''),
});

export const portfolioLinkSchema = z.object({
  label: z.string().trim().min(2).max(80),
  url: z
    .string()
    .trim()
    .min(1, 'A destination URL is required')
    .max(500)
    .refine((value) => isSafeExternalUrl(value), SAFE_URL_MESSAGE),
});

export const contactSchema = z
  .object({
    companySlug: z.enum(['velaqori-systems', 'tamuzi-learning'], {
      errorMap: () => ({ message: 'Choose which company to contact' }),
    }),
    name: z.string().trim().min(2, 'Tell us your name').max(120),
    email: z.string().email('Enter a valid email').max(200),
    subject: z.string().trim().min(2, 'Add a subject').max(200),
    message: z.string().trim().min(10, 'Write a little more').max(4000),
  });

export const reviewDecisionSchema = z.object({
  personProfileId: z.string().min(1),
  decision: z.enum(['APPROVE', 'REJECT', 'UNPUBLISH']),
  note: z.string().trim().max(1000).default(''),
});

export const contentPublicationSchema = z.object({
  entityType: z.enum(['PRODUCT', 'CASE_STUDY', 'SOLUTION']),
  entityId: z.string().min(1),
  publicationState: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED']),
});

export const PRODUCT_STATUSES = [
  'PROTOTYPE',
  'BUILT',
  'PILOT',
  'LIVE',
  'MAINTENANCE',
  'ARCHIVED',
] as const;

export const PRODUCT_CATEGORIES = [
  'Cybersecurity',
  'Software Engineering',
  'Education Technology',
  'AI and Intelligent Applications',
  'Engineering and Scientific Computing',
  'Data Analysis',
  'Learning and Accessibility',
] as const;

export const PRODUCT_SORTS = ['featured', 'alphabetical', 'category'] as const;
