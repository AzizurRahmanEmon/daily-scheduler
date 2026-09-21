"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  saveActualSleepSchema,
  saveDayNotesSchema,
  taskNoteSchema,
  validateCloseDayTransition,
} from "@/actions/end-of-day.schemas";
import { db } from "@/db";
import { getOrCreateTodayLog } from "@/db/queries/daily-logs";
import { getTaskForLog } from "@/db/queries/tasks";
import { dailyLogs, tasks } from "@/db/schema";
import { normalizeWakeTimeInput } from "@/lib/date";
import { requireWakeTime } from "@/lib/guards";

export type EndOfDayActionResult =
  | { ok: true }
  | { ok: false; error: string };

function logClosedError(): EndOfDayActionResult {
  return { ok: false, error: "This day is closed and cannot be edited." };
}

function validationError(error: z.ZodError): EndOfDayActionResult {
  return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
}

async function getWritableLogContext() {
  const { user, log } = await requireWakeTime();
  if (log.status === "closed") {
    return { ok: false as const, result: logClosedError() };
  }
  return { ok: true as const, user, log };
}

function revalidateEndOfDayPaths() {
  revalidatePath("/end-of-day");
  revalidatePath("/tasks");
  revalidatePath("/schedule");
  revalidatePath("/meals-appointments");
  revalidatePath("/calendar-review");
}

export async function updateTaskNote(
  input: unknown,
): Promise<EndOfDayActionResult> {
  const context = await getWritableLogContext();
  if (!context.ok) {
    return context.result;
  }

  const parsed = taskNoteSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { taskId, notes } = parsed.data;
  const existing = await getTaskForLog(context.user.id, context.log.id, taskId);
  if (!existing) {
    return { ok: false, error: "Task not found." };
  }

  await db
    .update(tasks)
    .set({
      notes: notes?.trim() ? notes.trim() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.dailyLogId, context.log.id)));

  revalidateEndOfDayPaths();
  return { ok: true };
}

export async function saveDayNotes(
  input: unknown,
): Promise<EndOfDayActionResult> {
  const context = await getWritableLogContext();
  if (!context.ok) {
    return context.result;
  }

  const parsed = saveDayNotesSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const dayNotes = parsed.data.dayNotes?.trim()
    ? parsed.data.dayNotes.trim()
    : null;

  await db
    .update(dailyLogs)
    .set({
      dayNotes,
      updatedAt: new Date(),
    })
    .where(
      and(eq(dailyLogs.id, context.log.id), eq(dailyLogs.userId, context.user.id)),
    );

  revalidatePath("/end-of-day");
  return { ok: true };
}

export async function saveActualSleep(
  input: unknown,
): Promise<EndOfDayActionResult> {
  const context = await getWritableLogContext();
  if (!context.ok) {
    return context.result;
  }

  const parsed = saveActualSleepSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  let sleepTimeActual: string | null = null;
  if (parsed.data.sleepTimeActual?.trim()) {
    try {
      sleepTimeActual = normalizeWakeTimeInput(parsed.data.sleepTimeActual);
    } catch {
      return { ok: false, error: "Please enter a valid bedtime." };
    }
  }

  await db
    .update(dailyLogs)
    .set({
      sleepTimeActual,
      updatedAt: new Date(),
    })
    .where(
      and(eq(dailyLogs.id, context.log.id), eq(dailyLogs.userId, context.user.id)),
    );

  revalidatePath("/end-of-day");
  return { ok: true };
}

export async function closeDay(): Promise<EndOfDayActionResult> {
  const { user, log } = await requireWakeTime();
  const validation = validateCloseDayTransition(log.status);

  if (!validation.ok) {
    return validation;
  }

  if (!validation.alreadyClosed) {
    await db
      .update(dailyLogs)
      .set({
        status: "closed",
        updatedAt: new Date(),
      })
      .where(and(eq(dailyLogs.id, log.id), eq(dailyLogs.userId, user.id)));
  }

  revalidateEndOfDayPaths();
  redirect("/journal");
}

export async function reopenDay(): Promise<EndOfDayActionResult> {
  const { user, log } = await requireWakeTime();

  if (log.status !== "closed") {
    return { ok: false, error: "This day is not closed." };
  }

  const activeLog = await getOrCreateTodayLog(user.id);
  if (activeLog.id !== log.id) {
    return {
      ok: false,
      error: "Only today's active log can be reopened.",
    };
  }

  await db
    .update(dailyLogs)
    .set({
      status: "in_progress",
      updatedAt: new Date(),
    })
    .where(and(eq(dailyLogs.id, log.id), eq(dailyLogs.userId, user.id)));

  revalidateEndOfDayPaths();
  return { ok: true };
}
