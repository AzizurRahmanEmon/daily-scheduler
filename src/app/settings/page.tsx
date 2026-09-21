import { SettingsForm } from "@/components/settings/settings-form";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { getUserPreferences } from "@/db/queries/daily-logs";
import { getCalendarConnectionStatus } from "@/lib/calendar/connection";
import { resolveDefaultMealTemplates } from "@/lib/meals/templates";
import { getIanaTimezones } from "@/lib/timezones";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await requireUser();
  const [preferences, calendarStatus] = await Promise.all([
    getUserPreferences(user.id),
    getCalendarConnectionStatus(user.id),
  ]);
  const timezones = getIanaTimezones();

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Customize your daily planning preferences."
      />
      <SettingsForm
        preferences={{
          timezone: preferences.timezone,
          defaultSleepDuration: preferences.defaultSleepDuration,
          mealCountPreference: preferences.mealCountPreference,
          defaultMealTemplates: resolveDefaultMealTemplates(
            preferences.defaultMealTemplates,
            preferences.mealCountPreference,
          ),
        }}
        timezones={timezones}
        calendarStatus={calendarStatus}
      />
    </PageContainer>
  );
}
