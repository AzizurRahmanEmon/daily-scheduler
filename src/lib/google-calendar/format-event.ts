type EventTimeInput = {
  allDay: boolean;
  startsAt: string | Date | null;
  endsAt: string | Date | null;
};

function toDate(value: string | Date | null): Date | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "shortOffset",
  }).format(date);
}

export function formatEventTimeRange(
  event: EventTimeInput,
  timeZone: string,
): string {
  if (event.allDay) {
    return "All day";
  }

  const startsAt = toDate(event.startsAt);
  const endsAt = toDate(event.endsAt);

  if (!startsAt || !endsAt) {
    return "Time unavailable";
  }

  return `${formatTime(startsAt, timeZone)} – ${formatTime(endsAt, timeZone)}`;
}

export function formatLastSynced(
  syncedAt: string | Date | null,
  timeZone: string,
): string | null {
  if (!syncedAt) {
    return null;
  }

  const date = syncedAt instanceof Date ? syncedAt : new Date(syncedAt);

  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
    timeZoneName: "shortOffset",
  }).format(date);
}
