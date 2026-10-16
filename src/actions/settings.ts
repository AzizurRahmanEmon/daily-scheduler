"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { dailyLogs, userPreferences } from "@/db/schema";
import {
  sleepHoursToMinutes,
  updatePreferencesSchema,
} from "@/actions/settings.schemas";
import { requireUser } from "@/lib/session";

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; error: string };

function validationError(error: z.ZodError): SettingsActionResult {
  return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
}

export async function updatePreferences(
  input: unknown,
): Promise<SettingsActionResult> {
  const user = await requireUser();

  const parsed = updatePreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const {
    timezone,
    sleepDurationHours,
    mealCountPreference,
    defaultMealTemplates,
  } = parsed.data;

  const [updated] = await db
    .update(userPreferences)
    .set({
      timezone,
      defaultSleepDuration: sleepHoursToMinutes(sleepDurationHours),
      mealCountPreference,
      defaultMealTemplates,
      updatedAt: new Date(),
    })
    .where(eq(userPreferences.userId, user.id))
    .returning({ id: userPreferences.id });

  if (!updated) {
    return { ok: false, error: "Preferences not found." };
  }

  await db
    .update(dailyLogs)
    .set({ timezone, updatedAt: new Date() })
    .where(and(eq(dailyLogs.userId, user.id), ne(dailyLogs.status, "closed")));

  revalidatePath("/settings");
  revalidatePath("/wake-up");
  revalidatePath("/calendar-review");
  revalidatePath("/schedule");
  revalidatePath("/tasks");
  revalidatePath("/meals-appointments");
  revalidatePath("/end-of-day");

  return { ok: true };
}
