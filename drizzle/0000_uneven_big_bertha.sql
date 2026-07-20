CREATE TABLE "coach_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"goal_id" integer,
	"speech" text NOT NULL,
	"app_data" jsonb NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"notes" text,
	"gym_id" integer,
	"zone_id" integer,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"photo" "bytea" NOT NULL,
	"mime_type" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_equipment" (
	"exercise_id" integer NOT NULL,
	"equipment_category" text NOT NULL,
	CONSTRAINT "exercise_equipment_exercise_id_equipment_category_pk" PRIMARY KEY("exercise_id","equipment_category")
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"movement_pattern" text NOT NULL,
	"muscle_group" text NOT NULL,
	"is_compound" boolean DEFAULT false NOT NULL,
	"strength_target_key" text,
	"default_sets_reps_scheme" jsonb NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"start_weight" real,
	"target_weight" real,
	"start_body_fat_pct" real,
	"target_body_fat_pct" real,
	"start_waist_cm" real,
	"target_waist_cm" real,
	"primary_goal" text,
	"secondary_goal" text,
	"strength_targets" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gym_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gyms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"weight" real,
	"body_fat_pct" real,
	"bmi" real,
	"skeletal_muscle_mass_kg" real,
	"bone_mass_kg" real,
	"body_water_pct" real,
	"waist_cm" real,
	"body_fat_mass_kg" real,
	"resting_heart_rate" integer,
	"systolic" integer,
	"diastolic" integer,
	"endurance_score" integer,
	"active_calories_avg_4w" integer,
	"steps_avg_4w" integer,
	"notes" text,
	"source" text NOT NULL,
	"is_dexa_baseline" boolean DEFAULT false NOT NULL,
	"extra" jsonb,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "metrics_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "routine_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"routine_id" integer NOT NULL,
	"day_index" integer NOT NULL,
	"focus" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"routine_day_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"order_index" integer NOT NULL,
	"sets" integer NOT NULL,
	"reps_low" integer NOT NULL,
	"reps_high" integer NOT NULL,
	"target_weight_kg" real,
	"intensity_note" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_number" integer NOT NULL,
	"week_start_date" text NOT NULL,
	"goal_id" integer NOT NULL,
	"generator_strategy" text NOT NULL,
	"trend_status" text NOT NULL,
	"rationale" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"units_weight" text DEFAULT 'kg' NOT NULL,
	"training_days_per_week" integer DEFAULT 4 NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_zone_id_gym_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."gym_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_photos" ADD CONSTRAINT "equipment_photos_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_zones" ADD CONSTRAINT "gym_zones_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_days" ADD CONSTRAINT "routine_days_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_routine_day_id_routine_days_id_fk" FOREIGN KEY ("routine_day_id") REFERENCES "public"."routine_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;