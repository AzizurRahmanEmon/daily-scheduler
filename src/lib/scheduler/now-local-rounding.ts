import { END_OF_DAY_MINUTES, NOW_LOCAL_ROUND_MINUTES } from "./constants";

/** Round local minutes up to the next scheduling grid boundary. */
export function roundUpNowLocalMinutes(
  minutes: number,
  boundaryMinutes: number = NOW_LOCAL_ROUND_MINUTES,
): number {
  const rounded = Math.ceil(minutes / boundaryMinutes) * boundaryMinutes;
  return Math.min(rounded, END_OF_DAY_MINUTES);
}
