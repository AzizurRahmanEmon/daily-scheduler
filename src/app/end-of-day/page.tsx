import { EndOfDayPanel } from "@/components/end-of-day/end-of-day-panel";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { getOrCreateTodayLog } from "@/db/queries/daily-logs";
import { getTasksForLog } from "@/db/queries/tasks";
import { computeDaySummary } from "@/lib/day-summary/compute-day-summary";
import { requireWakeTime } from "@/lib/guards";

export default async function EndOfDayPage() {
  const { user, log } = await requireWakeTime();
  const [tasks, activeLog] = await Promise.all([
    getTasksForLog(user.id, log.id),
    getOrCreateTodayLog(user.id),
  ]);

  const taskItems = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    estimatedMinutes: task.estimatedMinutes,
    status: task.status,
    notes: task.notes,
  }));

  const summary = computeDaySummary(taskItems);
  const isReadOnly = log.status === "closed";
  const canReopen = isReadOnly && activeLog.id === log.id;

  return (
    <PageContainer>
      <PageHeader
        title="How did it go?"
        description="Review each task and add a quick note if you'd like."
      />
      <EndOfDayPanel
        initialTasks={taskItems}
        initialSummary={summary}
        dayNotes={log.dayNotes}
        sleepTimeActual={log.sleepTimeActual}
        isReadOnly={isReadOnly}
        canReopen={canReopen}
      />
    </PageContainer>
  );
}
