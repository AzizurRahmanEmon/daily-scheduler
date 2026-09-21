import {
  pgTable,
  uuid,
  text,
  timestamp,
  time,
  date,
  pgEnum,
  integer,
  boolean,
  unique,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "complete",
  "partial",
  "incomplete",
]);

export const dailyLogStatusEnum = pgEnum("daily_log_status", [
  "draft",
  "scheduled",
  "in_progress",
  "closed",
]);

export const blockTypeEnum = pgEnum("block_type", [
  "task",
  "meal",
  "appointment",
  "calendar_event",
  "sleep",
]);

export const blockSourceEnum = pgEnum("block_source", [
  "manual",
  "calendar",
  "ai_generated",
]);

export const plannedItemKindEnum = pgEnum("planned_item_kind", [
  "meal",
  "appointment",
]);

export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    timezone: text("timezone").notNull(),
    status: dailyLogStatusEnum("status").notNull().default("draft"),
    wakeTime: time("wake_time"),
    sleepTime: time("sleep_time_target"),
    sleepTimeActual: time("sleep_time_actual"),
    calendarSyncedAt: timestamp("calendar_synced_at", { withTimezone: true }),
    mealsSeededAt: timestamp("meals_seeded_at", { withTimezone: true }),
    scheduleGeneratedAt: timestamp("schedule_generated_at", {
      withTimezone: true,
    }),
    scheduleInputHash: text("schedule_input_hash"),
    dayNotes: text("day_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.userId, table.date)],
);

export const plannedItems = pgTable(
  "planned_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dailyLogId: uuid("daily_log_id")
      .notNull()
      .references(() => dailyLogs.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    kind: plannedItemKindEnum("kind").notNull(),
    title: text("title").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("planned_items_daily_log_id_idx").on(table.dailyLogId)],
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dailyLogId: uuid("daily_log_id")
      .notNull()
      .references(() => dailyLogs.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    googleEventId: text("google_event_id").notNull(),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    allDay: boolean("all_day").notNull().default(false),
    included: boolean("included").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique().on(table.dailyLogId, table.googleEventId),
    index("calendar_events_daily_log_id_idx").on(table.dailyLogId),
  ],
);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  dailyLogId: uuid("daily_log_id")
    .notNull()
    .references(() => dailyLogs.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  title: text("title").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull().default(30),
  status: taskStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scheduleBlocks = pgTable("schedule_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  dailyLogId: uuid("daily_log_id")
    .notNull()
    .references(() => dailyLogs.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  type: blockTypeEnum("type").notNull(),
  source: blockSourceEnum("source").notNull().default("manual"),
  title: text("title").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  sourceId: text("source_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dailyLogId: uuid("daily_log_id")
      .notNull()
      .references(() => dailyLogs.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    content: text("content").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.dailyLogId)],
);

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  defaultSleepDuration: integer("default_sleep_duration")
    .notNull()
    .default(480),
  mealCountPreference: integer("meal_count_preference").notNull().default(3),
  defaultMealTemplates: jsonb("default_meal_templates")
    .notNull()
    .default([
      { label: "Breakfast", startTime: "08:00", durationMinutes: 45 },
      { label: "Lunch", startTime: "12:30", durationMinutes: 45 },
      { label: "Dinner", startTime: "19:00", durationMinutes: 60 },
    ]),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
