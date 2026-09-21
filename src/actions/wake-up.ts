"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { getDailyLogForUser } from "@/db/queries/daily-logs";
import { dailyLogs } from "@/db/schema";
import { normalizeWakeTimeInput } from "@/lib/date";
import { requireUser } from "@/lib/session";

const saveWakeTimeSchema = z.object({
  dailyLogId: z.string().uuid(),
  wakeTime: z.string().min(1, "Wake time is required"),
});

export type SaveWakeTimeState = {
  error?: string;
};

export async function saveWakeTime(
  _prevState: SaveWakeTimeState,
  formData: FormData,
): Promise<SaveWakeTimeState> {
  const user = await requireUser();

  const parsed = saveWakeTimeSchema.safeParse({
    dailyLogId: formData.get("dailyLogId"),
    wakeTime: formData.get("wakeTime"),
  });

  if (!parsed.success) {
    return { error: "Please enter a valid wake time." };
  }

  const { dailyLogId, wakeTime } = parsed.data;
  const log = await getDailyLogForUser(user.id, dailyLogId);

  if (!log) {
    return { error: "Daily log not found." };
  }

  let normalizedWakeTime: string;
  try {
    normalizedWakeTime = normalizeWakeTimeInput(wakeTime);
  } catch {
    return { error: "Please enter a valid wake time." };
  }

  const nextStatus = log.status === "draft" ? "in_progress" : log.status;

  await db
    .update(dailyLogs)
    .set({
      wakeTime: normalizedWakeTime,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(and(eq(dailyLogs.id, dailyLogId), eq(dailyLogs.userId, user.id)));

  revalidatePath("/wake-up");
  revalidatePath("/tasks");
  redirect("/tasks");
}
