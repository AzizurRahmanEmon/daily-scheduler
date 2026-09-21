import { and, asc, eq, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { calendarEvents, dailyLogs } from "@/db/schema";
import type { MappedCalendarEvent } from "@/lib/google-calendar/types";

export type CalendarEvent = typeof calendarEvents.$inferSelect;

export async function getCalendarEventsForLog(
  userId: string,
  logId: string,
): Promise<CalendarEvent[]> {
  return db
    .select({
      id: calendarEvents.id,
      dailyLogId: calendarEvents.dailyLogId,
      googleEventId: calendarEvents.googleEventId,
      title: calendarEvents.title,
      startsAt: calendarEvents.startsAt,
      endsAt: calendarEvents.endsAt,
      allDay: calendarEvents.allDay,
      included: calendarEvents.included,
      createdAt: calendarEvents.createdAt,
      updatedAt: calendarEvents.updatedAt,
    })
    .from(calendarEvents)
    .innerJoin(dailyLogs, eq(calendarEvents.dailyLogId, dailyLogs.id))
    .where(and(eq(dailyLogs.userId, userId), eq(calendarEvents.dailyLogId, logId)))
    .orderBy(
      asc(calendarEvents.allDay),
      asc(calendarEvents.startsAt),
      asc(calendarEvents.title),
    );
}

export async function getCalendarEventForLog(
  userId: string,
  logId: string,
  eventId: string,
): Promise<CalendarEvent | null> {
  const [row] = await db
    .select({
      id: calendarEvents.id,
      dailyLogId: calendarEvents.dailyLogId,
      googleEventId: calendarEvents.googleEventId,
      title: calendarEvents.title,
      startsAt: calendarEvents.startsAt,
      endsAt: calendarEvents.endsAt,
      allDay: calendarEvents.allDay,
      included: calendarEvents.included,
      createdAt: calendarEvents.createdAt,
      updatedAt: calendarEvents.updatedAt,
    })
    .from(calendarEvents)
    .innerJoin(dailyLogs, eq(calendarEvents.dailyLogId, dailyLogs.id))
    .where(
      and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.dailyLogId, logId),
        eq(dailyLogs.userId, userId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function replaceCalendarEventsForLog(
  logId: string,
  mappedEvents: MappedCalendarEvent[],
): Promise<void> {
  const googleEventIds = mappedEvents.map((event) => event.googleEventId);
  const now = new Date();

  await db.transaction(async (tx) => {
    for (const event of mappedEvents) {
      await tx
        .insert(calendarEvents)
        .values({
          dailyLogId: logId,
          googleEventId: event.googleEventId,
          title: event.title,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          allDay: event.allDay,
        })
        .onConflictDoUpdate({
          target: [calendarEvents.dailyLogId, calendarEvents.googleEventId],
          set: {
            title: event.title,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            allDay: event.allDay,
            updatedAt: now,
          },
        });
    }

    if (googleEventIds.length === 0) {
      await tx
        .delete(calendarEvents)
        .where(eq(calendarEvents.dailyLogId, logId));
    } else {
      await tx
        .delete(calendarEvents)
        .where(
          and(
            eq(calendarEvents.dailyLogId, logId),
            notInArray(calendarEvents.googleEventId, googleEventIds),
          ),
        );
    }

    await tx
      .update(dailyLogs)
      .set({ calendarSyncedAt: now, updatedAt: now })
      .where(eq(dailyLogs.id, logId));
  });
}

export async function setCalendarEventIncluded(
  userId: string,
  logId: string,
  eventId: string,
  included: boolean,
): Promise<boolean> {
  const existing = await getCalendarEventForLog(userId, logId, eventId);
  if (!existing) {
    return false;
  }

  await db
    .update(calendarEvents)
    .set({ included, updatedAt: new Date() })
    .where(
      and(eq(calendarEvents.id, eventId), eq(calendarEvents.dailyLogId, logId)),
    );

  return true;
}
