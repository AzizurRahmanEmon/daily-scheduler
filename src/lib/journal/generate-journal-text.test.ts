import { describe, expect, it } from "vitest";
import { generateJournalText } from "./generate-journal-text";
import type { GenerateJournalInput } from "./types";

const emptySummary = {
  total: 0,
  completed: 0,
  partial: 0,
  pending: 0,
  incomplete: 0,
  completionRatio: 0,
  totalEstimatedMinutes: 0,
  completedMinutes: 0,
};

function baseInput(
  overrides: Partial<GenerateJournalInput> = {},
): GenerateJournalInput {
  return {
    logDate: "2024-03-10",
    timezone: "America/New_York",
    wakeTime: null,
    sleepTimeTarget: null,
    sleepTimeActual: null,
    dayNotes: null,
    summary: emptySummary,
    tasks: [],
    calendarEventCount: 0,
    calendarBusyMinutes: 0,
    ...overrides,
  };
}

describe("generateJournalText", () => {
  it("describes an empty day without inventing details", () => {
    const text = generateJournalText(baseInput());

    expect(text).toContain("No tasks were recorded");
    expect(text).not.toContain("Calendar:");
    expect(text).not.toContain("Sleep:");
    expect(text).not.toContain("Day notes:");
  });

  it("lists all complete tasks under Completed", () => {
    const text = generateJournalText(
      baseInput({
        wakeTime: "07:00:00",
        summary: {
          total: 2,
          completed: 2,
          partial: 0,
          pending: 0,
          incomplete: 0,
          completionRatio: 1,
          totalEstimatedMinutes: 75,
          completedMinutes: 75,
        },
        tasks: [
          {
            title: "Write docs",
            status: "complete",
            notes: null,
            estimatedMinutes: 30,
          },
          {
            title: "Email",
            status: "complete",
            notes: "Finished early",
            estimatedMinutes: 45,
          },
        ],
      }),
    );

    expect(text).toContain("2 of 2 marked complete (100%)");
    expect(text).toContain("Completed:");
    expect(text).toContain("- Write docs (30 min planned)");
    expect(text).toContain("Note: Finished early");
  });

  it("groups mixed statuses separately", () => {
    const text = generateJournalText(
      baseInput({
        summary: {
          total: 3,
          completed: 1,
          partial: 1,
          pending: 0,
          incomplete: 1,
          completionRatio: 1 / 3,
          totalEstimatedMinutes: 90,
          completedMinutes: 30,
        },
        tasks: [
          {
            title: "Done task",
            status: "complete",
            notes: null,
            estimatedMinutes: 30,
          },
          {
            title: "Half task",
            status: "partial",
            notes: null,
            estimatedMinutes: 30,
          },
          {
            title: "Skipped task",
            status: "incomplete",
            notes: null,
            estimatedMinutes: 30,
          },
        ],
      }),
    );

    expect(text).toContain("Completed:");
    expect(text).toContain("Partially completed:");
    expect(text).toContain("Not done:");
    expect(text).not.toContain("Still pending:");
  });

  it("omits notes and bedtime sentences when missing", () => {
    const text = generateJournalText(
      baseInput({
        tasks: [
          {
            title: "Task",
            status: "pending",
            notes: null,
            estimatedMinutes: 30,
          },
        ],
        summary: {
          total: 1,
          completed: 0,
          partial: 0,
          pending: 1,
          incomplete: 0,
          completionRatio: 0,
          totalEstimatedMinutes: 30,
          completedMinutes: 0,
        },
      }),
    );

    expect(text).not.toContain("Note:");
    expect(text).not.toContain("Sleep:");
  });

  it("includes day notes and bedtime when present", () => {
    const text = generateJournalText(
      baseInput({
        dayNotes: "Kept the morning quiet.",
        sleepTimeTarget: "22:30:00",
        sleepTimeActual: "23:00:00",
        calendarEventCount: 2,
        calendarBusyMinutes: 90,
      }),
    );

    expect(text).toContain("Day notes: Kept the morning quiet.");
    expect(text).toContain("target bedtime");
    expect(text).toContain("actual bedtime");
    expect(text).toContain("2 included timed events, totaling 90 minutes");
  });

  it("is deterministic for the same input", () => {
    const input = baseInput({
      wakeTime: "07:00:00",
      tasks: [
        {
          title: "Task",
          status: "complete",
          notes: null,
          estimatedMinutes: 30,
        },
      ],
      summary: {
        total: 1,
        completed: 1,
        partial: 0,
        pending: 0,
        incomplete: 0,
        completionRatio: 1,
        totalEstimatedMinutes: 30,
        completedMinutes: 30,
      },
    });

    expect(generateJournalText(input)).toBe(generateJournalText(input));
  });
});
