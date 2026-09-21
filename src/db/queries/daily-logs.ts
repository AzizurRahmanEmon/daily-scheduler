import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs, userPreferences } from "@/db/schema";
import {
  DAY_CUTOFF_HOUR,
  addCalendarDays,
  getCalendarDateInTimezone,
  getLocalHourInTimezone,
  resolveActiveLogDate,
  type DailyLogStatus,
} from "@/lib/date";

export type DailyLog = typeof dailyLogs.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;

export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences> {
  const [preferences] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (!preferences) {
    throw new Error(`User preferences not found for user ${userId}`);
  }

  return preferences;
}

async function getDailyLogByDate(
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

export async function getOrCreateTodayLog(
  userId: string,
  now: Date = new Date(),
): Promise<DailyLog> {
  const preferences = await getUserPreferences(userId);
  const timezone = preferences.timezone;
  const todayDate = getCalendarDateInTimezone(now, timezone);

  let yesterdayLog: { date: string; status: DailyLogStatus } | null = null;
  if (getLocalHourInTimezone(now, timezone) < DAY_CUTOFF_HOUR) {
    const yesterdayDate = addCalendarDays(todayDate, -1);
    const existingYesterday = await getDailyLogByDate(userId, yesterdayDate);
    if (existingYesterday) {
      yesterdayLog = {
        date: existingYesterday.date,
        status: existingYesterday.status,
      };
    }
  }

  const activeDate = resolveActiveLogDate(now, timezone, yesterdayLog);

  await db
    .insert(dailyLogs)
    .values({
      userId,
      date: activeDate,
      timezone,
      status: "draft",
    })
    .onConflictDoNothing({
      target: [dailyLogs.userId, dailyLogs.date],
    });

  const log = await getDailyLogByDate(userId, activeDate);
  if (!log) {
    throw new Error(
      `Failed to get or create daily log for ${userId} on ${activeDate}`,
    );
  }

  return log;
}

export async function getDailyLogForUser(
  userId: string,
  logId: string,
): Promise<DailyLog | null> {
  const [log] = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.id, logId), eq(dailyLogs.userId, userId)))
    .limit(1);

  return log ?? null;
}
