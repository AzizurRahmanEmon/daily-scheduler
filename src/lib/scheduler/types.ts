export type ScheduleBlockType =
  | "meal"
  | "appointment"
  | "calendar_event"
  | "task"
  | "sleep";

export type SchedulerFixedItem = {
  id: string;
  title: string;
  type: "meal" | "appointment" | "calendar_event";
  startMinutes: number;
  endMinutes: number;
};

export type SchedulerTask = {
  id: string;
  title: string;
  estimatedMinutes: number;
  createdAt: string | Date;
};

export type BuildScheduleInput = {
  /** Wake time as minutes since midnight in the log's timezone. */
  wakeTimeMinutes: number;
  sleepDurationMinutes: number;
  /** Local time-of-day now, or null when the log is not today. */
  nowLocalMinutes: number | null;
  fixedItems: SchedulerFixedItem[];
  tasks: SchedulerTask[];
  taskBufferMinutes?: number;
};

export type ScheduleBlock = {
  type: ScheduleBlockType;
  title: string;
  startMinutes: number;
  endMinutes: number;
  sourceId: string | null;
};

export type FixedConflict = {
  itemAId: string;
  itemBId: string;
  itemATitle: string;
  itemBTitle: string;
};

export type UnscheduledReason = "no_window_long_enough" | "no_time_left";

export type UnscheduledTask = {
  taskId: string;
  title: string;
  reason: UnscheduledReason;
};

export type BuildScheduleOutput = {
  blocks: ScheduleBlock[];
  unscheduled: UnscheduledTask[];
  fixedConflicts: FixedConflict[];
  sleepTargetMinutes: number;
  sleepTargetClamped: boolean;
};
