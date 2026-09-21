import { computeDaySummary } from "@/lib/day-summary/compute-day-summary";
import { computeIncludedCalendarStats } from "./calendar-busy-minutes";
import type { CalendarEventForJournal } from "./calendar-busy-minutes";
import { formatJournalTimeLabel } from "./format-labels";
import type { GenerateJournalInput, JournalStats } from "./types";

export type AssembleJournalLog = {
  date: string;
  timezone: string;
  wakeTime: string | null;
  sleepTime: string | null;
  sleepTimeActual: string | null;
  dayNotes: string | null;
};

export type AssembleJournalTask = {
  id: string;
  title: string;
  status: "pending" | "complete" | "partial" | "incomplete";
  notes: string | null;
  estimatedMinutes: number;
};

export function assembleJournalInput(
  log: AssembleJournalLog,
  tasks: AssembleJournalTask[],
  calendarEvents: CalendarEventForJournal[],
): GenerateJournalInput {
  const summary = computeDaySummary(tasks);
  const calendarStats = computeIncludedCalendarStats(
    calendarEvents,
    log.date,
    log.timezone,
  );

  return {
    logDate: log.date,
    timezone: log.timezone,
    wakeTime: log.wakeTime,
    sleepTimeTarget: log.sleepTime,
    sleepTimeActual: log.sleepTimeActual,
    dayNotes: log.dayNotes,
    summary,
    tasks,
    calendarEventCount: calendarStats.eventCount,
    calendarBusyMinutes: calendarStats.busyMinutes,
  };
}

export function computeJournalStats(input: GenerateJournalInput): JournalStats {
  const tasksCompleteLabel =
    input.summary.total === 0
      ? "0 tasks"
      : `${input.summary.completed}/${input.summary.total} complete`;

  return {
    tasksCompleteLabel,
    wakeTimeLabel: input.wakeTime
      ? formatJournalTimeLabel(input.wakeTime)
      : null,
    calendarLabel:
      input.calendarEventCount > 0
        ? `${input.calendarEventCount} event${input.calendarEventCount === 1 ? "" : "s"}, ${input.calendarBusyMinutes} min`
        : null,
  };
}
