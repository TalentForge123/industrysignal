CREATE TABLE IF NOT EXISTS "company" (
	"id" text PRIMARY KEY NOT NULL,
	"country_iso" text DEFAULT 'CZ' NOT NULL,
	"registry_id" text NOT NULL,
	"source_key" text NOT NULL,
	"legal_name" text NOT NULL,
	"alt_names" text[] DEFAULT '{}'::text[] NOT NULL,
	"legal_form_code" text,
	"vat_id" text,
	"address_line" text,
	"address_structured" jsonb,
	"region_code" text,
	"region_name" text,
	"district_code" text,
	"district_name" text,
	"postal_code" text,
	"nace_codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"primary_nace" text,
	"founded_at" date,
	"upstream_updated_at" date,
	"registry_status" jsonb,
	"primary_source_registry" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"raw" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"source_key" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"diff" jsonb
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_snapshot" ADD CONSTRAINT "company_snapshot_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_country_registry_unique" ON "company" USING btree ("country_iso","registry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_nace_gin" ON "company" USING gin ("nace_codes");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_region_idx" ON "company" USING btree ("country_iso","region_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_snapshot_company_fetched_idx" ON "company_snapshot" USING btree ("company_id","fetched_at");