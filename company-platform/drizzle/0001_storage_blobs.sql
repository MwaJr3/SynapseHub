CREATE TABLE "platform"."storage_blobs" (
	"key" text PRIMARY KEY NOT NULL,
	"bytes" bytea NOT NULL,
	"size_bytes" integer NOT NULL,
	"content_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
