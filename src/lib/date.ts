import { formatTimeForInput, normalizeTimeOfDay } from "./time-of-day";

/** Hour (0–23) before which an open previous-day log is resumed instead of starting today. */
export const DAY_CUTOFF_HOUR = 4;

export type DailyLogStatus = "draft" | "scheduled" | "in_progress" | "closed";

export type YesterdayLogRef = {
  date: string;
  status: DailyLogStatus;
};

/**
 * Calendar date (YYYY-MM-DD) for a moment in an IANA timezone.
 */
export function getCalendarDateInTimezone(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Local minutes since midnight for a moment in an IANA timezone.
 */
export function getLocalMinutesInTimezone(now: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );

  return hour * 60 + minute;
}

/**
 * Local hour (0–23) for a moment in an IANA timezone.
 */
export function getLocalHourInTimezone(now: Date, timezone: string): number {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now).find((part) => part.type === "hour");

  return Number(hourPart?.value ?? 0);
}

/**
 * Add calendar days to a YYYY-MM-DD string (timezone-agnostic date math).
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

/**
 * Decide which daily_log date to use for the current moment.
 *
 * Before {@link DAY_CUTOFF_HOUR} local time, resume yesterday's log if it
 * exists and is not closed. Otherwise use today's calendar date.
 */
export function resolveActiveLogDate(
  now: Date,
  timezone: string,
  yesterdayLog: YesterdayLogRef | null,
): string {
  const todayDate = getCalendarDateInTimezone(now, timezone);
  const localHour = getLocalHourInTimezone(now, timezone);

  if (localHour < DAY_CUTOFF_HOUR) {
    const yesterdayDate = addCalendarDays(todayDate, -1);
    if (
      yesterdayLog &&
      yesterdayLog.date === yesterdayDate &&
      yesterdayLog.status !== "closed"
    ) {
      return yesterdayDate;
    }
  }

  return todayDate;
}

/** Normalize an HTML time input to PostgreSQL time (HH:MM:SS). */
export function normalizeWakeTimeInput(value: string): string {
  return `${normalizeTimeOfDay(value)}:00`;
}

/** Format a stored wake time for HTML time inputs. */
export function formatWakeTimeForInput(value: string | null): string {
  if (!value) {
    return "";
  }
  return formatTimeForInput(value);
}
