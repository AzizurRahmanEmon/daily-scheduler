ALTER TABLE "journal_entries" ADD COLUMN "generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
UPDATE "journal_entries"
SET "generated_at" = "created_at" AT TIME ZONE 'UTC'
WHERE "generated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "journal_entries" ALTER COLUMN "generated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_entries" ALTER COLUMN "generated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "journal_entries"
  ADD CONSTRAINT "journal_entries_daily_log_id_unique" UNIQUE ("daily_log_id");
