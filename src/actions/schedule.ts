"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCalendarEventsForLog } from "@/db/queries/calendar-events";
import { getUserPreferences } from "@/db/queries/daily-logs";
import { getPlannedItemsForLog } from "@/db/queries/planned-items";
import { replaceScheduleBlocksForLog } from "@/db/queries/schedule-blocks";
import { getTasksForLog } from "@/db/queries/tasks";
import { requireWakeTime } from "@/lib/guards";
import { assembleScheduleInput } from "@/lib/scheduler/assemble-input";
import { buildSchedule } from "@/lib/scheduler/build-schedule";
import { mapScheduleBlocksToRows } from "@/lib/scheduler/persist";
import { minutesToTime } from "@/lib/time-of-day";

export type ScheduleActionResult =
  | { ok: true }
  | { ok: false; error: string };

const generateScheduleSchema = z.object({
  nowIso: z.string().datetime().optional(),
});

function logClosedError(): ScheduleActionResult {
  return { ok: false, error: "This day is closed and cannot be edited." };
}

export async function generateSchedule(
  input: unknown = {},
): Promise<ScheduleActionResult> {
  const { user, log } = await requireWakeTime();

  if (log.status === "closed") {
    return logClosedError();
  }

  if (!log.wakeTime) {
    return { ok: false, error: "Wake time is required before generating." };
  }

  const parsed = generateScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const now = parsed.data.nowIso ? new Date(parsed.data.nowIso) : new Date();
  const preferences = await getUserPreferences(user.id);

  const [plannedItems, calendarEvents, tasks] = await Promise.all([
    getPlannedItemsForLog(user.id, log.id),
    getCalendarEventsForLog(user.id, log.id),
    getTasksForLog(user.id, log.id),
  ]);

  const pendingTasks = tasks.filter((task) => task.status === "pending");

  const assembled = assembleScheduleInput({
    wakeTime: log.wakeTime,
    sleepDurationMinutes: preferences.defaultSleepDuration,
    logDate: log.date,
    timezone: log.timezone,
    now,
    plannedItems,
    calendarEvents,
    pendingTasks,
  });

  const result = buildSchedule(assembled.input);
  const rows = mapScheduleBlocksToRows(result.blocks);
  const sleepTargetTime = `${minutesToTime(result.sleepTargetMinutes)}:00`;

  await replaceScheduleBlocksForLog(
    user.id,
    log.id,
    rows,
    sleepTargetTime,
    assembled.inputHash,
  );

  revalidatePath("/schedule");
  return { ok: true };
}
