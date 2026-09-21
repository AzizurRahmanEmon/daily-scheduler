import { getLogDayWindow } from "@/lib/google-calendar/day-window";
import { getLocalMinutesInTimezone } from "@/lib/date";
import { END_OF_DAY_MINUTES } from "./constants";
import type { SchedulerFixedItem } from "./types";

export type TimedCalendarEventInput = {
  id: string;
  title: string;
  startsAt: Date | string;
  endsAt: Date | string;
  allDay: boolean;
  included: boolean;
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function convertTimedCalendarEventToLocalMinutes(
  event: TimedCalendarEventInput,
  logDate: string,
  timezone: string,
): SchedulerFixedItem | null {
  if (event.allDay || !event.included) {
    return null;
  }

  if (!event.startsAt || !event.endsAt) {
    return null;
  }

  const startsAt = toDate(event.startsAt);
  const endsAt = toDate(event.endsAt);
  const window = getLogDayWindow(logDate, timezone);

  if (endsAt <= window.timeMin || startsAt >= window.timeMax) {
    return null;
  }

  const rawStart = getLocalMinutesInTimezone(startsAt, timezone);
  const rawEnd = getLocalMinutesInTimezone(endsAt, timezone);
  const startMinutes = Math.max(0, Math.min(rawStart, END_OF_DAY_MINUTES));
  const endMinutes = Math.max(0, Math.min(rawEnd, END_OF_DAY_MINUTES));

  if (startMinutes >= endMinutes) {
    return null;
  }

  return {
    id: event.id,
    title: event.title,
    type: "calendar_event",
    startMinutes,
    endMinutes,
  };
}
