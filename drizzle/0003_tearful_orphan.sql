ALTER TABLE "exercises" ADD COLUMN "demo_image" "bytea";--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "demo_image_mime_type" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "demo_image_attempted" boolean DEFAULT false NOT NULL;