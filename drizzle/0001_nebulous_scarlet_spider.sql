CREATE TYPE "public"."daily_log_status" AS ENUM('draft', 'scheduled', 'in_progress', 'closed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedule_blocks" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "schedule_blocks" ALTER COLUMN "source" SET DEFAULT 'manual'::text;--> statement-breakpoint
UPDATE "schedule_blocks" SET "source" = 'calendar' WHERE "source" = 'calender';--> statement-breakpoint
DROP TYPE "public"."block_source";--> statement-breakpoint
CREATE TYPE "public"."block_source" AS ENUM('manual', 'calendar', 'ai_generated');--> statement-breakpoint
ALTER TABLE "schedule_blocks" ALTER COLUMN "source" SET DEFAULT 'manual'::"public"."block_source";--> statement-breakpoint
ALTER TABLE "schedule_blocks" ALTER COLUMN "source" SET DATA TYPE "public"."block_source" USING "source"::"public"."block_source";--> statement-breakpoint
ALTER TABLE "schedule_blocks" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
UPDATE "schedule_blocks" SET "type" = 'calendar_event' WHERE "type" = 'calender_event';--> statement-breakpoint
DROP TYPE "public"."block_type";--> statement-breakpoint
CREATE TYPE "public"."block_type" AS ENUM('task', 'meal', 'appointment', 'calendar_event', 'sleep');--> statement-breakpoint
ALTER TABLE "schedule_blocks" ALTER COLUMN "type" SET DATA TYPE "public"."block_type" USING "type"::"public"."block_type";--> statement-breakpoint
ALTER TABLE "daily_logs" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "daily_logs" ALTER COLUMN "wake_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_logs" ALTER COLUMN "sleep_time_target" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_logs" ALTER COLUMN "sleep_time_actual" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD COLUMN "status" "daily_log_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "estimated_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_date_unique" UNIQUE("user_id","date");