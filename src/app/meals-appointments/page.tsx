import { MealsAppointmentsPanel } from "@/components/planned-items/meals-appointments-panel";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { getCalendarEventsForLog } from "@/db/queries/calendar-events";
import { getUserPreferences } from "@/db/queries/daily-logs";
import {
  getPlannedItemsForLog,
  seedMealsIfNeeded,
} from "@/db/queries/planned-items";
import { requireWakeTime } from "@/lib/guards";
import { resolveDefaultMealTemplates } from "@/lib/meals/templates";
import { formatTimeForInput } from "@/lib/time-of-day";

export default async function MealsAppointmentsPage() {
  const { user, log } = await requireWakeTime();
  const preferences = await getUserPreferences(user.id);
  const templates = resolveDefaultMealTemplates(
    preferences.defaultMealTemplates,
    preferences.mealCountPreference,
  );

  await seedMealsIfNeeded(log.id, templates);

  const [items, calendarEvents] = await Promise.all([
    getPlannedItemsForLog(user.id, log.id),
    getCalendarEventsForLog(user.id, log.id),
  ]);

  const includedCalendarEvents = calendarEvents
    .filter((event) => event.included)
    .map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt?.toISOString() ?? null,
      endsAt: event.endsAt?.toISOString() ?? null,
      allDay: event.allDay,
    }));

  const toListItem = (item: (typeof items)[number]) => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    startTime: formatTimeForInput(item.startTime),
    endTime: formatTimeForInput(item.endTime),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Meals & appointments"
        description="Set your meal times and add any personal appointments for today."
      />
      <MealsAppointmentsPanel
        initialMeals={items.filter((item) => item.kind === "meal").map(toListItem)}
        initialAppointments={items
          .filter((item) => item.kind === "appointment")
          .map(toListItem)}
        calendarEvents={includedCalendarEvents}
        timezone={log.timezone}
        isReadOnly={log.status === "closed"}
      />
    </PageContainer>
  );
}
