ALTER TABLE "alert" ADD COLUMN "source_event_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "alert_dedup_unique" ON "alert" USING btree ("organization_id","kind","source_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_org_status_idx" ON "alert" USING btree ("organization_id","status","created_at");