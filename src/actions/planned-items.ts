"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createAppointmentSchema,
  createMealSchema,
  deletePlannedItemSchema,
  updateAppointmentSchema,
  updateMealSchema,
} from "@/actions/planned-items.schemas";
import { db } from "@/db";
import { getPlannedItemForLog } from "@/db/queries/planned-items";
import { plannedItems } from "@/db/schema";
import { requireWakeTime } from "@/lib/guards";

export type PlannedItemActionResult =
  | { ok: true }
  | { ok: false; error: string };

function logClosedError(): PlannedItemActionResult {
  return { ok: false, error: "This day is closed and cannot be edited." };
}

function notFoundError(): PlannedItemActionResult {
  return { ok: false, error: "Item not found." };
}

function validationError(error: z.ZodError): PlannedItemActionResult {
  return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
}

async function getWritableLogContext() {
  const { user, log } = await requireWakeTime();
  if (log.status === "closed") {
    return { ok: false as const, result: logClosedError() };
  }
  return { ok: true as const, user, log };
}

export async function createAppointment(
  input: unknown,
): Promise<PlannedItemActionResult> {
  const context = await getWritableLogContext();
  if (!context.ok) {
    return context.result;
  }

  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await db.insert(plannedItems).values({
    dailyLogId: context.log.id,
    kind: "appointment",
    title: parsed.data.title,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
  });

  revalidatePath("/meals-appointments");
  return { ok: true };
}

export async function updateMeal(
  input: unknown,
): Promise<PlannedItemActionResult> {
  const context = await getWritableLogContext();
  if (!context.ok) {
    return context.result;
  }

  const parsed = updateMealSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const existing = await getPlannedItemForLog(
    context.user.id,
    context.log.id,
    parsed.data.itemId,
  );
  if (!existing || existing.kind !== "meal") {
    return notFoundError();
  }

  await db
    .update(plannedItems)
    .set({
      title: parsed.data.title,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(plannedItems.id, parsed.data.itemId),
        eq(plannedItems.dailyLogId, context.log.id),
      ),
    );

  revalidatePath("/meals-appointments");
  return { ok: true };
}

export async function updateAppointment(
  input: unknown,
): Promise<PlannedItemActionResult> {
  const context = await getWritableLogContext();
  if (!context.ok) {
    return context.result;
  }

  const parsed = updateAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const existing = await getPlannedItemForLog(
    context.user.id,
    context.log.id,
    parsed.data.itemId,
  );
  if (!existing || existing.kind !== "appointment") {
    return notFoundError();
  }

  await db
    .update(plannedItems)
    .set({
      title: parsed.data.title,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(plannedItems.id, parsed.data.itemId),
        eq(plannedItems.dailyLogId, context.log.id),
      ),
    );

  revalidatePath("/meals-appointments");
  return { ok: true };
}

export async function deletePlannedItem(
  input: unknown,
): Promise<PlannedItemActionResult> {
  const context = await getWritableLogContext();
  if (!context.ok) {
    return context.result;
  }

  const parsed = deletePlannedItemSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const existing = await getPlannedItemForLog(
    context.user.id,
    context.log.id,
    parsed.data.itemId,
  );
  if (!existing) {
    return notFoundError();
  }

  await db
    .delete(plannedItems)
    .where(
      and(
        eq(plannedItems.id, parsed.data.itemId),
        eq(plannedItems.dailyLogId, context.log.id),
      ),
    );

  revalidatePath("/meals-appointments");
  return { ok: true };
}
