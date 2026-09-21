import { describe, expect, it } from "vitest";
import { computeScheduleInputHash } from "./input-hash";

describe("computeScheduleInputHash", () => {
  const payload = {
    wakeTime: "07:00",
    sleepDurationMinutes: 480,
    tasks: [
      {
        id: "task-1",
        title: "Write docs",
        estimatedMinutes: 30,
        createdAt: "2024-03-10T08:00:00.000Z",
      },
    ],
    plannedItems: [
      {
        id: "meal-1",
        kind: "meal" as const,
        title: "Breakfast",
        startTime: "08:00",
        endTime: "08:45",
      },
    ],
    calendarEvents: [
      {
        id: "event-1",
        title: "Standup",
        startsAt: "2024-03-10T14:00:00.000Z",
        endsAt: "2024-03-10T14:30:00.000Z",
      },
    ],
  };

  it("returns the same hash for identical payloads", () => {
    expect(computeScheduleInputHash(payload)).toBe(
      computeScheduleInputHash(payload),
    );
  });

  it("changes when wake time changes", () => {
    const baseline = computeScheduleInputHash(payload);
    const changed = computeScheduleInputHash({
      ...payload,
      wakeTime: "08:00",
    });

    expect(changed).not.toBe(baseline);
  });

  it("does not depend on array ordering", () => {
    const ordered = computeScheduleInputHash(payload);
    const shuffled = computeScheduleInputHash({
      ...payload,
      tasks: [...payload.tasks].reverse(),
      plannedItems: [...payload.plannedItems].reverse(),
      calendarEvents: [...payload.calendarEvents].reverse(),
    });

    expect(shuffled).toBe(ordered);
  });
});
