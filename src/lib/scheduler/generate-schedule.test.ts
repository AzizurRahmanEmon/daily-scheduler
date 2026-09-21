import { describe, expect, it } from "vitest";
import { assembleScheduleInput } from "./assemble-input";
import { buildSchedule } from "./build-schedule";
import { mapScheduleBlocksToRows } from "./persist";

describe("generateSchedule persistence mapping", () => {
  const FIXED_NOW = "2024-03-10T14:00:00.000Z";

  it("produces identical rows when generated twice with the same injected now", () => {
    const assembled = assembleScheduleInput({
      wakeTime: "07:00:00",
      sleepDurationMinutes: 480,
      logDate: "2024-03-10",
      timezone: "America/New_York",
      now: new Date(FIXED_NOW),
      plannedItems: [
        {
          id: "meal-1",
          kind: "meal",
          title: "Breakfast",
          startTime: "08:00:00",
          endTime: "08:45:00",
        },
      ],
      calendarEvents: [],
      pendingTasks: [
        {
          id: "task-1",
          title: "Deep work",
          estimatedMinutes: 60,
          createdAt: "2024-03-10T08:00:00.000Z",
        },
        {
          id: "task-2",
          title: "Email",
          estimatedMinutes: 30,
          createdAt: "2024-03-10T09:00:00.000Z",
        },
      ],
    });

    const first = mapScheduleBlocksToRows(buildSchedule(assembled.input).blocks);
    const second = mapScheduleBlocksToRows(buildSchedule(assembled.input).blocks);

    expect(first).toEqual(second);
  });

  it("moves future task blocks when nowLocal is later on regeneration", () => {
    const earlier = assembleScheduleInput({
      wakeTime: "07:00:00",
      sleepDurationMinutes: 480,
      logDate: "2024-03-10",
      timezone: "America/New_York",
      now: new Date("2024-03-10T13:00:00.000Z"),
      plannedItems: [],
      calendarEvents: [],
      pendingTasks: [
        {
          id: "task-1",
          title: "Deep work",
          estimatedMinutes: 60,
          createdAt: "2024-03-10T08:00:00.000Z",
        },
      ],
    });

    const later = assembleScheduleInput({
      wakeTime: "07:00:00",
      sleepDurationMinutes: 480,
      logDate: "2024-03-10",
      timezone: "America/New_York",
      now: new Date("2024-03-10T16:00:00.000Z"),
      plannedItems: [],
      calendarEvents: [],
      pendingTasks: [
        {
          id: "task-1",
          title: "Deep work",
          estimatedMinutes: 60,
          createdAt: "2024-03-10T08:00:00.000Z",
        },
      ],
    });

    const earlierTask = buildSchedule(earlier.input).blocks.find(
      (block) => block.type === "task",
    );
    const laterTask = buildSchedule(later.input).blocks.find(
      (block) => block.type === "task",
    );

    expect(earlierTask?.startMinutes).toBeLessThan(laterTask!.startMinutes!);
  });

  it("yields zero persisted rows for a clamped empty day", () => {
    const assembled = assembleScheduleInput({
      wakeTime: "10:00:00",
      sleepDurationMinutes: 6 * 60,
      logDate: "2024-03-10",
      timezone: "America/New_York",
      now: new Date(FIXED_NOW),
      plannedItems: [],
      calendarEvents: [],
      pendingTasks: [],
    });

    const rows = mapScheduleBlocksToRows(buildSchedule(assembled.input).blocks);
    expect(rows).toEqual([]);
  });
});
