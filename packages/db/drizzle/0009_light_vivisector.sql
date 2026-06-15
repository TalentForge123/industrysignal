CREATE TABLE IF NOT EXISTS "mission_research_move" (
	"id" text PRIMARY KEY NOT NULL,
	"mission_id" text NOT NULL,
	"ref" text NOT NULL,
	"label" text,
	"role" text,
	"task" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mission_trend" (
	"id" text PRIMARY KEY NOT NULL,
	"mission_id" text NOT NULL,
	"territory" text,
	"sector" text,
	"quarter" text,
	"title" text,
	"body" text,
	"metric" text,
	"source" text,
	"validated" boolean DEFAULT false NOT NULL,
	"tone" text DEFAULT 'info' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mission_entity" ADD COLUMN "priority" text;--> statement-breakpoint
ALTER TABLE "mission" ADD COLUMN "deliverable_note" text;--> statement-breakpoint
ALTER TABLE "mission" ADD COLUMN "trend_quarter" text;--> statement-breakpoint
ALTER TABLE "mission" ADD COLUMN "next_refresh" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_research_move" ADD CONSTRAINT "mission_research_move_mission_id_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_trend" ADD CONSTRAINT "mission_trend_mission_id_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_research_move_mission_idx" ON "mission_research_move" USING btree ("mission_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mission_research_move_ref_unique" ON "mission_research_move" USING btree ("mission_id","ref");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_trend_mission_idx" ON "mission_trend" USING btree ("mission_id","sort_order");