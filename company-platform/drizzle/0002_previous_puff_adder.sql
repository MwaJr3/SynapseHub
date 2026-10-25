CREATE TYPE "public"."support_request_status" AS ENUM('OPEN', 'ACKED', 'CLOSED');--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"company_id" text NOT NULL,
	"assistant" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"transcript" json DEFAULT '[]'::json NOT NULL,
	"status" "support_request_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "support_requests_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;