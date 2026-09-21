import { describe, expect, it } from "vitest";
import { assembleScheduleInput } from "./assemble-input";

describe("assembleScheduleInput", () => {
  const baseParams = {
    wakeTime: "07:00:00",
    sleepDurationMinutes: 480,
    logDate: "2024-03-10",
    timezone: "America/New_York",
    now: new Date("2024-03-10T14:00:00.000Z"),
    plannedItems: [
      {
        id: "meal-1",
        kind: "meal" as const,
        title: "Breakfast",
        startTime: "08:00:00",
        endTime: "08:45:00",
      },
    ],
    calendarEvents: [
      {
        id: "all-day",
        title: "Holiday",
        startsAt: "2024-03-10T00:00:00.000Z",
        endsAt: "2024-03-11T00:00:00.000Z",
        allDay: true,
        included: true,
      },
      {
        id: "timed",
        title: "Standup",
        startsAt: "2024-03-10T14:00:00.000Z",
        endsAt: "2024-03-10T14:30:00.000Z",
        allDay: false,
        included: true,
      },
    ],
    pendingTasks: [
      {
        id: "task-1",
        title: "Write docs",
        estimatedMinutes: 30,
        createdAt: "2024-03-10T08:00:00.000Z",
      },
    ],
  };

  it("filters all-day events and rounds nowLocal up for today's log", () => {
    const assembled = assembleScheduleInput(baseParams);

    expect(assembled.input.nowLocalMinutes).toBe(10 * 60);
    expect(assembled.input.fixedItems.some((item) => item.id === "all-day")).toBe(
      false,
    );
    expect(assembled.input.fixedItems.some((item) => item.id === "timed")).toBe(
      true,
    );
  });

  it("sets nowLocal to null when the log date is not today", () => {
    const assembled = assembleScheduleInput({
      ...baseParams,
      logDate: "2024-03-11",
    });

    expect(assembled.input.nowLocalMinutes).toBeNull();
  });

  it("rounds nowLocal up to the next 15-minute boundary", () => {
    const assembled = assembleScheduleInput({
      ...baseParams,
      now: new Date("2024-03-10T14:07:00.000Z"),
    });

    expect(assembled.input.nowLocalMinutes).toBe(10 * 60 + 15);
  });

  it("produces a stable hash for the same inputs", () => {
    const first = assembleScheduleInput(baseParams);
    const second = assembleScheduleInput(baseParams);

    expect(first.inputHash).toBe(second.inputHash);
  });
});
