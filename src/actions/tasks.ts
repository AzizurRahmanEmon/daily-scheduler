"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { getTaskForLog } from "@/db/queries/tasks";
import { tasks } from "@/db/schema";
import { requireWakeTime } from "@/lib/guards";
import {
  createTaskSchema,
  setTaskStatusSchema,
  taskIdSchema,
  updateTaskSchema,
} from "@/actions/tasks.schemas";

export type TaskActionResult =
  | { ok: true }
  | { ok: false; error: string };

function logClosedError(): TaskActionResult {
  return {
    ok: false,
    error: "This day is closed and cannot be edited.",
  };
}

function notFoundError(): TaskActionResult {
  return { ok: false, error: "Task not found." };
}

function validationError(error: z.ZodError): TaskActionResult {
  return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
}

async function getWritableLogContext() {
  const { user, log } = await requireWakeTime();
  if (log.status === "closed") {
    return { ok: false as const, result: logClosedError() };
  }
  return { ok: true as const, user, log };
}

export async function createTask(input: unknown): Promise<TaskActionResult> {
  const context = await getWritableLogContext();
  if (!context.ok) {
    return context.result;
  }

  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { title, estimatedMinutes } = parsed.data;

  await db.insert(tasks).values({
    dailyLogId: context.log.id,
    title,
    estimatedMinutes,
    status: "pending",
  });

  revalidatePath("/tasks");
  revalidatePath("/end-of-day");
  return { ok: true };
}

export async function updateTask(input: unknown): Promise<TaskActionResult> {
  const context = await getWritableLogContext();
  if (!context.ok) {
    return context.result;
  }

  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { taskId, title, estimatedMinutes } = parsed.data;
  const existing = await getTaskForLog(context.user.id, context.log.id, taskId);
  if (!existing) {
    return notFoundError();
  }

  await db
    .update(tasks)
    .set({
      title,
      estimatedMinutes,
      updatedAt: new Date(),
    })
    .where(
      and(eq(tasks.id, taskId), eq(tasks.dailyLogId, context.log.id)),
    );

  revalidatePath("/tasks");
  revalidatePath("/end-of-day");
  return { ok: true };
}

export async function deleteTask(input: unknown): Promise<TaskActionResult> {
  const context = await getWritableLogContext();
  if (!context.ok) {
    return context.result;
  }

  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const existing = await getTaskForLog(
    context.user.id,
    context.log.id,
    parsed.data.taskId,
  );
  if (!existing) {
    return notFoundError();
  }

  await db
    .delete(tasks)
    .where(
      and(
        eq(tasks.id, parsed.data.taskId),
        eq(tasks.dailyLogId, context.log.id),
      ),
    );

  revalidatePath("/tasks");
  revalidatePath("/end-of-day");
  return { ok: true };
}

export async function setTaskStatus(input: unknown): Promise<TaskActionResult> {
  const context = await getWritableLogContext();
  if (!context.ok) {
    return context.result;
  }

  const parsed = setTaskStatusSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { taskId, status } = parsed.data;
  const existing = await getTaskForLog(context.user.id, context.log.id, taskId);
  if (!existing) {
    return notFoundError();
  }

  await db
    .update(tasks)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(
      and(eq(tasks.id, taskId), eq(tasks.dailyLogId, context.log.id)),
    );

  revalidatePath("/tasks");
  revalidatePath("/end-of-day");
  return { ok: true };
}
