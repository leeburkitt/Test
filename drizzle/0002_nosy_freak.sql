ALTER TABLE "exercises" ADD COLUMN "demo_steps" jsonb;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "demo_video_url" text;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD COLUMN "equipment_id" integer;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD COLUMN "set_logs" jsonb;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE set null ON UPDATE no action;