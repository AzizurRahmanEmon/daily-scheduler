const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export const MINUTES_PER_DAY = 24 * 60;

/** Normalize HH:MM or HH:MM:SS to HH:MM. */
export function normalizeTimeOfDay(value: string): string {
  const match = value.trim().match(TIME_PATTERN);
  if (!match) {
    throw new Error(`Invalid time: ${value}`);
  }
  return `${match[1]}:${match[2]}`;
}

export function timeToMinutes(value: string): number {
  const normalized = normalizeTimeOfDay(value);
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, MINUTES_PER_DAY - 1));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function addMinutesToTime(startTime: string, durationMinutes: number): string {
  return minutesToTime(timeToMinutes(startTime) + durationMinutes);
}

export function durationMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return end - start;
}

export function crossesMidnight(
  startTime: string,
  durationMinutes: number,
): boolean {
  return timeToMinutes(startTime) + durationMinutes >= MINUTES_PER_DAY;
}

export function isValidSameDayRange(startTime: string, endTime: string): boolean {
  return timeToMinutes(endTime) > timeToMinutes(startTime);
}

/** Format PostgreSQL time (HH:MM:SS) for HTML time inputs. */
export function formatTimeForInput(value: string): string {
  return normalizeTimeOfDay(value);
}

/** Format minutes since midnight or a PG time value for display (e.g. 9:30 AM). */
export function formatMinutesLabel(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, "0")} ${period}`;
}

export function formatPgTimeLabel(pgTime: string): string {
  return formatMinutesLabel(timeToMinutes(formatTimeForInput(pgTime)));
}
