import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs, tasks } from "@/db/schema";

export type Task = typeof tasks.$inferSelect;

export async function getTasksForLog(
  userId: string,
  logId: string,
): Promise<Task[]> {
  return db
    .select({
      id: tasks.id,
      dailyLogId: tasks.dailyLogId,
      title: tasks.title,
      estimatedMinutes: tasks.estimatedMinutes,
      status: tasks.status,
      notes: tasks.notes,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .innerJoin(dailyLogs, eq(tasks.dailyLogId, dailyLogs.id))
    .where(and(eq(dailyLogs.userId, userId), eq(tasks.dailyLogId, logId)))
    .orderBy(asc(tasks.createdAt));
}

export async function getTaskForLog(
  userId: string,
  logId: string,
  taskId: string,
): Promise<Task | null> {
  const [row] = await db
    .select({
      id: tasks.id,
      dailyLogId: tasks.dailyLogId,
      title: tasks.title,
      estimatedMinutes: tasks.estimatedMinutes,
      status: tasks.status,
      notes: tasks.notes,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .innerJoin(dailyLogs, eq(tasks.dailyLogId, dailyLogs.id))
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.dailyLogId, logId),
        eq(dailyLogs.userId, userId),
      ),
    )
    .limit(1);

  return row ?? null;
}
