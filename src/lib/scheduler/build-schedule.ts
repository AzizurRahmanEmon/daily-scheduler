import { TASK_BUFFER_MINUTES, END_OF_DAY_MINUTES } from "./constants";
import {
  computeFreeWindows,
  detectFixedConflicts,
} from "./free-windows";
import { computePlanningWindow } from "./planning-window";
import { firstFitTasksByCreationOrder } from "./place-tasks";
import type {
  BuildScheduleInput,
  BuildScheduleOutput,
  ScheduleBlock,
  SchedulerFixedItem,
} from "./types";

function fixedItemToBlock(item: SchedulerFixedItem): ScheduleBlock {
  return {
    type: item.type,
    title: item.title,
    startMinutes: item.startMinutes,
    endMinutes: item.endMinutes,
    sourceId: item.id,
  };
}

function buildSleepBlock(sleepTargetMinutes: number): ScheduleBlock | null {
  if (sleepTargetMinutes >= END_OF_DAY_MINUTES) {
    return null;
  }

  return {
    type: "sleep",
    title: "Sleep",
    startMinutes: sleepTargetMinutes,
    endMinutes: END_OF_DAY_MINUTES,
    sourceId: null,
  };
}

function sortBlocks(blocks: ScheduleBlock[]): ScheduleBlock[] {
  return [...blocks].sort(
    (a, b) =>
      a.startMinutes - b.startMinutes ||
      a.endMinutes - b.endMinutes ||
      a.title.localeCompare(b.title) ||
      a.type.localeCompare(b.type),
  );
}

export function buildSchedule(input: BuildScheduleInput): BuildScheduleOutput {
  const bufferMinutes = input.taskBufferMinutes ?? TASK_BUFFER_MINUTES;
  const fixedConflicts = detectFixedConflicts(input.fixedItems);
  const planningWindow = computePlanningWindow(
    input.wakeTimeMinutes,
    input.sleepDurationMinutes,
    input.nowLocalMinutes,
  );

  const busyIntervals = input.fixedItems.map((item) => ({
    startMinutes: item.startMinutes,
    endMinutes: item.endMinutes,
  }));

  const freeWindows = computeFreeWindows(
    planningWindow.planningStartMinutes,
    planningWindow.planningEndMinutes,
    busyIntervals,
  );

  const { taskBlocks, unscheduled } = firstFitTasksByCreationOrder(
    input.tasks,
    freeWindows,
    bufferMinutes,
    planningWindow.hasPlanningTime,
  );

  const fixedBlocks = input.fixedItems.map(fixedItemToBlock);
  const sleepBlock = buildSleepBlock(planningWindow.sleepTargetMinutes);
  const blocks = sortBlocks([
    ...fixedBlocks,
    ...taskBlocks,
    ...(sleepBlock ? [sleepBlock] : []),
  ]);

  return {
    blocks,
    unscheduled,
    fixedConflicts,
    sleepTargetMinutes: planningWindow.sleepTargetMinutes,
    sleepTargetClamped: planningWindow.sleepTargetClamped,
  };
}
