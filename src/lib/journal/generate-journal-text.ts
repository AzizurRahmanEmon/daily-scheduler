import type { GenerateJournalInput, JournalTaskInput } from "./types";
import { formatJournalDateHeader, formatJournalTimeLabel } from "./format-labels";

const STATUS_ORDER: JournalTaskInput["status"][] = [
  "complete",
  "partial",
  "incomplete",
  "pending",
];

const STATUS_HEADINGS: Record<JournalTaskInput["status"], string> = {
  complete: "Completed",
  partial: "Partially completed",
  incomplete: "Not done",
  pending: "Still pending",
};

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function groupTasksByStatus(
  tasks: JournalTaskInput[],
): Map<JournalTaskInput["status"], JournalTaskInput[]> {
  const groups = new Map<JournalTaskInput["status"], JournalTaskInput[]>();

  for (const status of STATUS_ORDER) {
    groups.set(status, []);
  }

  for (const task of tasks) {
    groups.get(task.status)?.push(task);
  }

  return groups;
}

function renderTaskLine(task: JournalTaskInput): string {
  const minutes =
    task.estimatedMinutes > 0 ? ` (${task.estimatedMinutes} min planned)` : "";
  const note = task.notes?.trim()
    ? `\n  Note: ${task.notes.trim()}`
    : "";

  return `- ${task.title}${minutes}${note}`;
}

export function generateJournalText(input: GenerateJournalInput): string {
  const paragraphs: string[] = [];
  const dateHeader = formatJournalDateHeader(input.logDate, input.timezone);

  paragraphs.push(`Journal for ${dateHeader}.`);

  if (input.wakeTime) {
    paragraphs.push(`Wake time was ${formatJournalTimeLabel(input.wakeTime)}.`);
  }

  if (input.summary.total === 0) {
    paragraphs.push("No tasks were recorded for this day.");
  } else {
    paragraphs.push(
      `Tasks: ${input.summary.completed} of ${input.summary.total} marked complete (${formatPercent(input.summary.completionRatio)}).`,
    );
    paragraphs.push(
      `Estimated time: ${input.summary.completedMinutes} of ${input.summary.totalEstimatedMinutes} minutes associated with completed tasks.`,
    );
  }

  if (input.calendarEventCount > 0) {
    paragraphs.push(
      `Calendar: ${input.calendarEventCount} included timed event${input.calendarEventCount === 1 ? "" : "s"}, totaling ${input.calendarBusyMinutes} minutes.`,
    );
  }

  if (input.sleepTimeTarget || input.sleepTimeActual) {
    const parts: string[] = [];
    if (input.sleepTimeTarget) {
      parts.push(
        `target bedtime ${formatJournalTimeLabel(input.sleepTimeTarget)}`,
      );
    }
    if (input.sleepTimeActual) {
      parts.push(
        `actual bedtime ${formatJournalTimeLabel(input.sleepTimeActual)}`,
      );
    }
    paragraphs.push(`Sleep: ${parts.join("; ")}.`);
  }

  if (input.dayNotes?.trim()) {
    paragraphs.push(`Day notes: ${input.dayNotes.trim()}`);
  }

  const groups = groupTasksByStatus(input.tasks);
  const taskSections: string[] = [];

  for (const status of STATUS_ORDER) {
    const tasks = groups.get(status) ?? [];
    if (tasks.length === 0) {
      continue;
    }

    const lines = tasks.map(renderTaskLine);
    taskSections.push(`${STATUS_HEADINGS[status]}:\n${lines.join("\n")}`);
  }

  if (taskSections.length > 0) {
    paragraphs.push(taskSections.join("\n\n"));
  }

  return paragraphs.join("\n\n");
}
