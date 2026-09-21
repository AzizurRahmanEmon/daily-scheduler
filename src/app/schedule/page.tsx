import { SchedulePanel } from "@/components/schedule/schedule-panel";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { getCalendarEventsForLog } from "@/db/queries/calendar-events";
import { getUserPreferences } from "@/db/queries/daily-logs";
import { getPlannedItemsForLog } from "@/db/queries/planned-items";
import { getScheduleBlocksForLog } from "@/db/queries/schedule-blocks";
import { getTasksForLog } from "@/db/queries/tasks";
import { requireWakeTime } from "@/lib/guards";
import { assembleScheduleInput } from "@/lib/scheduler/assemble-input";
import { buildSchedule } from "@/lib/scheduler/build-schedule";
import { deriveFixedConflicts } from "@/lib/scheduler/derive-read-state";

export default async function SchedulePage() {
  const { user, log } = await requireWakeTime();
  const preferences = await getUserPreferences(user.id);
  const now = new Date();

  const [plannedItems, calendarEvents, tasks, persistedBlocks] =
    await Promise.all([
      getPlannedItemsForLog(user.id, log.id),
      getCalendarEventsForLog(user.id, log.id),
      getTasksForLog(user.id, log.id),
      getScheduleBlocksForLog(user.id, log.id),
    ]);

  const pendingTasks = tasks.filter((task) => task.status === "pending");

  const assembled = assembleScheduleInput({
    wakeTime: log.wakeTime!,
    sleepDurationMinutes: preferences.defaultSleepDuration,
    logDate: log.date,
    timezone: log.timezone,
    now,
    plannedItems,
    calendarEvents,
    pendingTasks,
  });

  const preview = buildSchedule(assembled.input);
  const hasGenerated = log.scheduleGeneratedAt !== null;
  const isStale =
    !log.scheduleInputHash || log.scheduleInputHash !== assembled.inputHash;

  const blocks = persistedBlocks.map((block) => ({
    id: block.id,
    type: block.type,
    title: block.title,
    startTime: block.startTime,
    endTime: block.endTime,
  }));

  return (
    <PageContainer wide>
      <PageHeader
        title="Your schedule"
        description="A full-day timeline from wake-up to sleep, color-coded by activity type."
      />
      <SchedulePanel
        blocks={blocks}
        unscheduled={preview.unscheduled}
        fixedConflicts={deriveFixedConflicts(assembled.input.fixedItems)}
        hasGenerated={hasGenerated}
        isStale={isStale}
        sleepTargetClamped={preview.sleepTargetClamped}
        isReadOnly={log.status === "closed"}
      />
    </PageContainer>
  );
}
