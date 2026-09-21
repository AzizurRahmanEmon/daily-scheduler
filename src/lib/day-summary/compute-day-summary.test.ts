import { describe, expect, it } from "vitest";
import { computeDaySummary } from "./compute-day-summary";
import type { DaySummaryTask } from "./types";

function task(
  status: DaySummaryTask["status"],
  estimatedMinutes: number,
): DaySummaryTask {
  return {
    id: "task-1",
    title: "Sample",
    estimatedMinutes,
    status,
  };
}

describe("computeDaySummary", () => {
  it("returns zeros for an empty day", () => {
    expect(computeDaySummary([])).toEqual({
      total: 0,
      completed: 0,
      partial: 0,
      pending: 0,
      incomplete: 0,
      completionRatio: 0,
      totalEstimatedMinutes: 0,
      completedMinutes: 0,
    });
  });

  it("counts all complete tasks", () => {
    const summary = computeDaySummary([
      task("complete", 30),
      task("complete", 45),
    ]);

    expect(summary).toMatchObject({
      total: 2,
      completed: 2,
      partial: 0,
      pending: 0,
      incomplete: 0,
      completionRatio: 1,
      totalEstimatedMinutes: 75,
      completedMinutes: 75,
    });
  });

  it("handles mixed statuses", () => {
    const summary = computeDaySummary([
      { ...task("complete", 30), id: "a" },
      { ...task("partial", 20), id: "b" },
      { ...task("pending", 15), id: "c" },
      { ...task("incomplete", 10), id: "d" },
    ]);

    expect(summary).toMatchObject({
      total: 4,
      completed: 1,
      partial: 1,
      pending: 1,
      incomplete: 1,
      completionRatio: 0.25,
      totalEstimatedMinutes: 75,
      completedMinutes: 30,
    });
  });

  it("handles zero estimated minutes without dividing by zero", () => {
    const summary = computeDaySummary([
      { ...task("complete", 0), id: "a" },
      { ...task("pending", 0), id: "b" },
    ]);

    expect(summary.completionRatio).toBe(0.5);
    expect(summary.totalEstimatedMinutes).toBe(0);
    expect(summary.completedMinutes).toBe(0);
  });
});
