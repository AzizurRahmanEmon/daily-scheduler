import { describe, expect, it } from "vitest";
import { assembleScheduleInput } from "@/lib/scheduler/assemble-input";
import { buildSchedule } from "@/lib/scheduler/build-schedule";
import { mapScheduleBlocksToRows } from "@/lib/scheduler/persist";
import { getReplaceScheduleBlockStatements } from "./schedule-blocks";

describe("getReplaceScheduleBlockStatements", () => {
  const userId = "user-123";
  const logId = "log-456";
  const now = new Date("2024-03-10T12:00:00.000Z");

  it("uses delete and update only when the scheduler returns zero blocks", () => {
    const assembled = assembleScheduleInput({
      wakeTime: "10:00:00",
      sleepDurationMinutes: 6 * 60,
      logDate: "2024-03-10",
      timezone: "America/New_York",
      now,
      plannedItems: [],
      calendarEvents: [],
      pendingTasks: [],
    });

    const rows = mapScheduleBlocksToRows(buildSchedule(assembled.input).blocks);
    expect(rows).toEqual([]);

    const statements = getReplaceScheduleBlockStatements(
      userId,
      logId,
      rows,
      "23:59:00",
      "hash-empty",
      now,
    );

    expect(statements).toHaveLength(2);
  });

  it("includes insert statements when blocks are present", () => {
    const rows = [
      {
        type: "task" as const,
        source: "ai_generated" as const,
        title: "Focus",
        startTime: "11:00:00",
        endTime: "11:30:00",
        sourceId: "task-1",
      },
    ];

    const statements = getReplaceScheduleBlockStatements(
      userId,
      logId,
      rows,
      "23:00:00",
      "hash-with-blocks",
      now,
    );

    expect(statements).toHaveLength(3);
  });

  it("scopes delete to the authenticated user's log id", () => {
    const statements = getReplaceScheduleBlockStatements(
      userId,
      logId,
      [],
      "23:59:00",
      "hash-scope",
      now,
    );

    const deleteSql = statements[0]!.toSQL();
    expect(deleteSql.sql).toContain("daily_log_id");
    expect(deleteSql.sql).toContain("user_id");
    expect(deleteSql.params).toContain(logId);
    expect(deleteSql.params).toContain(userId);
  });
});
