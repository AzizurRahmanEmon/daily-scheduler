import { describe, expect, it } from "vitest";
import {
  DAY_CUTOFF_HOUR,
  addCalendarDays,
  getCalendarDateInTimezone,
  getLocalHourInTimezone,
  resolveActiveLogDate,
} from "./date";

describe("getCalendarDateInTimezone", () => {
  it("returns the local calendar date just before midnight UTC in UTC+14", () => {
    // 2024-01-15 12:30 UTC is still 2024-01-16 in Pacific/Kiritimati (UTC+14)
    const now = new Date("2024-01-15T12:30:00.000Z");
    expect(getCalendarDateInTimezone(now, "Pacific/Kiritimati")).toBe("2024-01-16");
  });

  it("returns the local calendar date just after midnight UTC in America/New_York", () => {
    // 2024-01-15 05:30 UTC is 2024-01-15 00:30 EST
    const now = new Date("2024-01-15T05:30:00.000Z");
    expect(getCalendarDateInTimezone(now, "America/New_York")).toBe("2024-01-15");
  });
});

describe("getLocalHourInTimezone", () => {
  it("reads local hour in a timezone ahead of UTC", () => {
    const now = new Date("2024-06-01T20:00:00.000Z");
    expect(getLocalHourInTimezone(now, "Asia/Tokyo")).toBe(5);
  });
});

describe("resolveActiveLogDate", () => {
  const timezone = "America/New_York";

  it("uses today's date after the cutoff hour", () => {
    const now = new Date("2024-06-01T14:00:00.000Z"); // 10:00 EDT
    expect(getLocalHourInTimezone(now, timezone)).toBeGreaterThanOrEqual(
      DAY_CUTOFF_HOUR,
    );

    const result = resolveActiveLogDate(now, timezone, {
      date: "2024-05-31",
      status: "in_progress",
    });

    expect(result).toBe("2024-06-01");
  });

  it("resumes yesterday before cutoff when yesterday is still open", () => {
    const now = new Date("2024-06-01T06:30:00.000Z"); // 02:30 EDT
    expect(getLocalHourInTimezone(now, timezone)).toBeLessThan(DAY_CUTOFF_HOUR);

    const result = resolveActiveLogDate(now, timezone, {
      date: "2024-05-31",
      status: "in_progress",
    });

    expect(result).toBe("2024-05-31");
  });

  it("starts today before cutoff when yesterday is closed", () => {
    const now = new Date("2024-06-01T06:30:00.000Z"); // 02:30 EDT

    const result = resolveActiveLogDate(now, timezone, {
      date: "2024-05-31",
      status: "closed",
    });

    expect(result).toBe("2024-06-01");
  });

  it("handles DST spring-forward day without throwing", () => {
    // US spring forward: 2024-03-10 — 2:00 AM becomes 3:00 AM
    const beforeTransition = new Date("2024-03-10T06:30:00.000Z"); // 01:30 EST
    const afterTransition = new Date("2024-03-10T07:30:00.000Z"); // 03:30 EDT

    expect(getCalendarDateInTimezone(beforeTransition, timezone)).toBe(
      "2024-03-10",
    );
    expect(getCalendarDateInTimezone(afterTransition, timezone)).toBe(
      "2024-03-10",
    );
    expect(
      resolveActiveLogDate(beforeTransition, timezone, {
        date: "2024-03-09",
        status: "in_progress",
      }),
    ).toBe("2024-03-09");
  });
});

describe("addCalendarDays", () => {
  it("subtracts one calendar day", () => {
    expect(addCalendarDays("2024-03-01", -1)).toBe("2024-02-29");
  });
});
