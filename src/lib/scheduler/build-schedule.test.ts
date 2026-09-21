import { describe, expect, it } from "vitest";
import { END_OF_DAY_MINUTES, TASK_BUFFER_MINUTES } from "./constants";
import { buildSchedule } from "./build-schedule";
import type { BuildScheduleInput, SchedulerFixedItem, SchedulerTask } from "./types";

/**
 * All-day calendar filtering is covered in assemble-input.test.ts (Part B).
 */

const WAKE = 7 * 60;
const SLEEP_MINUTES = 8 * 60;

function task(
  id: string,
  title: string,
  estimatedMinutes: number,
  createdAt: string,
): SchedulerTask {
  return { id, title, estimatedMinutes, createdAt };
}

function fixed(
  id: string,
  title: string,
  type: SchedulerFixedItem["type"],
  startMinutes: number,
  endMinutes: number,
): SchedulerFixedItem {
  return { id, title, type, startMinutes, endMinutes };
}

function baseInput(
  overrides: Partial<BuildScheduleInput> = {},
): BuildScheduleInput {
  return {
    wakeTimeMinutes: WAKE,
    sleepDurationMinutes: SLEEP_MINUTES,
    nowLocalMinutes: null,
    fixedItems: [],
    tasks: [],
    ...overrides,
  };
}

