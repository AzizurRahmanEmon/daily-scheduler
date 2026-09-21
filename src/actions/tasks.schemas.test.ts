import { describe, expect, it } from "vitest";
import {
  createTaskSchema,
  estimatedMinutesSchema,
  taskTitleSchema,
  updateTaskSchema,
} from "./tasks.schemas";

describe("taskTitleSchema", () => {
  it("accepts a valid title", () => {
    expect(taskTitleSchema.parse("  Write docs  ")).toBe("Write docs");
  });

  it("rejects an empty title", () => {
    expect(taskTitleSchema.safeParse("   ").success).toBe(false);
  });
});

describe("estimatedMinutesSchema", () => {
  it("accepts values in range", () => {
    expect(estimatedMinutesSchema.parse("30")).toBe(30);
  });

  it("rejects out-of-range minutes", () => {
    expect(estimatedMinutesSchema.safeParse(4).success).toBe(false);
    expect(estimatedMinutesSchema.safeParse(481).success).toBe(false);
  });
});

describe("createTaskSchema", () => {
  it("defaults estimated minutes to 30", () => {
    expect(createTaskSchema.parse({ title: "Walk" })).toEqual({
      title: "Walk",
      estimatedMinutes: 30,
    });
  });
});

describe("updateTaskSchema", () => {
  it("requires a valid task id", () => {
    const result = updateTaskSchema.safeParse({
      taskId: "not-a-uuid",
      title: "Task",
      estimatedMinutes: 45,
    });
    expect(result.success).toBe(false);
  });
});
