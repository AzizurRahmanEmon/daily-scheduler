import { TasksPanel } from "@/components/tasks/tasks-panel";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { getTasksForLog } from "@/db/queries/tasks";
import { requireWakeTime } from "@/lib/guards";

export default async function TasksPage() {
  const { user, log } = await requireWakeTime();
  const tasks = await getTasksForLog(user.id, log.id);

  const taskItems = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    estimatedMinutes: task.estimatedMinutes,
    status: task.status,
  }));

  return (
    <PageContainer>
      <PageHeader
        title="Today's tasks"
        description="Add everything you'd like to accomplish today."
      />
      <TasksPanel
        initialTasks={taskItems}
        isReadOnly={log.status === "closed"}
      />
    </PageContainer>
  );
}
