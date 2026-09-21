import type {
  ScheduleBlock,
  SchedulerTask,
  UnscheduledReason,
  UnscheduledTask,
} from "./types";
import type { MinuteInterval } from "./free-windows";

type MutableWindow = MinuteInterval & { hasTask: boolean };

export type TaskPlacementResult = {
  taskBlocks: ScheduleBlock[];
  unscheduled: UnscheduledTask[];
};

function minimumWindowSize(
  taskMinutes: number,
  bufferMinutes: number,
  hasTaskInWindow: boolean,
): number {
  return hasTaskInWindow
    ? taskMinutes + bufferMinutes
    : taskMinutes + bufferMinutes * 2;
}

function sortTasksByCreationOrder(tasks: SchedulerTask[]): SchedulerTask[] {
  return [...tasks].sort((a, b) => {
    const aCreated = new Date(a.createdAt).getTime();
    const bCreated = new Date(b.createdAt).getTime();
    if (aCreated !== bCreated) {
      return aCreated - bCreated;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * First-fit task placement by creation order (oldest first).
 * Swap this function to try another strategy later.
 */
export function firstFitTasksByCreationOrder(
  tasks: SchedulerTask[],
  freeWindows: MinuteInterval[],
  bufferMinutes: number,
  hasPlanningTime: boolean,
): TaskPlacementResult {
  const taskBlocks: ScheduleBlock[] = [];
  const unscheduled: UnscheduledTask[] = [];
  const mutableWindows: MutableWindow[] = freeWindows.map((window) => ({
    ...window,
    hasTask: false,
  }));

  const defaultReason: UnscheduledReason = hasPlanningTime
    ? "no_window_long_enough"
    : "no_time_left";

  for (const task of sortTasksByCreationOrder(tasks)) {
    let placed = false;

    for (const window of mutableWindows) {
      const minSize = minimumWindowSize(
        task.estimatedMinutes,
        bufferMinutes,
        window.hasTask,
      );
      if (window.endMinutes - window.startMinutes < minSize) {
        continue;
      }

      const startMinutes = window.hasTask
        ? window.startMinutes
        : window.startMinutes + bufferMinutes;
      const endMinutes = startMinutes + task.estimatedMinutes;

      if (endMinutes + bufferMinutes > window.endMinutes) {
        continue;
      }

      taskBlocks.push({
        type: "task",
        title: task.title,
        startMinutes,
        endMinutes,
        sourceId: task.id,
      });

      window.hasTask = true;
      window.startMinutes = endMinutes + bufferMinutes;
      placed = true;
      break;
    }

    if (!placed) {
      unscheduled.push({
        taskId: task.id,
        title: task.title,
        reason: defaultReason,
      });
    }
  }

  return { taskBlocks, unscheduled };
}
