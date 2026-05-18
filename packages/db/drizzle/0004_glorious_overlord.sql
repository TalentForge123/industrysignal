CREATE TABLE IF NOT EXISTS "company_filing" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"country_iso" text DEFAULT 'CZ' NOT NULL,
	"source_key" text NOT NULL,
	"upstream_doc_id" text NOT NULL,
	"document_type" text DEFAULT 'other' NOT NULL,
	"document_type_label" text NOT NULL,
	"fiscal_year" integer,
	"filed_at" date,
	"document_url" text NOT NULL,
	"raw" jsonb,
	"content_hash" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_officer" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"country_iso" text DEFAULT 'CZ' NOT NULL,
	"source_key" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"role_label" text NOT NULL,
	"appointed_at" date,
	"terminated_at" date,
	"raw" jsonb,
	"content_hash" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_filing" ADD CONSTRAINT "company_filing_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_officer" ADD CONSTRAINT "company_officer_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_filing_upstream_unique" ON "company_filing" USING btree ("country_iso","source_key","upstream_doc_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_filing_company_fiscal_idx" ON "company_filing" USING btree ("company_id","fiscal_year");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_officer_natural_unique" ON "company_officer" USING btree ("company_id","role","name","appointed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_officer_company_idx" ON "company_officer" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_officer_name_idx" ON "company_officer" USING btree ("name");