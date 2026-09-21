import { describe, expect, it } from "vitest";
import { convertTimedCalendarEventToLocalMinutes } from "./calendar-to-local";

describe("convertTimedCalendarEventToLocalMinutes", () => {
  it("returns null for all-day events", () => {
    expect(
      convertTimedCalendarEventToLocalMinutes(
        {
          id: "all-day",
          title: "Holiday",
          startsAt: "2024-03-10T00:00:00.000Z",
          endsAt: "2024-03-11T00:00:00.000Z",
          allDay: true,
          included: true,
        },
        "2024-03-10",
        "America/New_York",
      ),
    ).toBeNull();
  });

  it("converts a timed event to local minutes in the log timezone", () => {
    const converted = convertTimedCalendarEventToLocalMinutes(
      {
        id: "timed",
        title: "Standup",
        startsAt: "2024-03-10T14:00:00.000Z",
        endsAt: "2024-03-10T14:30:00.000Z",
        allDay: false,
        included: true,
      },
      "2024-03-10",
      "America/New_York",
    );

    expect(converted).toMatchObject({
      id: "timed",
      type: "calendar_event",
      startMinutes: 10 * 60,
      endMinutes: 10 * 60 + 30,
    });
  });

  it("handles a DST spring-forward day using Intl local wall-clock minutes", () => {
    const converted = convertTimedCalendarEventToLocalMinutes(
      {
        id: "dst",
        title: "Morning block",
        startsAt: "2024-03-10T13:30:00.000Z",
        endsAt: "2024-03-10T14:30:00.000Z",
        allDay: false,
        included: true,
      },
      "2024-03-10",
      "America/New_York",
    );

    expect(converted?.startMinutes).toBe(9 * 60 + 30);
    expect(converted?.endMinutes).toBe(10 * 60 + 30);
  });
});
