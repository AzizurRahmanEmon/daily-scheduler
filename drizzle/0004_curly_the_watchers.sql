CREATE TYPE "public"."planned_item_kind" AS ENUM('meal', 'appointment');--> statement-breakpoint
CREATE TABLE "planned_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_log_id" uuid NOT NULL,
	"kind" "planned_item_kind" NOT NULL,
	"title" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_logs" ADD COLUMN "meals_seeded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "default_meal_templates" jsonb DEFAULT '[{"label":"Breakfast","startTime":"08:00","durationMinutes":45},{"label":"Lunch","startTime":"12:30","durationMinutes":45},{"label":"Dinner","startTime":"19:00","durationMinutes":60}]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "planned_items" ADD CONSTRAINT "planned_items_daily_log_id_daily_logs_id_fk" FOREIGN KEY ("daily_log_id") REFERENCES "public"."daily_logs"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "planned_items_daily_log_id_idx" ON "planned_items" USING btree ("daily_log_id");