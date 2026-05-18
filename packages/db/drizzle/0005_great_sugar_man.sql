CREATE TABLE IF NOT EXISTS "macro_indicator" (
	"id" text PRIMARY KEY NOT NULL,
	"indicator_key" text NOT NULL,
	"source_key" text NOT NULL,
	"name_cs" text NOT NULL,
	"name_en" text NOT NULL,
	"unit" text NOT NULL,
	"period_kind" text NOT NULL,
	"latest_value" numeric,
	"latest_period" text,
	"latest_observed_at" date,
	"fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "macro_observation" (
	"id" text PRIMARY KEY NOT NULL,
	"indicator_id" text NOT NULL,
	"period" text NOT NULL,
	"observed_at" date NOT NULL,
	"value" numeric NOT NULL,
	"raw" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "macro_observation" ADD CONSTRAINT "macro_observation_indicator_id_macro_indicator_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."macro_indicator"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "macro_indicator_key_unique" ON "macro_indicator" USING btree ("indicator_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "macro_observation_indicator_period_unique" ON "macro_observation" USING btree ("indicator_id","period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "macro_observation_indicator_observed_idx" ON "macro_observation" USING btree ("indicator_id","observed_at");