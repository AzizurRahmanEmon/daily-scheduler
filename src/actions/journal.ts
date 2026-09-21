"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  journalLogIdSchema,
  saveJournalEditSchema,
  validateJournalWriteAccess,
} from "@/actions/journal.schemas";
import { db } from "@/db";
import { getCalendarEventsForLog } from "@/db/queries/calendar-events";
import { getDailyLogForUser } from "@/db/queries/daily-logs";
import { getJournalEntryForLog } from "@/db/queries/journal";
import { getTasksForLog } from "@/db/queries/tasks";
import { journalEntries } from "@/db/schema";
import { assembleJournalInput } from "@/lib/journal/assemble-journal-input";
import { generateJournalText } from "@/lib/journal/generate-journal-text";
import { requireUser } from "@/lib/session";

export type JournalActionResult =
  | { ok: false; error: string }
  | {
      ok: true;
      content: string;
      generatedAt: string;
      editedAt: string | null;
      created: boolean;
    };

function validationError(error: z.ZodError): { ok: false; error: string } {
  return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
}

function serializeEntry(
  entry: {
    content: string;
    generatedAt: Date;
    editedAt: Date | null;
  },
  created: boolean,
): Extract<JournalActionResult, { ok: true }> {
  return {
    ok: true,
    content: entry.content,
    generatedAt: entry.generatedAt.toISOString(),
    editedAt: entry.editedAt?.toISOString() ?? null,
    created,
  };
}

async function loadOwnedLog(userId: string, logId: string) {
  const log = await getDailyLogForUser(userId, logId);
  if (!log) {
    return { ok: false as const, error: "Daily log not found." };
  }

  const access = validateJournalWriteAccess(log.status);
  if (!access.ok) {
    return access;
  }

  return { ok: true as const, log };
}

async function buildGeneratedContent(userId: string, logId: string) {
  const log = await getDailyLogForUser(userId, logId);
  if (!log) {
    throw new Error("Daily log not found.");
  }

  const [tasks, calendarEvents] = await Promise.all([
    getTasksForLog(userId, logId),
    getCalendarEventsForLog(userId, logId),
  ]);

  const input = assembleJournalInput(
    {
      date: log.date,
      timezone: log.timezone,
      wakeTime: log.wakeTime,
      sleepTime: log.sleepTime,
      sleepTimeActual: log.sleepTimeActual,
      dayNotes: log.dayNotes,
    },
    tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      notes: task.notes,
      estimatedMinutes: task.estimatedMinutes,
    })),
    calendarEvents,
  );

  return generateJournalText(input);
}

function revalidateJournalPaths(date: string) {
  revalidatePath("/journal");
  revalidatePath(`/journal?date=${date}`);
}

export async function generateJournal(
  input: unknown,
): Promise<JournalActionResult> {
  const user = await requireUser();
  const parsed = journalLogIdSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const context = await loadOwnedLog(user.id, parsed.data.logId);
  if (!context.ok) {
    return context;
  }

  const existing = await getJournalEntryForLog(user.id, context.log.id);
  if (existing) {
    return serializeEntry(existing, false);
  }

  const content = await buildGeneratedContent(user.id, context.log.id);
  const now = new Date();

  await db
    .insert(journalEntries)
    .values({
      dailyLogId: context.log.id,
      content,
      generatedAt: now,
      editedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: journalEntries.dailyLogId });

  const entry = await getJournalEntryForLog(user.id, context.log.id);
  if (!entry) {
    return { ok: false, error: "Could not create journal entry." };
  }

  revalidateJournalPaths(context.log.date);
  return serializeEntry(entry, true);
}

export async function saveJournalEdit(
  input: unknown,
): Promise<JournalActionResult> {
  const user = await requireUser();
  const parsed = saveJournalEditSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const context = await loadOwnedLog(user.id, parsed.data.logId);
  if (!context.ok) {
    return context;
  }

  const existing = await getJournalEntryForLog(user.id, context.log.id);
  if (!existing) {
    return { ok: false, error: "Journal entry not found." };
  }

  const now = new Date();

  await db
    .update(journalEntries)
    .set({
      content: parsed.data.content,
      editedAt: now,
      updatedAt: now,
    })
    .where(eq(journalEntries.dailyLogId, context.log.id));

  revalidateJournalPaths(context.log.date);
  return serializeEntry(
    {
      content: parsed.data.content,
      generatedAt: existing.generatedAt,
      editedAt: now,
    },
    false,
  );
}

export async function regenerateJournal(
  input: unknown,
): Promise<JournalActionResult> {
  const user = await requireUser();
  const parsed = journalLogIdSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const context = await loadOwnedLog(user.id, parsed.data.logId);
  if (!context.ok) {
    return context;
  }

  const content = await buildGeneratedContent(user.id, context.log.id);
  const now = new Date();

  await db
    .insert(journalEntries)
    .values({
      dailyLogId: context.log.id,
      content,
      generatedAt: now,
      editedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: journalEntries.dailyLogId,
      set: {
        content,
        generatedAt: now,
        editedAt: null,
        updatedAt: now,
      },
    });

  revalidateJournalPaths(context.log.date);
  return serializeEntry(
    {
      content,
      generatedAt: now,
      editedAt: null,
    },
    false,
  );
}
