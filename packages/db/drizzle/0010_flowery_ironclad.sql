CREATE TABLE IF NOT EXISTS "mission_share" (
	"id" text PRIMARY KEY NOT NULL,
	"mission_id" text NOT NULL,
	"token" text NOT NULL,
	"mode" text DEFAULT 'full' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mission_share_token_unique" UNIQUE("token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_share" ADD CONSTRAINT "mission_share_mission_id_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_share" ADD CONSTRAINT "mission_share_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_share_mission_idx" ON "mission_share" USING btree ("mission_id");