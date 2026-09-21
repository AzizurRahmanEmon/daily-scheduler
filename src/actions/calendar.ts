"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  replaceCalendarEventsForLog,
  setCalendarEventIncluded,
} from "@/db/queries/calendar-events";
import {
  getGoogleAccessTokenForUser,
  getCalendarConnectionStatus,
} from "@/lib/calendar/connection";
import { getLogDayWindow } from "@/lib/google-calendar/day-window";
import {
  GoogleCalendarAuthError,
  GoogleCalendarFetchError,
  fetchAllCalendarEvents,
} from "@/lib/google-calendar/fetch-events";
import { mapGoogleCalendarEvents } from "@/lib/google-calendar/map-events";
import { requireWakeTime } from "@/lib/guards";

export type CalendarActionResult =
  | { ok: true }
  | { ok: false; error: string; code?: "not_connected" | "needs_reconnect" };

const setIncludedSchema = z.object({
  eventId: z.string().uuid("Invalid event"),
  included: z.boolean(),
});

function logClosedError(): CalendarActionResult {
  return { ok: false, error: "This day is closed and cannot be edited." };
}

export async function syncCalendar(): Promise<CalendarActionResult> {
  const { user, log } = await requireWakeTime();

  if (log.status === "closed") {
    return logClosedError();
  }

  const connectionStatus = await getCalendarConnectionStatus(user.id);
  if (connectionStatus === "not_connected") {
    return {
      ok: false,
      error: "Connect Google Calendar in Settings first.",
      code: "not_connected",
    };
  }

  try {
    const accessToken = await getGoogleAccessTokenForUser(user.id);
    const window = getLogDayWindow(log.date, log.timezone);
    const googleEvents = await fetchAllCalendarEvents({ accessToken, window });
    const mappedEvents = mapGoogleCalendarEvents(
      googleEvents,
      log.date,
      window,
    );

    await replaceCalendarEventsForLog(log.id, mappedEvents);
    revalidatePath("/calendar-review");
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    if (error instanceof GoogleCalendarAuthError) {
      revalidatePath("/calendar-review");
      revalidatePath("/settings");
      return {
        ok: false,
        error: "Google Calendar access expired. Reconnect in Settings.",
        code: "needs_reconnect",
      };
    }

    if (error instanceof GoogleCalendarFetchError) {
      return {
        ok: false,
        error: "Could not reach Google Calendar. Try again.",
      };
    }

    return { ok: false, error: "Calendar sync failed. Try again." };
  }
}

export async function setCalendarEventIncludedAction(
  input: unknown,
): Promise<CalendarActionResult> {
  const { user, log } = await requireWakeTime();

  if (log.status === "closed") {
    return logClosedError();
  }

  const parsed = setIncludedSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const updated = await setCalendarEventIncluded(
    user.id,
    log.id,
    parsed.data.eventId,
    parsed.data.included,
  );

  if (!updated) {
    return { ok: false, error: "Event not found." };
  }

  revalidatePath("/calendar-review");
  return { ok: true };
}
