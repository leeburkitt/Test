ALTER TABLE "routine_days" ADD COLUMN "day_of_week" integer;--> statement-breakpoint
ALTER TABLE "routine_days" ADD COLUMN "day_type" text DEFAULT 'gym' NOT NULL;--> statement-breakpoint
ALTER TABLE "routine_days" ADD COLUMN "zone_id" integer;--> statement-breakpoint
ALTER TABLE "routine_days" ADD COLUMN "coach_note" text;--> statement-breakpoint
ALTER TABLE "routine_days" ADD COLUMN "completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD COLUMN "rest_seconds" integer;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD COLUMN "actual_weight_kg" real;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD COLUMN "completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "gym_id" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "weekly_schedule" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "default_gym_id" integer;--> statement-breakpoint
ALTER TABLE "routine_days" ADD CONSTRAINT "routine_days_zone_id_gym_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."gym_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_default_gym_id_gyms_id_fk" FOREIGN KEY ("default_gym_id") REFERENCES "public"."gyms"("id") ON DELETE set null ON UPDATE no action;