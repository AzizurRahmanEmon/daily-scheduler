import { z } from "zod";
import { taskStatusSchema } from "@/actions/tasks.schemas";

export const taskNoteSchema = z.object({
  taskId: z.string().uuid("Invalid task"),
  notes: z
    .string()
    .max(2000, "Notes must be 2000 characters or fewer")
    .nullable(),
});

export const saveDayNotesSchema = z.object({
  dayNotes: z
    .string()
    .max(5000, "Day notes must be 5000 characters or fewer")
    .nullable(),
});

export const saveActualSleepSchema = z.object({
  sleepTimeActual: z.string().nullable(),
});

export const closeDaySchema = z.object({});

export const reopenDaySchema = z.object({});

export type TaskStatus = z.infer<typeof taskStatusSchema>;

export type CloseDayValidation =
  | { ok: true; alreadyClosed: boolean }
  | { ok: false; error: string };

export function validateCloseDayTransition(
  status: "draft" | "scheduled" | "in_progress" | "closed",
): CloseDayValidation {
  if (status === "closed") {
    return { ok: true, alreadyClosed: true };
  }

  if (status === "in_progress") {
    return { ok: true, alreadyClosed: false };
  }

  if (status === "draft") {
    return {
      ok: false,
      error: "Finish wake-up before closing the day.",
    };
  }

  return {
    ok: false,
    error: "This day cannot be closed yet.",
  };
}
