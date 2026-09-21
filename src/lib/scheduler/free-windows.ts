import { intervalsOverlap } from "@/lib/planned-items/overlap";
import type { FixedConflict, SchedulerFixedItem } from "./types";

export type MinuteInterval = {
  startMinutes: number;
  endMinutes: number;
};

export function detectFixedConflicts(
  fixedItems: SchedulerFixedItem[],
): FixedConflict[] {
  const conflicts: FixedConflict[] = [];

  for (let i = 0; i < fixedItems.length; i++) {
    for (let j = i + 1; j < fixedItems.length; j++) {
      const a = fixedItems[i]!;
      const b = fixedItems[j]!;

      if (
        intervalsOverlap(
          { startMinutes: a.startMinutes, endMinutes: a.endMinutes },
          { startMinutes: b.startMinutes, endMinutes: b.endMinutes },
        )
      ) {
        conflicts.push({
          itemAId: a.id,
          itemBId: b.id,
          itemATitle: a.title,
          itemBTitle: b.title,
        });
      }
    }
  }

  return conflicts;
}

export function mergeBusyIntervals(
  intervals: MinuteInterval[],
): MinuteInterval[] {
  if (intervals.length === 0) {
    return [];
  }

  const sorted = [...intervals].sort(
    (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes,
  );
  const merged: MinuteInterval[] = [{ ...sorted[0]! }];

  for (let index = 1; index < sorted.length; index++) {
    const current = sorted[index]!;
    const last = merged[merged.length - 1]!;

    if (current.startMinutes <= last.endMinutes) {
      last.endMinutes = Math.max(last.endMinutes, current.endMinutes);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

export function computeFreeWindows(
  planningStartMinutes: number,
  planningEndMinutes: number,
  busyIntervals: MinuteInterval[],
): MinuteInterval[] {
  if (planningStartMinutes >= planningEndMinutes) {
    return [];
  }

  const mergedBusy = mergeBusyIntervals(busyIntervals);
  const windows: MinuteInterval[] = [];
  let cursor = planningStartMinutes;

  for (const busy of mergedBusy) {
    if (busy.endMinutes <= planningStartMinutes) {
      continue;
    }
    if (busy.startMinutes >= planningEndMinutes) {
      break;
    }

    const busyStart = Math.max(busy.startMinutes, planningStartMinutes);
    const busyEnd = Math.min(busy.endMinutes, planningEndMinutes);

    if (busyStart > cursor) {
      windows.push({ startMinutes: cursor, endMinutes: busyStart });
    }

    cursor = Math.max(cursor, busyEnd);
    if (cursor >= planningEndMinutes) {
      return windows;
    }
  }

  if (cursor < planningEndMinutes) {
    windows.push({ startMinutes: cursor, endMinutes: planningEndMinutes });
  }

  return windows;
}
