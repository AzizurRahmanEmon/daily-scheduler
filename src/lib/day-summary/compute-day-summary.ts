import type { DaySummary, DaySummaryTask } from "./types";

export function computeDaySummary(tasks: DaySummaryTask[]): DaySummary {
  let completed = 0;
  let partial = 0;
  let pending = 0;
  let incomplete = 0;
  let totalEstimatedMinutes = 0;
  let completedMinutes = 0;

  for (const task of tasks) {
    totalEstimatedMinutes += task.estimatedMinutes;

    switch (task.status) {
      case "complete":
        completed += 1;
        completedMinutes += task.estimatedMinutes;
        break;
      case "partial":
        partial += 1;
        break;
      case "pending":
        pending += 1;
        break;
      case "incomplete":
        incomplete += 1;
        break;
    }
  }

  const total = tasks.length;
  const completionRatio = total === 0 ? 0 : completed / total;

  return {
    total,
    completed,
    partial,
    pending,
    incomplete,
    completionRatio,
    totalEstimatedMinutes,
    completedMinutes,
  };
}
