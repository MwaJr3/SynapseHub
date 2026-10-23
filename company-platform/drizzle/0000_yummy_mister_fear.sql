CREATE TYPE "public"."contact_delivery" AS ENUM('RECEIVED', 'DELIVERY_NOT_CONFIGURED', 'DELIVERED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('MEMBER', 'EDITOR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('MEMBER', 'EDITOR', 'ADMIN', 'PLATFORM_OPERATOR');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('PROTOTYPE', 'BUILT', 'PILOT', 'LIVE', 'MAINTENANCE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."publication_state" AS ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_studies" (
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
	"publication_state" "publication_state" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "case_studies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" text PRIMARY KEY NOT NULL,
	"person_profile_id" text NOT NULL,
	"name" text NOT NULL,
	"issuer" text DEFAULT '' NOT NULL,
	"period" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
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
CREATE TABLE "company_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company_id" text NOT NULL,
	"role" "membership_role" DEFAULT 'MEMBER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"delivery" "contact_delivery" DEFAULT 'RECEIVED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education_entries" (
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
CREATE TABLE "experience_entries" (
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
CREATE TABLE "person_profiles" (
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
	"publication_state" "publication_state" DEFAULT 'DRAFT' NOT NULL,
	"reviewer_note" text DEFAULT '' NOT NULL,
	"last_submitted_at" timestamp,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "person_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "person_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "portfolio_links" (
	"id" text PRIMARY KEY NOT NULL,
	"person_profile_id" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"company_id" text NOT NULL,
	"category" text NOT NULL,
	"categories" json DEFAULT '[]'::json NOT NULL,
	"purpose" text NOT NULL,
	"summary" text NOT NULL,
	"status" "product_status" DEFAULT 'BUILT' NOT NULL,
	"status_note" text DEFAULT '' NOT NULL,
	"technologies" json DEFAULT '[]'::json NOT NULL,
	"features" json DEFAULT '[]'::json NOT NULL,
	"keywords" json DEFAULT '[]'::json NOT NULL,
	"visual_label" text DEFAULT '' NOT NULL,
	"live_demo_url" text DEFAULT '' NOT NULL,
	"repository_url" text DEFAULT '' NOT NULL,
	"verification_note" text DEFAULT '' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"publication_state" "publication_state" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project_contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"person_profile_id" text NOT NULL,
	"product_id" text,
	"description" text NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publication_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"person_profile_id" text NOT NULL,
	"reviewer_id" text,
	"decision" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_assets" (
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
CREATE TABLE "solution_areas" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"company_id" text NOT NULL,
	"problem" text NOT NULL,
	"approach" text NOT NULL,
	"audiences" json DEFAULT '[]'::json NOT NULL,
	"publication_state" "publication_state" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "solution_areas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"role" "platform_role" DEFAULT 'MEMBER' NOT NULL,
	"disabled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "public"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education_entries" ADD CONSTRAINT "education_entries_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "public"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_entries" ADD CONSTRAINT "experience_entries_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "public"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_profiles" ADD CONSTRAINT "person_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_links" ADD CONSTRAINT "portfolio_links_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "public"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contributions" ADD CONSTRAINT "project_contributions_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "public"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contributions" ADD CONSTRAINT "project_contributions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_reviews" ADD CONSTRAINT "publication_reviews_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "public"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_reviews" ADD CONSTRAINT "publication_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_assets" ADD CONSTRAINT "resume_assets_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "public"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_areas" ADD CONSTRAINT "solution_areas_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_memberships_unique" ON "company_memberships" USING btree ("user_id","company_id");