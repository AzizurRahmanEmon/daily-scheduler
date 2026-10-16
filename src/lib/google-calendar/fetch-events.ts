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
  readonly status: number;
  readonly googleMessage?: string;

  constructor(
    status: number,
    googleMessage?: string,
    message = "Google Calendar request failed",
  ) {
    super(message);
    this.name = "GoogleCalendarFetchError";
    this.status = status;
    this.googleMessage = googleMessage;
  }
}

type FetchEventsOptions = {
  accessToken: string;
  window: LogDayWindow;
};

/** Lightweight check that the token can call the Calendar API (not just OAuth). */
export async function probeGoogleCalendarApi(
  accessToken: string,
): Promise<"ok" | "auth_error" | "forbidden" | "failed"> {
  const url = new URL(CALENDAR_EVENTS_URL);
  const now = new Date();
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("timeMin", now.toISOString());
  url.searchParams.set(
    "timeMax",
    new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  );

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (response.status === 401) {
      return "auth_error";
    }

    if (response.status === 403) {
      return "forbidden";
    }

    if (!response.ok) {
      return "failed";
    }

    return "ok";
  } catch {
    return "failed";
  }
}

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
      cache: "no-store",
    });

    if (response.status === 401) {
      throw new GoogleCalendarAuthError();
    }

    if (!response.ok) {
      let googleMessage: string | undefined;
      try {
        const errorBody = (await response.json()) as {
          error?: { message?: string };
        };
        googleMessage = errorBody.error?.message;
      } catch {
        // ignore non-JSON error bodies
      }
      throw new GoogleCalendarFetchError(
        response.status,
        googleMessage,
        googleMessage ?? `Google Calendar API returned ${response.status}`,
      );
    }

    const payload = (await response.json()) as GoogleCalendarListResponse;
    events.push(...(payload.items ?? []));
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return events;
}
