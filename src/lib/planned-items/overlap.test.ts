import { describe, expect, it } from "vitest";
import { detectOverlapWarnings, intervalsOverlap } from "./overlap";

describe("intervalsOverlap", () => {
  it("treats adjacent intervals as non-overlapping", () => {
    expect(
      intervalsOverlap(
        { startMinutes: 540, endMinutes: 570 },
        { startMinutes: 570, endMinutes: 600 },
      ),
    ).toBe(false);
  });

  it("detects partial overlap", () => {
    expect(
      intervalsOverlap(
        { startMinutes: 540, endMinutes: 600 },
        { startMinutes: 570, endMinutes: 630 },
      ),
    ).toBe(true);
  });

  it("detects contained overlap", () => {
    expect(
      intervalsOverlap(
        { startMinutes: 600, endMinutes: 660 },
        { startMinutes: 610, endMinutes: 640 },
      ),
    ).toBe(true);
  });

  it("detects identical intervals", () => {
    expect(
      intervalsOverlap(
        { startMinutes: 600, endMinutes: 660 },
        { startMinutes: 600, endMinutes: 660 },
      ),
    ).toBe(true);
  });
});

describe("detectOverlapWarnings", () => {
  it("returns warnings for planned item overlaps with calendar and each other", () => {
    const planned = [
      {
        id: "meal-1",
        title: "Lunch",
        source: "planned" as const,
        startMinutes: 720,
        endMinutes: 765,
      },
      {
        id: "appt-1",
        title: "Dentist",
        source: "planned" as const,
        startMinutes: 840,
        endMinutes: 870,
      },
    ];
    const calendar = [
      {
        id: "cal-1",
        title: "Standup",
        source: "calendar" as const,
        startMinutes: 750,
        endMinutes: 780,
      },
    ];

    const warnings = detectOverlapWarnings(planned, calendar);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.itemTitle).toBe("Lunch");
    expect(warnings[0]?.conflictsWith.title).toBe("Standup");
  });
});
