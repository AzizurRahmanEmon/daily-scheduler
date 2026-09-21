import { describe, expect, it } from "vitest";
import {
  saveActualSleepSchema,
  saveDayNotesSchema,
  taskNoteSchema,
  validateCloseDayTransition,
} from "./end-of-day.schemas";

describe("end-of-day schemas", () => {
  it("accepts nullable day notes", () => {
    expect(saveDayNotesSchema.safeParse({ dayNotes: null }).success).toBe(true);
    expect(saveDayNotesSchema.safeParse({ dayNotes: "Good day" }).success).toBe(
      true,
    );
  });

  it("rejects day notes that are too long", () => {
    expect(
      saveDayNotesSchema.safeParse({ dayNotes: "x".repeat(5001) }).success,
    ).toBe(false);
  });

  it("accepts nullable actual sleep time", () => {
    expect(saveActualSleepSchema.safeParse({ sleepTimeActual: null }).success).toBe(
      true,
    );
    expect(
      saveActualSleepSchema.safeParse({ sleepTimeActual: "22:30" }).success,
    ).toBe(true);
  });

  it("validates task note updates", () => {
    expect(
      taskNoteSchema.safeParse({
        taskId: "00000000-0000-4000-8000-000000000001",
        notes: "Done early",
      }).success,
    ).toBe(true);
    expect(
      taskNoteSchema.safeParse({
        taskId: "not-a-uuid",
        notes: null,
      }).success,
    ).toBe(false);
  });
});

describe("validateCloseDayTransition", () => {
  it("allows in_progress to close", () => {
    expect(validateCloseDayTransition("in_progress")).toEqual({
      ok: true,
      alreadyClosed: false,
    });
  });

  it("refuses draft", () => {
    expect(validateCloseDayTransition("draft")).toEqual({
      ok: false,
      error: "Finish wake-up before closing the day.",
    });
  });

  it("treats already closed as a no-op", () => {
    expect(validateCloseDayTransition("closed")).toEqual({
      ok: true,
      alreadyClosed: true,
    });
  });

  it("refuses scheduled", () => {
    expect(validateCloseDayTransition("scheduled")).toEqual({
      ok: false,
      error: "This day cannot be closed yet.",
    });
  });
});
