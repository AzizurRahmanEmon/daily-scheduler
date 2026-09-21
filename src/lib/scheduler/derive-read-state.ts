import { detectFixedConflicts } from "./free-windows";
import type { BuildScheduleOutput, SchedulerFixedItem, SchedulerTask } from "./types";

export function deriveUnscheduledTasks(
  pendingTasks: SchedulerTask[],
  blocks: BuildScheduleOutput["blocks"],
): BuildScheduleOutput["unscheduled"] {
  const scheduledTaskIds = new Set(
    blocks
      .filter((block) => block.type === "task" && block.sourceId)
      .map((block) => block.sourceId as string),
  );

  return pendingTasks
    .filter((task) => !scheduledTaskIds.has(task.id))
    .map((task) => ({
      taskId: task.id,
      title: task.title,
      reason: "no_window_long_enough" as const,
    }));
}

export function deriveFixedConflicts(fixedItems: SchedulerFixedItem[]) {
  return detectFixedConflicts(fixedItems);
}
