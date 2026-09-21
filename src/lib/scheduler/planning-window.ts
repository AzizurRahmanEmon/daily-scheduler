import { MINUTES_PER_DAY } from "@/lib/time-of-day";
import { END_OF_DAY_MINUTES } from "./constants";

export type PlanningWindow = {
  planningStartMinutes: number;
  planningEndMinutes: number;
  sleepTargetMinutes: number;
  sleepTargetClamped: boolean;
  hasPlanningTime: boolean;
};

export function computePlanningWindow(
  wakeTimeMinutes: number,
  sleepDurationMinutes: number,
  nowLocalMinutes: number | null,
): PlanningWindow {
  const rawSleepTarget =
    wakeTimeMinutes + (MINUTES_PER_DAY - sleepDurationMinutes);
  const sleepTargetClamped = rawSleepTarget > END_OF_DAY_MINUTES;
  const sleepTargetMinutes = Math.min(rawSleepTarget, END_OF_DAY_MINUTES);

  const planningStartMinutes =
    nowLocalMinutes === null
      ? wakeTimeMinutes
      : Math.max(wakeTimeMinutes, nowLocalMinutes);

  const planningEndMinutes = sleepTargetMinutes;
  const hasPlanningTime = planningStartMinutes < planningEndMinutes;

  return {
    planningStartMinutes,
    planningEndMinutes,
    sleepTargetMinutes,
    sleepTargetClamped,
    hasPlanningTime,
  };
}
