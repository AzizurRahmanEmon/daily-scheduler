import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs, scheduleBlocks } from "@/db/schema";
import type { PersistedScheduleBlock } from "@/lib/scheduler/persist";

export type ScheduleBlockRow = typeof scheduleBlocks.$inferSelect;

export async function getScheduleBlocksForLog(
  userId: string,
  logId: string,
): Promise<ScheduleBlockRow[]> {
  return db
    .select({
      id: scheduleBlocks.id,
      dailyLogId: scheduleBlocks.dailyLogId,
      type: scheduleBlocks.type,
      source: scheduleBlocks.source,
      title: scheduleBlocks.title,
      startTime: scheduleBlocks.startTime,
      endTime: scheduleBlocks.endTime,
      sourceId: scheduleBlocks.sourceId,
      createdAt: scheduleBlocks.createdAt,
      updatedAt: scheduleBlocks.updatedAt,
    })
    .from(scheduleBlocks)
    .innerJoin(dailyLogs, eq(scheduleBlocks.dailyLogId, dailyLogs.id))
    .where(and(eq(dailyLogs.userId, userId), eq(scheduleBlocks.dailyLogId, logId)))
    .orderBy(asc(scheduleBlocks.startTime), asc(scheduleBlocks.title));
}

function ownedLogSubquery(userId: string, logId: string) {
  return db
    .select({ id: dailyLogs.id })
    .from(dailyLogs)
    .where(and(eq(dailyLogs.id, logId), eq(dailyLogs.userId, userId)));
}

function deleteOwnedScheduleBlocks(userId: string, logId: string) {
  return db.delete(scheduleBlocks).where(
    and(
      eq(scheduleBlocks.dailyLogId, logId),
      inArray(scheduleBlocks.dailyLogId, ownedLogSubquery(userId, logId)),
    ),
  );
}

function updateOwnedLogScheduleMetadata(
  userId: string,
  logId: string,
  sleepTargetTime: string,
  inputHash: string,
  now: Date,
) {
  return db
    .update(dailyLogs)
    .set({
      sleepTime: sleepTargetTime,
      scheduleGeneratedAt: now,
      scheduleInputHash: inputHash,
      updatedAt: now,
    })
    .where(and(eq(dailyLogs.id, logId), eq(dailyLogs.userId, userId)));
}

function insertScheduleBlockRows(
  logId: string,
  rows: PersistedScheduleBlock[],
  now: Date,
) {
  return rows.map((row) =>
    db.insert(scheduleBlocks).values({
      dailyLogId: logId,
      type: row.type,
      source: row.source,
      title: row.title,
      startTime: row.startTime,
      endTime: row.endTime,
      sourceId: row.sourceId,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

export function getReplaceScheduleBlockStatements(
  userId: string,
  logId: string,
  rows: PersistedScheduleBlock[],
  sleepTargetTime: string,
  inputHash: string,
  now: Date,
) {
  const deleteStmt = deleteOwnedScheduleBlocks(userId, logId);
  const updateStmt = updateOwnedLogScheduleMetadata(
    userId,
    logId,
    sleepTargetTime,
    inputHash,
    now,
  );

  if (rows.length === 0) {
    return [deleteStmt, updateStmt];
  }

  return [deleteStmt, ...insertScheduleBlockRows(logId, rows, now), updateStmt];
}

/**
 * Atomically replace all schedule blocks for a log using db.batch (neon-http).
 * Deletes are scoped to blocks on the authenticated user's log id.
 */
export async function replaceScheduleBlocksForLog(
  userId: string,
  logId: string,
  rows: PersistedScheduleBlock[],
  sleepTargetTime: string,
  inputHash: string,
): Promise<void> {
  const now = new Date();
  const deleteStmt = deleteOwnedScheduleBlocks(userId, logId);
  const updateStmt = updateOwnedLogScheduleMetadata(
    userId,
    logId,
    sleepTargetTime,
    inputHash,
    now,
  );

  if (rows.length === 0) {
    await db.batch([deleteStmt, updateStmt]);
    return;
  }

  await db.batch([
    deleteStmt,
    ...insertScheduleBlockRows(logId, rows, now),
    updateStmt,
  ]);
}
