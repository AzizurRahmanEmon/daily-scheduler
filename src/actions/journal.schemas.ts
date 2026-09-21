import { z } from "zod";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const journalDateParamSchema = z
  .string()
  .regex(ISO_DATE_PATTERN, "Invalid date")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }, "Invalid date");

export const journalLogIdSchema = z.object({
  logId: z.string().uuid("Invalid log"),
});

export const saveJournalEditSchema = z.object({
  logId: z.string().uuid("Invalid log"),
  content: z
    .string()
    .trim()
    .min(1, "Journal entry cannot be empty")
    .max(10000, "Journal entry must be 10,000 characters or fewer"),
});

export type JournalWriteValidation =
  | { ok: true }
  | { ok: false; error: string };

export function validateJournalWriteAccess(
  status: "draft" | "scheduled" | "in_progress" | "closed",
): JournalWriteValidation {
  if (status === "closed") {
    return { ok: true };
  }

  return {
    ok: false,
    error: "Journal entries can only be changed after the day is closed.",
  };
}
