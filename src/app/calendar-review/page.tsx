import { CalendarReviewPanel } from "@/components/calendar/calendar-review-panel";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { getCalendarEventsForLog } from "@/db/queries/calendar-events";
import { getCalendarConnectionStatus } from "@/lib/calendar/connection";
import { requireWakeTime } from "@/lib/guards";

export default async function CalendarReviewPage() {
  const { user, log } = await requireWakeTime();
  const [events, connectionStatus] = await Promise.all([
    getCalendarEventsForLog(user.id, log.id),
    getCalendarConnectionStatus(user.id),
  ]);

  const eventItems = events.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.startsAt?.toISOString() ?? null,
    endsAt: event.endsAt?.toISOString() ?? null,
    allDay: event.allDay,
    included: event.included,
  }));

  return (
    <PageContainer>
      <PageHeader
        title="Calendar review"
        description="These events were pulled from your Google Calendar. Review before scheduling."
      />
      <CalendarReviewPanel
        events={eventItems}
        connectionStatus={connectionStatus}
        lastSyncedAt={log.calendarSyncedAt?.toISOString() ?? null}
        timezone={log.timezone}
        isReadOnly={log.status === "closed"}
      />
    </PageContainer>
  );
}
