import { describe, expect, it } from "vitest";
import {
  journalDateParamSchema,
  saveJournalEditSchema,
  validateJournalWriteAccess,
} from "./journal.schemas";

describe("journalDateParamSchema", () => {
  it("accepts a valid YYYY-MM-DD date", () => {
    expect(journalDateParamSchema.safeParse("2024-03-10").success).toBe(true);
  });

  it("rejects invalid calendar dates", () => {
    expect(journalDateParamSchema.safeParse("2024-02-30").success).toBe(false);
    expect(journalDateParamSchema.safeParse("not-a-date").success).toBe(false);
  });
});

describe("saveJournalEditSchema", () => {
  it("trims and accepts non-empty content", () => {
    const parsed = saveJournalEditSchema.safeParse({
      logId: "00000000-0000-4000-8000-000000000001",
      content: "  Updated entry  ",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.content).toBe("Updated entry");
    }
  });

  it("rejects whitespace-only content", () => {
    expect(
      saveJournalEditSchema.safeParse({
        logId: "00000000-0000-4000-8000-000000000001",
        content: "   ",
      }).success,
    ).toBe(false);
  });
});

describe("validateJournalWriteAccess", () => {
  it("allows closed logs", () => {
    expect(validateJournalWriteAccess("closed")).toEqual({ ok: true });
  });

  it("refuses open logs", () => {
    expect(validateJournalWriteAccess("in_progress")).toEqual({
      ok: false,
      error: "Journal entries can only be changed after the day is closed.",
    });
  });
});
