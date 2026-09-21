import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs, journalEntries } from "@/db/schema";
import { journalEntrySnippet } from "@/lib/journal/format-labels";
import type { DailyLog } from "@/db/queries/daily-logs";

export type JournalEntryRow = typeof journalEntries.$inferSelect;

export type JournalSidebarItem = {
  date: string;
  snippet: string;
};

export async function getDailyLogByUserAndDate(
  userId: string,
  date: string,
): Promise<DailyLog | null> {
  const [log] = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, date)))
    .limit(1);

  return log ?? null;
}

export async function getMostRecentClosedLog(
  userId: string,
): Promise<DailyLog | null> {
  const [log] = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.status, "closed")))
    .orderBy(desc(dailyLogs.date))
    .limit(1);

  return log ?? null;
}

export async function getJournalEntryForLog(
  userId: string,
  logId: string,
): Promise<JournalEntryRow | null> {
  const [entry] = await db
    .select({
      id: journalEntries.id,
      dailyLogId: journalEntries.dailyLogId,
      content: journalEntries.content,
      generatedAt: journalEntries.generatedAt,
      editedAt: journalEntries.editedAt,
      createdAt: journalEntries.createdAt,
      updatedAt: journalEntries.updatedAt,
    })
    .from(journalEntries)
    .innerJoin(dailyLogs, eq(journalEntries.dailyLogId, dailyLogs.id))
    .where(and(eq(journalEntries.dailyLogId, logId), eq(dailyLogs.userId, userId)))
    .limit(1);

  return entry ?? null;
}

export async function getJournalSidebarEntries(
  userId: string,
  limit = 30,
): Promise<JournalSidebarItem[]> {
  const rows = await db
    .select({
      date: dailyLogs.date,
      content: journalEntries.content,
    })
    .from(journalEntries)
    .innerJoin(dailyLogs, eq(journalEntries.dailyLogId, dailyLogs.id))
    .where(
      and(eq(dailyLogs.userId, userId), isNotNull(dailyLogs.wakeTime)),
    )
    .orderBy(desc(dailyLogs.date))
    .limit(limit);

  return rows.map((row) => ({
    date: row.date,
    snippet: journalEntrySnippet(row.content),
  }));
}
