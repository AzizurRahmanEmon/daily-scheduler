ALTER TABLE "daily_logs" ADD COLUMN "schedule_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD COLUMN "schedule_input_hash" text;--> statement-breakpoint
ALTER TABLE "schedule_blocks" ADD COLUMN "source_id" text;