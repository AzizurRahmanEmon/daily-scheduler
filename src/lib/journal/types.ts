import type { DaySummary } from "@/lib/day-summary/types";

export type JournalTaskInput = {
  title: string;
  status: "pending" | "complete" | "partial" | "incomplete";
  notes: string | null;
  estimatedMinutes: number;
};

export type GenerateJournalInput = {
  logDate: string;
  timezone: string;
  wakeTime: string | null;
  sleepTimeTarget: string | null;
  sleepTimeActual: string | null;
  dayNotes: string | null;
  summary: DaySummary;
  tasks: JournalTaskInput[];
  calendarEventCount: number;
  calendarBusyMinutes: number;
};

export type JournalStats = {
  tasksCompleteLabel: string;
  wakeTimeLabel: string | null;
  calendarLabel: string | null;
};
