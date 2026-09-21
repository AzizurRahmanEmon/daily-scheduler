import type { LogDayWindow } from "./day-window";
import type { GoogleCalendarEvent, GoogleCalendarListResponse } from "./types";

const CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export class GoogleCalendarAuthError extends Error {
  constructor(message = "Google Calendar authorization failed") {
    super(message);
    this.name = "GoogleCalendarAuthError";
  }
}

export class GoogleCalendarFetchError extends Error {
  constructor(message = "Google Calendar request failed") {
    super(message);
    this.name = "GoogleCalendarFetchError";
  }
}

type FetchEventsOptions = {
  accessToken: string;
  window: LogDayWindow;
};

export async function fetchAllCalendarEvents({
  accessToken,
  window,
}: FetchEventsOptions): Promise<GoogleCalendarEvent[]> {
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(CALENDAR_EVENTS_URL);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("timeMin", window.timeMin.toISOString());
    url.searchParams.set("timeMax", window.timeMax.toISOString());
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      throw new GoogleCalendarAuthError();
    }

    if (!response.ok) {
      throw new GoogleCalendarFetchError(
        `Google Calendar API returned ${response.status}`,
      );
    }

    const payload = (await response.json()) as GoogleCalendarListResponse;
    events.push(...(payload.items ?? []));
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return events;
}
