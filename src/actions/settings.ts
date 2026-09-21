"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
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

  revalidatePath("/settings");
  revalidatePath("/wake-up");

  return { ok: true };
}
