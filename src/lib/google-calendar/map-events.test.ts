import { describe, expect, it } from "vitest";
import { getLogDayWindow } from "./day-window";
import {
  allDayOverlapsLogDate,
  isDeclinedBySelf,
  mapGoogleCalendarEvent,
  mapGoogleCalendarEvents,
  shouldSkipGoogleEvent,
} from "./map-events";
import type { GoogleCalendarEvent } from "./types";

const LOG_DATE = "2024-03-10";
const TIMEZONE = "America/New_York";

describe("shouldSkipGoogleEvent", () => {
  it("skips cancelled events", () => {
    expect(shouldSkipGoogleEvent({ id: "1", status: "cancelled" })).toBe(true);
  });

  it("skips workingLocation events", () => {
    expect(
      shouldSkipGoogleEvent({ id: "1", eventType: "workingLocation" }),
    ).toBe(true);
  });

  it("keeps free transparent events", () => {
    expect(
      shouldSkipGoogleEvent({
        id: "1",
        transparency: "transparent",
        start: { dateTime: "2024-03-10T10:00:00-04:00" },
        end: { dateTime: "2024-03-10T11:00:00-04:00" },
      }),
    ).toBe(false);
  });
});

describe("isDeclinedBySelf", () => {
  it("detects self declined", () => {
    expect(
      isDeclinedBySelf({
        attendees: [{ self: true, responseStatus: "declined" }],
      }),
    ).toBe(true);
  });

  it("treats missing attendees as not declined", () => {
    expect(isDeclinedBySelf({})).toBe(false);
  });

  it("ignores non-self declined entries", () => {
    expect(
      isDeclinedBySelf({
        attendees: [{ responseStatus: "declined" }],
      }),
    ).toBe(false);
  });
});

describe("allDayOverlapsLogDate", () => {
  it("includes multi-day all-day events overlapping today", () => {
    expect(
      allDayOverlapsLogDate(
        { start: { date: "2024-03-09" }, end: { date: "2024-03-12" } },
        LOG_DATE,
      ),
    ).toBe(true);
  });

  it("excludes all-day events that end before today", () => {
    expect(
      allDayOverlapsLogDate(
        { start: { date: "2024-03-08" }, end: { date: "2024-03-10" } },
        LOG_DATE,
      ),
    ).toBe(false);
  });
});

describe("mapGoogleCalendarEvent", () => {
  const window = getLogDayWindow(LOG_DATE, TIMEZONE);

  it("maps timed events", () => {
    const mapped = mapGoogleCalendarEvent(
      {
        id: "timed-1",
        summary: "Standup",
        start: { dateTime: "2024-03-10T09:00:00-04:00" },
        end: { dateTime: "2024-03-10T09:30:00-04:00" },
      },
      LOG_DATE,
      window,
    );

    expect(mapped).toMatchObject({
      googleEventId: "timed-1",
      title: "Standup",
      allDay: false,
    });
    expect(mapped?.startsAt).toBeInstanceOf(Date);
  });

  it("uses fallback title when missing", () => {
    const mapped = mapGoogleCalendarEvent(
      {
        id: "timed-2",
        start: { dateTime: "2024-03-10T10:00:00-04:00" },
        end: { dateTime: "2024-03-10T11:00:00-04:00" },
      },
      LOG_DATE,
      window,
    );

    expect(mapped?.title).toBe("(No title)");
  });

  it("clips midnight-crossing events to the day window", () => {
    const mapped = mapGoogleCalendarEvent(
      {
        id: "cross-1",
        summary: "Late night",
        start: { dateTime: "2024-03-10T23:00:00-04:00" },
        end: { dateTime: "2024-03-11T01:00:00-04:00" },
      },
      LOG_DATE,
      window,
    );

    expect(mapped?.startsAt).toEqual(new Date("2024-03-10T23:00:00-04:00"));
    expect(mapped?.endsAt).toEqual(window.timeMax);
  });

  it("maps all-day events without times", () => {
    const mapped = mapGoogleCalendarEvent(
      {
        id: "allday-1",
        summary: "Holiday",
        start: { date: "2024-03-10" },
        end: { date: "2024-03-11" },
      },
      LOG_DATE,
      window,
    );

    expect(mapped).toEqual({
      googleEventId: "allday-1",
      title: "Holiday",
      startsAt: null,
      endsAt: null,
      allDay: true,
    });
  });

  it("handles DST spring-forward day timed events", () => {
    const dstDate = "2024-03-10";
    const dstWindow = getLogDayWindow(dstDate, TIMEZONE);
    const mapped = mapGoogleCalendarEvent(
      {
        id: "dst-1",
        summary: "Morning block",
        start: { dateTime: "2024-03-10T09:30:00-04:00" },
        end: { dateTime: "2024-03-10T10:30:00-04:00" },
      },
      dstDate,
      dstWindow,
    );

    expect(mapped?.title).toBe("Morning block");
    expect(mapped?.allDay).toBe(false);
  });
});

describe("mapGoogleCalendarEvents", () => {
  it("filters skipped events from batch mapping", () => {
    const events: GoogleCalendarEvent[] = [
      {
        id: "ok",
        summary: "Keep",
        start: { dateTime: "2024-03-10T09:00:00-04:00" },
        end: { dateTime: "2024-03-10T10:00:00-04:00" },
      },
      { id: "cancelled", status: "cancelled" },
      {
        id: "declined",
        attendees: [{ self: true, responseStatus: "declined" }],
        start: { dateTime: "2024-03-10T11:00:00-04:00" },
        end: { dateTime: "2024-03-10T12:00:00-04:00" },
      },
    ];

    const mapped = mapGoogleCalendarEvents(
      events,
      LOG_DATE,
      getLogDayWindow(LOG_DATE, TIMEZONE),
    );

    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.googleEventId).toBe("ok");
  });
});
