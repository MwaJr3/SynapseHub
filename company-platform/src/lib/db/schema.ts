/**
 * Platform data model — the CMS layer for two independent companies.
 *
 * Everything the public site renders comes from these records: companies,
 * solutions, products, case studies, people and their publication state.
 * Company boundaries are enforced by `company_id` columns and checked in the
 * authorization layer; drafts are excluded at query time, never in CSS.
 */
import { relations } from 'drizzle-orm';
import {
  boolean,
  customType,
  integer,
  json,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Every table in this application lives in its own PostgreSQL schema.
 *
 * The database this deploys against is shared with the other products' APIs, and
 * each of those owns a schema of its own (`assetwatch`, `cyberaware`, …). Naming
 * the schema here rather than relying on `search_path` means the qualification is
 * in the generated SQL: a connection pooler that resets session state, or a
 * `public` schema that grows an unrelated `users` table, cannot change which table
 * a query touches.
 */
export const platformSchema = pgSchema('platform');

const id = () =>
  text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  timestamp('created_at', { mode: 'date' }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { mode: 'date' }).notNull().defaultNow();

export const platformRoleEnum = platformSchema.enum('platform_role', [
  'MEMBER',
  'EDITOR',
  'ADMIN',
  'PLATFORM_OPERATOR',
]);
export const membershipRoleEnum = platformSchema.enum('membership_role', [
  'MEMBER',
  'EDITOR',
  'ADMIN',
]);
export const productStatusEnum = platformSchema.enum('product_status', [
  'PROTOTYPE',
  'BUILT',
  'CASE_STUDY_ONLY',
  'PILOT',
  'LIVE',
  'MAINTENANCE',
  'ARCHIVED',
]);
export const publicationStateEnum = platformSchema.enum('publication_state', [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'UNPUBLISHED',
  'REJECTED',
]);
export const contactDeliveryEnum = platformSchema.enum('contact_delivery', [
  'RECEIVED',
  'DELIVERY_NOT_CONFIGURED',
  'DELIVERED',
  'FAILED',
]);

export const users = platformSchema.table('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  role: platformRoleEnum('role').notNull().default('MEMBER'),
  disabledAt: timestamp('disabled_at', { mode: 'date' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const companies = platformSchema.table('companies', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  workingNameNotice: text('working_name_notice').notNull().default(''),
  tagline: text('tagline').notNull().default(''),
  overview: text('overview').notNull().default(''),
  focusAreas: json('focus_areas').$type<string[]>().notNull().default([]),
  aboutStory: text('about_story').notNull().default(''),
  values: json('values').$type<string[]>().notNull().default([]),
  approach: json('approach').$type<string[]>().notNull().default([]),
  // Legal details stay empty until supplied — never invented.
  legalName: text('legal_name').notNull().default(''),
  registrationNote: text('registration_note').notNull().default(''),
  contactEmail: text('contact_email').notNull().default(''),
  contactNote: text('contact_note').notNull().default(''),
  accentToken: text('accent_token').notNull().default('vela'),
  featuredProductSlugs: json('featured_product_slugs')
    .$type<string[]>()
    .notNull()
    .default([]),
  featuredCaseStudySlugs: json('featured_case_study_slugs')
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Explicit membership: a person's company association is never inferred. */
export const companyMemberships = platformSchema.table(
  'company_memberships',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    role: membershipRoleEnum('role').notNull().default('MEMBER'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('company_memberships_unique').on(table.userId, table.companyId),
  ],
);

export const solutionAreas = platformSchema.table('solution_areas', {
  id: id(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  companyId: text('company_id')
    .notNull()
    .references(() => companies.id),
  problem: text('problem').notNull(),
  approach: text('approach').notNull(),
  audiences: json('audiences').$type<string[]>().notNull().default([]),
  publicationState: publicationStateEnum('publication_state')
    .notNull()
    .default('DRAFT'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const products = platformSchema.table('products', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  companyId: text('company_id')
    .notNull()
    .references(() => companies.id),
  category: text('category').notNull(),
  categories: json('categories').$type<string[]>().notNull().default([]),
  purpose: text('purpose').notNull(),
  summary: text('summary').notNull(),
  status: productStatusEnum('status').notNull().default('BUILT'),
  statusNote: text('status_note').notNull().default(''),
  technologies: json('technologies').$type<string[]>().notNull().default([]),
  features: json('features')
    .$type<Array<{ title: string; description: string }>>()
    .notNull()
    .default([]),
  keywords: json('keywords').$type<string[]>().notNull().default([]),
  visualLabel: text('visual_label').notNull().default(''),
  // Optional external configuration — hidden when absent, never invented.
  liveDemoUrl: text('live_demo_url').notNull().default(''),
  repositoryUrl: text('repository_url').notNull().default(''),
  verificationNote: text('verification_note').notNull().default(''),
  featured: boolean('featured').notNull().default(false),
  publicationState: publicationStateEnum('publication_state')
    .notNull()
    .default('DRAFT'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Case studies reuse one structured model but every field is written for its
 * product — no shared filler paragraphs. Sections the brief cannot support
 * are explicitly marked as requiring verification before publication.
 */
export const caseStudies = platformSchema.table('case_studies', {
  id: id(),
  slug: text('slug').notNull().unique(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  problem: text('problem').notNull(),
  users: json('users').$type<string[]>().notNull().default([]),
  constraints: json('constraints').$type<string[]>().notNull().default([]),
  solution: text('solution').notNull(),
  workflow: json('workflow')
    .$type<Array<{ step: string; description: string }>>()
    .notNull()
    .default([]),
  architecture: text('architecture').notNull(),
  dataModel: text('data_model').notNull().default(''),
  engineeringDecisions: json('engineering_decisions')
    .$type<Array<{ decision: string; rationale: string }>>()
    .notNull()
    .default([]),
  testingNote: text('testing_note').notNull(),
  securityPrivacy: text('security_privacy').notNull().default(''),
  walkthroughNote: text('walkthrough_note').notNull().default(''),
  verificationNote: text('verification_note').notNull().default(''),
  limitations: json('limitations').$type<string[]>().notNull().default([]),
  futureImprovements: json('future_improvements')
    .$type<string[]>()
    .notNull()
    .default([]),
  publicationState: publicationStateEnum('publication_state')
    .notNull()
    .default('DRAFT'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const personProfiles = platformSchema.table('person_profiles', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  displayName: text('display_name').notNull(),
  pronouns: text('pronouns').notNull().default(''),
  headline: text('headline').notNull().default(''),
  shortBio: text('short_bio').notNull().default(''),
  longBio: text('long_bio').notNull().default(''),
  technicalSkills: json('technical_skills')
    .$type<string[]>()
    .notNull()
    .default([]),
  softSkills: json('soft_skills').$type<string[]>().notNull().default([]),
  domains: json('domains').$type<string[]>().notNull().default([]),
  // Member-supplied links only. Empty means the button is hidden.
  personalPortfolioUrl: text('personal_portfolio_url').notNull().default(''),
  githubUrl: text('github_url').notNull().default(''),
  professionalProfileUrl: text('professional_profile_url')
    .notNull()
    .default(''),
  contactVisible: boolean('contact_visible').notNull().default(false),
  publicationState: publicationStateEnum('publication_state')
    .notNull()
    .default('DRAFT'),
  reviewerNote: text('reviewer_note').notNull().default(''),
  lastSubmittedAt: timestamp('last_submitted_at', { mode: 'date' }),
  publishedAt: timestamp('published_at', { mode: 'date' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const educationEntries = platformSchema.table('education_entries', {
  id: id(),
  personProfileId: text('person_profile_id')
    .notNull()
    .references(() => personProfiles.id, { onDelete: 'cascade' }),
  institution: text('institution').notNull(),
  qualification: text('qualification').notNull(),
  subject: text('subject').notNull().default(''),
  period: text('period').notNull().default(''),
  description: text('description').notNull().default(''),
  position: integer('position').notNull().default(0),
});

export const experienceEntries = platformSchema.table('experience_entries', {
  id: id(),
  personProfileId: text('person_profile_id')
    .notNull()
    .references(() => personProfiles.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  organization: text('organization').notNull(),
  period: text('period').notNull().default(''),
  description: text('description').notNull().default(''),
  linkUrl: text('link_url').notNull().default(''),
  position: integer('position').notNull().default(0),
});

export const certifications = platformSchema.table('certifications', {
  id: id(),
  personProfileId: text('person_profile_id')
    .notNull()
    .references(() => personProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  issuer: text('issuer').notNull().default(''),
  period: text('period').notNull().default(''),
  note: text('note').notNull().default(''),
  position: integer('position').notNull().default(0),
});

export const portfolioLinks = platformSchema.table('portfolio_links', {
  id: id(),
  personProfileId: text('person_profile_id')
    .notNull()
    .references(() => personProfiles.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  url: text('url').notNull(),
  position: integer('position').notNull().default(0),
});

export const resumeAssets = platformSchema.table('resume_assets', {
  id: id(),
  personProfileId: text('person_profile_id')
    .notNull()
    .references(() => personProfiles.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  storageKey: text('storage_key').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  // Private until the member explicitly publishes it.
  published: boolean('published').notNull().default(false),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
  createdAt: createdAt(),
});

/** A person's documented work on a product/case study — never inferred. */
export const projectContributions = platformSchema.table('project_contributions', {
  id: id(),
  personProfileId: text('person_profile_id')
    .notNull()
    .references(() => personProfiles.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.id, {
    onDelete: 'cascade',
  }),
  description: text('description').notNull(),
  approved: boolean('approved').notNull().default(false),
  position: integer('position').notNull().default(0),
});

export const publicationReviews = platformSchema.table('publication_reviews', {
  id: id(),
  personProfileId: text('person_profile_id')
    .notNull()
    .references(() => personProfiles.id, { onDelete: 'cascade' }),
  reviewerId: text('reviewer_id').references(() => users.id),
  decision: text('decision').notNull(),
  note: text('note').notNull().default(''),
  createdAt: createdAt(),
});

export const contactSubmissions = platformSchema.table('contact_submissions', {
  id: id(),
  companyId: text('company_id')
    .notNull()
    .references(() => companies.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  delivery: contactDeliveryEnum('delivery').notNull().default('RECEIVED'),
  createdAt: createdAt(),
});

/**
 * Support requests raised from an assistant conversation.
 *
 * This is the human handoff: a visitor's transcript plus their contact details,
 * stored so a person can pick it up. It is deliberately separate from
 * `contact_submissions` — that is the general enquiry form and goes through
 * Brevo, whereas this records a conversation that already happened on the site.
 */
export const supportRequestStatusEnum = platformSchema.enum('support_request_status', [
  'OPEN',
  'ACKED',
  'CLOSED',
]);
export const supportRequests = platformSchema.table('support_requests', {
  id: id(),
  /** Short code a visitor can quote: VLQ-4F8K2A. */
  reference: text('reference').notNull().unique(),
  companyId: text('company_id')
    .notNull()
    .references(() => companies.id),
  assistant: text('assistant').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  transcript: json('transcript')
    .$type<{ role: string; text: string }[]>()
    .notNull()
    .default([]),
  status: supportRequestStatusEnum('status').notNull().default('OPEN'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const auditEvents = platformSchema.table('audit_events', {
  id: id(),
  actorId: text('actor_id').references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  metadata: json('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
});

/**
 * File bytes, for the storage provider that keeps uploads in the database.
 *
 * Resumes are small (a PDF, capped well below a megabyte in practice) and read
 * rarely, so the database that already backs the rest of the record is a
 * reasonable place to keep them: it is durable, it is backed up with everything
 * else, it needs no second vendor, and the permission check in
 * `GET /api/files/[id]` is the only way to read one. An object store is the
 * right answer at a different scale — `STORAGE_PROVIDER=s3` stays available.
 *
 * The key is the opaque name the application already stores on the resume row,
 * so which provider wrote a file is a deployment setting, not a schema change.
 */
const bytea = customType<{ data: Uint8Array; notNull: true; default: false }>({
  dataType: () => 'bytea',
});

export const storageBlobs = platformSchema.table('storage_blobs', {
  key: text('key').primaryKey().notNull(),
  bytes: bytea('bytes').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  contentType: text('content_type').notNull().default('application/octet-stream'),
  createdAt: createdAt(),
});

export const usersRelations = relations(users, ({ one }) => ({
  profile: one(personProfiles),
}));

export const personProfilesRelations = relations(personProfiles, ({ one }) => ({
  user: one(users, { fields: [personProfiles.userId], references: [users.id] }),
}));
