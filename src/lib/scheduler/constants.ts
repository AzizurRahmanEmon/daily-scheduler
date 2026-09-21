/** Buffer between consecutive task blocks and away from free-window edges. */
export const TASK_BUFFER_MINUTES = 5;

/** Round assembled nowLocal up to this many minutes before scheduling. */
export const NOW_LOCAL_ROUND_MINUTES = 15;

/** Latest minute-of-day representable without crossing midnight (23:59). */
export const END_OF_DAY_MINUTES = 23 * 60 + 59;
