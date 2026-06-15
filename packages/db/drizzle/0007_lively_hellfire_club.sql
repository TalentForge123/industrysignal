CREATE TABLE IF NOT EXISTS "llm_call" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"cache_key" text NOT NULL,
	"model" text NOT NULL,
	"prompt_id" text,
	"prompt_version" text,
	"system_prompt" text,
	"input" jsonb NOT NULL,
	"output" jsonb,
	"tokens_in" integer,
	"tokens_out" integer,
	"cost_usd" numeric,
	"latency_ms" integer,
	"status" text DEFAULT 'ok' NOT NULL,
	"error_message" text,
	"consumer_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_id" text,
	"from_status" text,
	"to_status" text,
	"note" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "submitted_by" text;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "reviewer_id" text;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "reviewer_notes" text;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "published_by" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_audit" ADD CONSTRAINT "report_audit_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_audit" ADD CONSTRAINT "report_audit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "llm_call_cache_key_unique" ON "llm_call" USING btree ("cache_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "llm_call_consumer_idx" ON "llm_call" USING btree ("consumer_ref");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_audit_report_created_idx" ON "report_audit" USING btree ("report_id","created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report" ADD CONSTRAINT "report_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report" ADD CONSTRAINT "report_submitted_by_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report" ADD CONSTRAINT "report_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report" ADD CONSTRAINT "report_published_by_user_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_status_published_idx" ON "report" USING btree ("status","published_at");