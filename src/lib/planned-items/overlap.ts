import { timeToMinutes } from "@/lib/time-of-day";

export type OverlapInterval = {
  id: string;
  title: string;
  source: "planned" | "calendar";
  startMinutes: number;
  endMinutes: number;
};

export type OverlapWarning = {
  itemId: string;
  itemTitle: string;
  conflictsWith: {
    id: string;
    title: string;
    source: "planned" | "calendar";
  };
};

/** True when intervals share time; adjacent (end === start) is not overlap. */
export function intervalsOverlap(
  a: Pick<OverlapInterval, "startMinutes" | "endMinutes">,
  b: Pick<OverlapInterval, "startMinutes" | "endMinutes">,
): boolean {
  return (
    a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes
  );
}

export function detectOverlapWarnings(
  planned: OverlapInterval[],
  calendar: OverlapInterval[],
): OverlapWarning[] {
  const warnings: OverlapWarning[] = [];
  const seen = new Set<string>();

  for (const item of planned) {
    const others = [
      ...planned.filter((candidate) => candidate.id !== item.id),
      ...calendar,
    ];

    for (const other of others) {
      if (!intervalsOverlap(item, other)) {
        continue;
      }

      const key = [item.id, other.id].sort().join(":");
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      warnings.push({
        itemId: item.id,
        itemTitle: item.title,
        conflictsWith: {
          id: other.id,
          title: other.title,
          source: other.source,
        },
      });
    }
  }

  return warnings;
}

export function calendarEventToOverlapInterval(event: {
  id: string;
  title: string;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  allDay: boolean;
  timezone: string;
}): OverlapInterval | null {
  if (event.allDay || !event.startsAt || !event.endsAt) {
    return null;
  }

  const startsAt =
    event.startsAt instanceof Date
      ? event.startsAt
      : new Date(event.startsAt);
  const endsAt =
    event.endsAt instanceof Date ? event.endsAt : new Date(event.endsAt);

  const startMinutes = zonedTimeToMinutes(startsAt, event.timezone);
  const endMinutes = zonedTimeToMinutes(endsAt, event.timezone);

  if (endMinutes <= startMinutes) {
    return null;
  }

  return {
    id: event.id,
    title: event.title,
    source: "calendar",
    startMinutes,
    endMinutes,
  };
}

function zonedTimeToMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );

  return hour * 60 + minute;
}

export function plannedItemToOverlapInterval(item: {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
}): OverlapInterval {
  return {
    id: item.id,
    title: item.title,
    source: "planned",
    startMinutes: timeToMinutes(item.startTime),
    endMinutes: timeToMinutes(item.endTime),
  };
}
