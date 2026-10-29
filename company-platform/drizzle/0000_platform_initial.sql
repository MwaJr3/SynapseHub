CREATE SCHEMA "platform";
--> statement-breakpoint
CREATE TYPE "platform"."contact_delivery" AS ENUM('RECEIVED', 'DELIVERY_NOT_CONFIGURED', 'DELIVERED', 'FAILED');--> statement-breakpoint
CREATE TYPE "platform"."membership_role" AS ENUM('MEMBER', 'EDITOR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "platform"."platform_role" AS ENUM('MEMBER', 'EDITOR', 'ADMIN', 'PLATFORM_OPERATOR');--> statement-breakpoint
CREATE TYPE "platform"."product_status" AS ENUM('PROTOTYPE', 'BUILT', 'CASE_STUDY_ONLY', 'PILOT', 'LIVE', 'MAINTENANCE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "platform"."publication_state" AS ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "platform"."support_request_status" AS ENUM('OPEN', 'ACKED', 'CLOSED');--> statement-breakpoint
CREATE TABLE "platform"."audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."case_studies" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"product_id" text NOT NULL,
	"title" text NOT NULL,
	"problem" text NOT NULL,
	"users" json DEFAULT '[]'::json NOT NULL,
	"constraints" json DEFAULT '[]'::json NOT NULL,
	"solution" text NOT NULL,
	"workflow" json DEFAULT '[]'::json NOT NULL,
	"architecture" text NOT NULL,
	"data_model" text DEFAULT '' NOT NULL,
	"engineering_decisions" json DEFAULT '[]'::json NOT NULL,
	"testing_note" text NOT NULL,
	"security_privacy" text DEFAULT '' NOT NULL,
	"walkthrough_note" text DEFAULT '' NOT NULL,
	"verification_note" text DEFAULT '' NOT NULL,
	"limitations" json DEFAULT '[]'::json NOT NULL,
	"future_improvements" json DEFAULT '[]'::json NOT NULL,
	"publication_state" "platform"."publication_state" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "case_studies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platform"."certifications" (
	"id" text PRIMARY KEY NOT NULL,
	"person_profile_id" text NOT NULL,
	"name" text NOT NULL,
	"issuer" text DEFAULT '' NOT NULL,
	"period" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."companies" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"working_name_notice" text DEFAULT '' NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"overview" text DEFAULT '' NOT NULL,
	"focus_areas" json DEFAULT '[]'::json NOT NULL,
	"about_story" text DEFAULT '' NOT NULL,
	"values" json DEFAULT '[]'::json NOT NULL,
	"approach" json DEFAULT '[]'::json NOT NULL,
	"legal_name" text DEFAULT '' NOT NULL,
	"registration_note" text DEFAULT '' NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"contact_note" text DEFAULT '' NOT NULL,
	"accent_token" text DEFAULT 'vela' NOT NULL,
	"featured_product_slugs" json DEFAULT '[]'::json NOT NULL,
	"featured_case_study_slugs" json DEFAULT '[]'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platform"."company_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company_id" text NOT NULL,
	"role" "platform"."membership_role" DEFAULT 'MEMBER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."contact_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"delivery" "platform"."contact_delivery" DEFAULT 'RECEIVED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."education_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"person_profile_id" text NOT NULL,
	"institution" text NOT NULL,
	"qualification" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"period" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."experience_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"person_profile_id" text NOT NULL,
	"role" text NOT NULL,
	"organization" text NOT NULL,
	"period" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"link_url" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."person_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"pronouns" text DEFAULT '' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"short_bio" text DEFAULT '' NOT NULL,
	"long_bio" text DEFAULT '' NOT NULL,
	"technical_skills" json DEFAULT '[]'::json NOT NULL,
	"soft_skills" json DEFAULT '[]'::json NOT NULL,
	"domains" json DEFAULT '[]'::json NOT NULL,
	"personal_portfolio_url" text DEFAULT '' NOT NULL,
	"github_url" text DEFAULT '' NOT NULL,
	"professional_profile_url" text DEFAULT '' NOT NULL,
	"contact_visible" boolean DEFAULT false NOT NULL,
	"publication_state" "platform"."publication_state" DEFAULT 'DRAFT' NOT NULL,
	"reviewer_note" text DEFAULT '' NOT NULL,
	"last_submitted_at" timestamp,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "person_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "person_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platform"."portfolio_links" (
	"id" text PRIMARY KEY NOT NULL,
	"person_profile_id" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."products" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"company_id" text NOT NULL,
	"category" text NOT NULL,
	"categories" json DEFAULT '[]'::json NOT NULL,
	"purpose" text NOT NULL,
	"summary" text NOT NULL,
	"status" "platform"."product_status" DEFAULT 'BUILT' NOT NULL,
	"status_note" text DEFAULT '' NOT NULL,
	"technologies" json DEFAULT '[]'::json NOT NULL,
	"features" json DEFAULT '[]'::json NOT NULL,
	"keywords" json DEFAULT '[]'::json NOT NULL,
	"visual_label" text DEFAULT '' NOT NULL,
	"live_demo_url" text DEFAULT '' NOT NULL,
	"repository_url" text DEFAULT '' NOT NULL,
	"verification_note" text DEFAULT '' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"publication_state" "platform"."publication_state" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platform"."project_contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"person_profile_id" text NOT NULL,
	"product_id" text,
	"description" text NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."publication_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"person_profile_id" text NOT NULL,
	"reviewer_id" text,
	"decision" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."resume_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"person_profile_id" text NOT NULL,
	"filename" text NOT NULL,
	"storage_key" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."solution_areas" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"company_id" text NOT NULL,
	"problem" text NOT NULL,
	"approach" text NOT NULL,
	"audiences" json DEFAULT '[]'::json NOT NULL,
	"publication_state" "platform"."publication_state" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "solution_areas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platform"."support_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"company_id" text NOT NULL,
	"assistant" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"transcript" json DEFAULT '[]'::json NOT NULL,
	"status" "platform"."support_request_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "support_requests_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "platform"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"role" "platform"."platform_role" DEFAULT 'MEMBER' NOT NULL,
	"disabled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "platform"."audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "platform"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."case_studies" ADD CONSTRAINT "case_studies_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "platform"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."certifications" ADD CONSTRAINT "certifications_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "platform"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."company_memberships" ADD CONSTRAINT "company_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "platform"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."company_memberships" ADD CONSTRAINT "company_memberships_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "platform"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."contact_submissions" ADD CONSTRAINT "contact_submissions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "platform"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."education_entries" ADD CONSTRAINT "education_entries_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "platform"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."experience_entries" ADD CONSTRAINT "experience_entries_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "platform"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."person_profiles" ADD CONSTRAINT "person_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "platform"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."portfolio_links" ADD CONSTRAINT "portfolio_links_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "platform"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "platform"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."project_contributions" ADD CONSTRAINT "project_contributions_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "platform"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."project_contributions" ADD CONSTRAINT "project_contributions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "platform"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."publication_reviews" ADD CONSTRAINT "publication_reviews_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "platform"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."publication_reviews" ADD CONSTRAINT "publication_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "platform"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."resume_assets" ADD CONSTRAINT "resume_assets_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "platform"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."solution_areas" ADD CONSTRAINT "solution_areas_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "platform"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."support_requests" ADD CONSTRAINT "support_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "platform"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_memberships_unique" ON "platform"."company_memberships" USING btree ("user_id","company_id");