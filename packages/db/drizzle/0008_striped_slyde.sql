CREATE TABLE IF NOT EXISTS "mission_entity" (
	"id" text PRIMARY KEY NOT NULL,
	"mission_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"city" text,
	"note" text,
	"decision_maker" text,
	"source" text,
	"verify" boolean DEFAULT false NOT NULL,
	"origin" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mission_entity_link" (
	"id" text PRIMARY KEY NOT NULL,
	"mission_id" text NOT NULL,
	"from_entity" text NOT NULL,
	"to_entity" text NOT NULL,
	"kind" text DEFAULT 'serves' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mission_opportunity" (
	"id" text PRIMARY KEY NOT NULL,
	"mission_id" text NOT NULL,
	"tag" text,
	"title" text,
	"body" text,
	"tone" text DEFAULT 'info' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mission_rubric_criterion" (
	"id" text PRIMARY KEY NOT NULL,
	"mission_id" text NOT NULL,
	"text" text NOT NULL,
	"weight" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mission" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"client_org_id" text,
	"owner_user_id" text,
	"client_name" text,
	"client_legal" text,
	"client_sector" text,
	"client_nace" text,
	"client_products" text[] DEFAULT '{}'::text[] NOT NULL,
	"intent" text NOT NULL,
	"source_market" text,
	"target_market" text,
	"segment_nace" text,
	"segment_keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"ask" text,
	"deadline" date,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mission_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_entity" ADD CONSTRAINT "mission_entity_mission_id_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_entity_link" ADD CONSTRAINT "mission_entity_link_mission_id_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_entity_link" ADD CONSTRAINT "mission_entity_link_from_entity_mission_entity_id_fk" FOREIGN KEY ("from_entity") REFERENCES "public"."mission_entity"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_entity_link" ADD CONSTRAINT "mission_entity_link_to_entity_mission_entity_id_fk" FOREIGN KEY ("to_entity") REFERENCES "public"."mission_entity"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_opportunity" ADD CONSTRAINT "mission_opportunity_mission_id_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_rubric_criterion" ADD CONSTRAINT "mission_rubric_criterion_mission_id_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission" ADD CONSTRAINT "mission_client_org_id_organization_id_fk" FOREIGN KEY ("client_org_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission" ADD CONSTRAINT "mission_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_entity_mission_idx" ON "mission_entity" USING btree ("mission_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mission_entity_link_pair_unique" ON "mission_entity_link" USING btree ("mission_id","from_entity","to_entity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_entity_link_mission_idx" ON "mission_entity_link" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_opportunity_mission_idx" ON "mission_opportunity" USING btree ("mission_id","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_rubric_criterion_mission_idx" ON "mission_rubric_criterion" USING btree ("mission_id","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_owner_idx" ON "mission" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_client_org_idx" ON "mission" USING btree ("client_org_id");