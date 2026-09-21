import { and, asc, eq, sql } from "drizzle-orm";
import type { DefaultMealTemplate } from "@/actions/settings.schemas";
import { db } from "@/db";
import { dailyLogs, plannedItems } from "@/db/schema";

export type PlannedItem = typeof plannedItems.$inferSelect;

export async function getPlannedItemsForLog(
  userId: string,
  logId: string,
): Promise<PlannedItem[]> {
  return db
    .select({
      id: plannedItems.id,
      dailyLogId: plannedItems.dailyLogId,
      kind: plannedItems.kind,
      title: plannedItems.title,
      startTime: plannedItems.startTime,
      endTime: plannedItems.endTime,
      createdAt: plannedItems.createdAt,
      updatedAt: plannedItems.updatedAt,
    })
    .from(plannedItems)
    .innerJoin(dailyLogs, eq(plannedItems.dailyLogId, dailyLogs.id))
    .where(and(eq(dailyLogs.userId, userId), eq(plannedItems.dailyLogId, logId)))
    .orderBy(asc(plannedItems.startTime), asc(plannedItems.title));
}

export async function getPlannedItemForLog(
  userId: string,
  logId: string,
  itemId: string,
): Promise<PlannedItem | null> {
  const [row] = await db
    .select({
      id: plannedItems.id,
      dailyLogId: plannedItems.dailyLogId,
      kind: plannedItems.kind,
      title: plannedItems.title,
      startTime: plannedItems.startTime,
      endTime: plannedItems.endTime,
      createdAt: plannedItems.createdAt,
      updatedAt: plannedItems.updatedAt,
    })
    .from(plannedItems)
    .innerJoin(dailyLogs, eq(plannedItems.dailyLogId, dailyLogs.id))
    .where(
      and(
        eq(plannedItems.id, itemId),
        eq(plannedItems.dailyLogId, logId),
        eq(dailyLogs.userId, userId),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Atomically claim seeding and insert default meals in one statement.
 * Uses a CTE instead of db.transaction (neon-http driver).
 */
export async function seedMealsIfNeeded(
  logId: string,
  templates: DefaultMealTemplate[],
): Promise<void> {
  if (templates.length === 0) {
    return;
  }

  const templatesJson = JSON.stringify(templates);

  await db.execute(sql`
    WITH claimed AS (
      UPDATE daily_logs
      SET meals_seeded_at = now(), updated_at = now()
      WHERE id = ${logId}::uuid AND meals_seeded_at IS NULL
      RETURNING id
    )
    INSERT INTO planned_items (
      daily_log_id,
      kind,
      title,
      start_time,
      end_time,
      created_at,
      updated_at
    )
    SELECT
      claimed.id,
      'meal'::planned_item_kind,
      t.label,
      t."startTime"::time,
      (t."startTime"::time + (t."durationMinutes" * interval '1 minute'))::time,
      now(),
      now()
    FROM claimed
    CROSS JOIN jsonb_to_recordset(${templatesJson}::jsonb) AS t(
      label text,
      "startTime" text,
      "durationMinutes" int
    )
  `);
}

export async function countMealsForLog(logId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(plannedItems)
    .where(
      and(eq(plannedItems.dailyLogId, logId), eq(plannedItems.kind, "meal")),
    );

  return row?.count ?? 0;
}
