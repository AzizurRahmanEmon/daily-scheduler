import { convertTimedCalendarEventToLocalMinutes } from "@/lib/scheduler/calendar-to-local";

export type CalendarEventForJournal = {
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  allDay: boolean;
  included: boolean;
};

export function computeIncludedCalendarStats(
  events: CalendarEventForJournal[],
  logDate: string,
  timezone: string,
): { eventCount: number; busyMinutes: number } {
  let eventCount = 0;
  let busyMinutes = 0;

  for (const event of events) {
    const converted = convertTimedCalendarEventToLocalMinutes(
      {
        id: "calendar-event",
        title: "Event",
        startsAt: event.startsAt ?? "",
        endsAt: event.endsAt ?? "",
        allDay: event.allDay,
        included: event.included,
      },
      logDate,
      timezone,
    );

    if (!converted) {
      continue;
    }

    eventCount += 1;
    busyMinutes += converted.endMinutes - converted.startMinutes;
  }

  return { eventCount, busyMinutes };
}
