import { addCalendarDays } from "@/lib/date";

function getZonedParts(at: Date, timeZone: string) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
}

/** Convert a local wall-clock moment in `timeZone` to a UTC Date. */
export function zonedDateTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string,
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute, second = 0] = timeStr.split(":").map(Number);
  const desiredLocalMs = Date.UTC(year, month - 1, day, hour, minute, second);
  let utcMs = desiredLocalMs;

  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = getZonedParts(new Date(utcMs), timeZone);
    const zonedAsUtcMs = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const diff = desiredLocalMs - zonedAsUtcMs;
    if (diff === 0) {
      break;
    }
    utcMs += diff;
  }

  return new Date(utcMs);
}

export type LogDayWindow = {
  timeMin: Date;
  timeMax: Date;
};

/** Inclusive start, exclusive end — the log date in the log's stored timezone. */
export function getLogDayWindow(logDate: string, timeZone: string): LogDayWindow {
  const nextDate = addCalendarDays(logDate, 1);
  return {
    timeMin: zonedDateTimeToUtc(logDate, "00:00:00", timeZone),
    timeMax: zonedDateTimeToUtc(nextDate, "00:00:00", timeZone),
  };
}
