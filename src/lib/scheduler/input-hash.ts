import { createHash } from "node:crypto";

export type ScheduleHashPayload = {
  wakeTime: string;
  sleepDurationMinutes: number;
  tasks: Array<{
    id: string;
    title: string;
    estimatedMinutes: number;
    createdAt: string;
  }>;
  plannedItems: Array<{
    id: string;
    kind: "meal" | "appointment";
    title: string;
    startTime: string;
    endTime: string;
  }>;
  calendarEvents: Array<{
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
  }>;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }

  return value;
}

export function computeScheduleInputHash(payload: ScheduleHashPayload): string {
  const normalized = stableValue({
    wakeTime: payload.wakeTime,
    sleepDurationMinutes: payload.sleepDurationMinutes,
    tasks: [...payload.tasks].sort((a, b) => a.id.localeCompare(b.id)),
    plannedItems: [...payload.plannedItems].sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
    calendarEvents: [...payload.calendarEvents].sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
  });

  return createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}
