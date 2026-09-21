import { formatTimeForInput, timeToMinutes } from "@/lib/time-of-day";
import { getCalendarDateInTimezone, getLocalMinutesInTimezone } from "@/lib/date";
import { convertTimedCalendarEventToLocalMinutes } from "./calendar-to-local";
import { computeScheduleInputHash, type ScheduleHashPayload } from "./input-hash";
import { roundUpNowLocalMinutes } from "./now-local-rounding";
import type { BuildScheduleInput, SchedulerFixedItem, SchedulerTask } from "./types";

export type PlannedItemInput = {
  id: string;
  kind: "meal" | "appointment";
  title: string;
  startTime: string;
  endTime: string;
};

export type PendingTaskInput = {
  id: string;
  title: string;
  estimatedMinutes: number;
  createdAt: Date | string;
};

export type CalendarEventInput = {
  id: string;
  title: string;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  allDay: boolean;
  included: boolean;
};

export type AssembleScheduleInputParams = {
  wakeTime: string;
  sleepDurationMinutes: number;
  logDate: string;
  timezone: string;
  now: Date;
  plannedItems: PlannedItemInput[];
  calendarEvents: CalendarEventInput[];
  pendingTasks: PendingTaskInput[];
};

export type AssembledSchedule = {
  input: BuildScheduleInput;
  hashPayload: ScheduleHashPayload;
  inputHash: string;
};

export function assembleScheduleInput(
  params: AssembleScheduleInputParams,
): AssembledSchedule {
  const isToday = getCalendarDateInTimezone(params.now, params.timezone) === params.logDate;
  const wakeTimeMinutes = timeToMinutes(formatTimeForInput(params.wakeTime));

  const plannedFixed: SchedulerFixedItem[] = params.plannedItems.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.kind,
    startMinutes: timeToMinutes(formatTimeForInput(item.startTime)),
    endMinutes: timeToMinutes(formatTimeForInput(item.endTime)),
  }));

  const calendarFixed = params.calendarEvents
    .map((event) =>
      convertTimedCalendarEventToLocalMinutes(
        {
          id: event.id,
          title: event.title,
          startsAt: event.startsAt ?? "",
          endsAt: event.endsAt ?? "",
          allDay: event.allDay,
          included: event.included,
        },
        params.logDate,
        params.timezone,
      ),
    )
    .filter((item): item is SchedulerFixedItem => Boolean(item));

  const tasks: SchedulerTask[] = params.pendingTasks.map((task) => ({
    id: task.id,
    title: task.title,
    estimatedMinutes: task.estimatedMinutes,
    createdAt: task.createdAt,
  }));

  const hashPayload: ScheduleHashPayload = {
    wakeTime: formatTimeForInput(params.wakeTime),
    sleepDurationMinutes: params.sleepDurationMinutes,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      estimatedMinutes: task.estimatedMinutes,
      createdAt: new Date(task.createdAt).toISOString(),
    })),
    plannedItems: params.plannedItems.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      startTime: formatTimeForInput(item.startTime),
      endTime: formatTimeForInput(item.endTime),
    })),
    calendarEvents: params.calendarEvents
      .filter((event) => !event.allDay && event.included && event.startsAt && event.endsAt)
      .map((event) => ({
        id: event.id,
        title: event.title,
        startsAt: new Date(event.startsAt!).toISOString(),
        endsAt: new Date(event.endsAt!).toISOString(),
      })),
  };

  return {
    input: {
      wakeTimeMinutes,
      sleepDurationMinutes: params.sleepDurationMinutes,
      nowLocalMinutes: isToday
        ? roundUpNowLocalMinutes(
            getLocalMinutesInTimezone(params.now, params.timezone),
          )
        : null,
      fixedItems: [...plannedFixed, ...calendarFixed],
      tasks,
    },
    hashPayload,
    inputHash: computeScheduleInputHash(hashPayload),
  };
}
