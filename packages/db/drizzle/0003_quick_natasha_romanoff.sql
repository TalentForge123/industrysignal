CREATE TABLE IF NOT EXISTS "insolvency_event" (
	"id" text PRIMARY KEY NOT NULL,
	"country_iso" text DEFAULT 'CZ' NOT NULL,
	"source_key" text NOT NULL,
	"debtor_ico" text,
	"debtor_rc" text,
	"debtor_name" text,
	"debtor_address" jsonb,
	"case_court" text,
	"case_senate" integer NOT NULL,
	"case_kind" text NOT NULL,
	"case_number" integer NOT NULL,
	"case_year" integer NOT NULL,
	"case_status" text,
	"case_detail_url" text,
	"other_debtors_in_case" boolean DEFAULT false NOT NULL,
	"bankruptcy_started_at" date,
	"bankruptcy_ended_at" date,
	"raw" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"upstream_synced_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "insolvency_event_case_unique" ON "insolvency_event" USING btree ("country_iso","case_kind","case_senate","case_number","case_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "insolvency_event_debtor_ico_idx" ON "insolvency_event" USING btree ("country_iso","debtor_ico");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "insolvency_event_status_idx" ON "insolvency_event" USING btree ("case_status");