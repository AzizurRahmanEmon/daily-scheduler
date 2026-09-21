import type { LogDayWindow } from "./day-window";
import type { GoogleCalendarEvent, MappedCalendarEvent } from "./types";

export function isDeclinedBySelf(event: GoogleCalendarEvent): boolean {
  const selfAttendee = event.attendees?.find((attendee) => attendee.self === true);
  return selfAttendee?.responseStatus === "declined";
}

export function shouldSkipGoogleEvent(event: GoogleCalendarEvent): boolean {
  if (event.status === "cancelled") {
    return true;
  }
  if (event.eventType === "workingLocation") {
    return true;
  }
  if (isDeclinedBySelf(event)) {
    return true;
  }
  return false;
}

export function allDayOverlapsLogDate(
  event: GoogleCalendarEvent,
  logDate: string,
): boolean {
  const startDate = event.start?.date;
  const endDate = event.end?.date;
  if (!startDate || !endDate) {
    return false;
  }
  return startDate <= logDate && endDate > logDate;
}

export function clipInstantToWindow(
  instant: Date,
  window: LogDayWindow,
): Date {
  if (instant < window.timeMin) {
    return window.timeMin;
  }
  if (instant > window.timeMax) {
    return window.timeMax;
  }
  return instant;
}

export function mapTimedEvent(
  event: GoogleCalendarEvent,
  window: LogDayWindow,
): MappedCalendarEvent | null {
  if (!event.id || !event.start?.dateTime || !event.end?.dateTime) {
    return null;
  }

  const rawStart = new Date(event.start.dateTime);
  const rawEnd = new Date(event.end.dateTime);

  if (rawEnd <= window.timeMin || rawStart >= window.timeMax) {
    return null;
  }

  const startsAt = clipInstantToWindow(rawStart, window);
  const endsAt = clipInstantToWindow(rawEnd, window);

  if (startsAt >= endsAt) {
    return null;
  }

  return {
    googleEventId: event.id,
    title: event.summary?.trim() || "(No title)",
    startsAt,
    endsAt,
    allDay: false,
  };
}

export function mapAllDayEvent(
  event: GoogleCalendarEvent,
  logDate: string,
): MappedCalendarEvent | null {
  if (!event.id || !allDayOverlapsLogDate(event, logDate)) {
    return null;
  }

  return {
    googleEventId: event.id,
    title: event.summary?.trim() || "(No title)",
    startsAt: null,
    endsAt: null,
    allDay: true,
  };
}

export function mapGoogleCalendarEvent(
  event: GoogleCalendarEvent,
  logDate: string,
  window: LogDayWindow,
): MappedCalendarEvent | null {
  if (shouldSkipGoogleEvent(event) || !event.id) {
    return null;
  }

  if (event.start?.date) {
    return mapAllDayEvent(event, logDate);
  }

  return mapTimedEvent(event, window);
}

export function mapGoogleCalendarEvents(
  events: GoogleCalendarEvent[],
  logDate: string,
  window: LogDayWindow,
): MappedCalendarEvent[] {
  const mapped: MappedCalendarEvent[] = [];

  for (const event of events) {
    const result = mapGoogleCalendarEvent(event, logDate, window);
    if (result) {
      mapped.push(result);
    }
  }

  return mapped;
}