describe("buildSchedule", () => {
  it("empty day with zero tasks produces only the sleep block", () => {
    const result = buildSchedule(baseInput());

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]).toMatchObject({
      type: "sleep",
      startMinutes: WAKE + (24 * 60 - SLEEP_MINUTES),
      endMinutes: END_OF_DAY_MINUTES,
    });
    expect(result.unscheduled).toEqual([]);
    expect(result.fixedConflicts).toEqual([]);
  });

  it("one gap fits some tasks and not others", () => {
    const wake = 10 * 60;
    const gapStart = 11 * 60;
    const gapEnd = gapStart + 30 + TASK_BUFFER_MINUTES * 2;
    const bedtime = wake + (24 * 60 - SLEEP_MINUTES);
    const result = buildSchedule(
      baseInput({
        wakeTimeMinutes: wake,
        fixedItems: [
          fixed("a", "Before gap", "appointment", wake, gapStart),
          fixed("b", "After gap", "appointment", gapEnd, bedtime),
        ],
        tasks: [
          task("t-long", "Fits gap", 30, "2024-03-10T07:00:00.000Z"),
          task("t-short", "Too long for remainder", 25, "2024-03-10T08:00:00.000Z"),
        ],
      }),
    );

    const taskBlocks = result.blocks.filter((block) => block.type === "task");
    expect(taskBlocks).toHaveLength(1);
    expect(taskBlocks[0]?.sourceId).toBe("t-long");
    expect(result.unscheduled).toEqual([
      {
        taskId: "t-short",
        title: "Too long for remainder",
        reason: "no_window_long_enough",
      },
    ]);
  });

  it("places a task that exactly fills a free window using edge buffers only", () => {
    const wake = 9 * 60;
    const gapStart = 10 * 60;
    const gapEnd = gapStart + 30 + TASK_BUFFER_MINUTES * 2;
    const bedtime = wake + (24 * 60 - SLEEP_MINUTES);
    const result = buildSchedule(
      baseInput({
        wakeTimeMinutes: wake,
        fixedItems: [
          fixed("a", "Block A", "appointment", wake, gapStart),
          fixed("b", "Block B", "appointment", gapEnd, bedtime),
        ],
        tasks: [task("t1", "Exact fit", 30, "2024-03-10T08:00:00.000Z")],
      }),
    );

    const taskBlock = result.blocks.find((block) => block.type === "task");
    expect(taskBlock).toMatchObject({
      sourceId: "t1",
      startMinutes: gapStart + TASK_BUFFER_MINUTES,
      endMinutes: gapStart + TASK_BUFFER_MINUTES + 30,
    });
    expect(result.unscheduled).toEqual([]);
  });

  it("applies buffer between consecutive task blocks inside the same window", () => {
    const wake = 9 * 60;
    const gapStart = 10 * 60;
    const gapEnd =
      gapStart + 30 + TASK_BUFFER_MINUTES + 30 + TASK_BUFFER_MINUTES * 2;
    const bedtime = wake + (24 * 60 - SLEEP_MINUTES);
    const result = buildSchedule(
      baseInput({
        wakeTimeMinutes: wake,
        fixedItems: [
          fixed("a", "Block A", "appointment", wake, gapStart),
          fixed("b", "Block B", "appointment", gapEnd, bedtime),
        ],
        tasks: [
          task("t1", "First", 30, "2024-03-10T07:00:00.000Z"),
          task("t2", "Second", 30, "2024-03-10T08:00:00.000Z"),
        ],
      }),
    );

    const taskBlocks = result.blocks.filter((block) => block.type === "task");
    expect(taskBlocks).toHaveLength(2);
    expect(taskBlocks[0]?.endMinutes! + TASK_BUFFER_MINUTES).toBe(
      taskBlocks[1]?.startMinutes,
    );
  });

  it("treats adjacent fixed items as one busy span with no gap between them", () => {
    const result = buildSchedule(
      baseInput({
        wakeTimeMinutes: 9 * 60,
        fixedItems: [
          fixed("a", "Standup", "calendar_event", 9 * 60, 9 * 60 + 30),
          fixed("b", "Review", "calendar_event", 9 * 60 + 30, 10 * 60),
        ],
        tasks: [
          task("t1", "Would use middle gap", 25, "2024-03-10T08:00:00.000Z"),
        ],
      }),
    );

    expect(result.fixedConflicts).toEqual([]);
    const betweenFixed = result.blocks.filter(
      (block) =>
        block.type === "task" &&
        block.startMinutes >= 9 * 60 &&
        block.endMinutes <= 10 * 60,
    );
    expect(betweenFixed).toHaveLength(0);
  });

  it("keeps overlapping fixed items and reports them as conflicts", () => {
    const result = buildSchedule(
      baseInput({
        fixedItems: [
          fixed("a", "Lunch", "meal", 12 * 60, 13 * 60),
          fixed("b", "Meeting", "calendar_event", 12 * 60 + 30, 13 * 60 + 30),
        ],
      }),
    );

    expect(result.fixedConflicts).toHaveLength(1);
    expect(result.blocks.filter((block) => block.type === "meal")).toHaveLength(
      1,
    );
    expect(
      result.blocks.filter((block) => block.type === "calendar_event"),
    ).toHaveLength(1);
  });

  it("includes a fixed item entirely before nowLocal but does not use it for task placement", () => {
    const nowLocal = 10 * 60;
    const result = buildSchedule(
      baseInput({
        nowLocalMinutes: nowLocal,
        fixedItems: [
          fixed("breakfast", "Breakfast", "meal", 7 * 60, 7 * 60 + 45),
        ],
        tasks: [task("t1", "Late task", 30, "2024-03-10T08:00:00.000Z")],
      }),
    );

    expect(result.blocks.some((block) => block.sourceId === "breakfast")).toBe(
      true,
    );
    const taskBlock = result.blocks.find((block) => block.type === "task");
    expect(taskBlock?.startMinutes).toBeGreaterThanOrEqual(
      nowLocal + TASK_BUFFER_MINUTES,
    );
  });

  it("keeps a fixed item after bedtime but does not place tasks after bedtime", () => {
    const bedtime = WAKE + (24 * 60 - SLEEP_MINUTES);
    const result = buildSchedule(
      baseInput({
        fixedItems: [
          fixed("late", "Late event", "appointment", bedtime + 30, bedtime + 60),
        ],
        tasks: [task("t1", "Evening task", 30, "2024-03-10T08:00:00.000Z")],
      }),
    );

    expect(result.blocks.some((block) => block.sourceId === "late")).toBe(true);
    const taskBlocks = result.blocks.filter((block) => block.type === "task");
    for (const block of taskBlocks) {
      expect(block.endMinutes).toBeLessThanOrEqual(bedtime);
    }
  });

  it("starts the planning window at nowLocal when it is later than wake", () => {
    const nowLocal = 10 * 60;
    const result = buildSchedule(
      baseInput({
        nowLocalMinutes: nowLocal,
        tasks: [task("t1", "Late start task", 30, "2024-03-10T08:00:00.000Z")],
      }),
    );

    const taskBlock = result.blocks.find((block) => block.type === "task");
    expect(taskBlock?.startMinutes).toBeGreaterThanOrEqual(
      nowLocal + TASK_BUFFER_MINUTES,
    );
  });

  it("marks tasks as no_time_left when nowLocal is after bedtime", () => {
    const result = buildSchedule(
      baseInput({
        nowLocalMinutes: 23 * 60,
        tasks: [task("t1", "Too late", 30, "2024-03-10T08:00:00.000Z")],
      }),
    );

    expect(result.blocks.filter((block) => block.type === "task")).toHaveLength(
      0,
    );
    expect(result.unscheduled).toEqual([
      {
        taskId: "t1",
        title: "Too late",
        reason: "no_time_left",
      },
    ]);
  });

  it("clamps the sleep target to 23:59 for a late wake and omits a zero-length sleep block", () => {
    const result = buildSchedule(
      baseInput({
        wakeTimeMinutes: 10 * 60,
        sleepDurationMinutes: 6 * 60,
      }),
    );

    expect(result.sleepTargetMinutes).toBe(END_OF_DAY_MINUTES);
    expect(result.sleepTargetClamped).toBe(true);
    expect(result.blocks.some((block) => block.type === "sleep")).toBe(false);
  });

  it("returns fixed blocks and sleep when there are zero pending tasks", () => {
    const result = buildSchedule(
      baseInput({
        fixedItems: [
          fixed("meal-1", "Breakfast", "meal", 8 * 60, 8 * 60 + 45),
        ],
        tasks: [],
      }),
    );

    expect(result.blocks.filter((block) => block.type === "meal")).toHaveLength(
      1,
    );
    expect(result.blocks.filter((block) => block.type === "task")).toHaveLength(
      0,
    );
    expect(result.unscheduled).toEqual([]);
  });

  it("is deterministic for the same input", () => {
    const input = baseInput({
      fixedItems: [
        fixed("meal-1", "Breakfast", "meal", 8 * 60, 8 * 60 + 45),
      ],
      tasks: [
        task("t2", "Second", 30, "2024-03-10T09:00:00.000Z"),
        task("t1", "First", 30, "2024-03-10T08:00:00.000Z"),
      ],
    });

    expect(buildSchedule(input)).toEqual(buildSchedule(input));
  });

  it("documents DST behavior as pure wall-clock minutes without timezone math", () => {
    const springForwardDay = buildSchedule(
      baseInput({
        wakeTimeMinutes: 8 * 60,
        fixedItems: [
          fixed(
            "dst-event",
            "Morning block",
            "calendar_event",
            9 * 60 + 30,
            10 * 60 + 30,
          ),
        ],
        tasks: [
          task("t1", "After event", 30, "2024-03-10T08:00:00.000Z"),
        ],
      }),
    );

    const taskBlock = springForwardDay.blocks.find(
      (block) => block.type === "task",
    );
    const eventBlock = springForwardDay.blocks.find(
      (block) => block.sourceId === "dst-event",
    );
    expect(taskBlock).toBeDefined();
    expect(eventBlock).toBeDefined();
    expect(
      taskBlock!.startMinutes >= eventBlock!.endMinutes ||
        taskBlock!.endMinutes <= eventBlock!.startMinutes,
    ).toBe(true);
  });
});
