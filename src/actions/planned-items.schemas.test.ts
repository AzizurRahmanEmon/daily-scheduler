import { describe, expect, it } from "vitest";
import {
  createAppointmentSchema,
  createMealSchema,
  updateMealSchema,
} from "./planned-items.schemas";

describe("createMealSchema", () => {
  it("accepts a valid meal", () => {
    expect(
      createMealSchema.parse({
        title: "Lunch",
        startTime: "12:30",
        endTime: "13:15",
      }),
    ).toEqual({
      title: "Lunch",
      startTime: "12:30",
      endTime: "13:15",
    });
  });

  it("rejects end before start", () => {
    expect(
      createMealSchema.safeParse({
        title: "Lunch",
        startTime: "13:00",
        endTime: "12:00",
      }).success,
    ).toBe(false);
  });

  it("rejects meal duration over 180 minutes", () => {
    expect(
      createMealSchema.safeParse({
        title: "Lunch",
        startTime: "08:00",
        endTime: "12:00",
      }).success,
    ).toBe(false);
  });
});

describe("updateMealSchema", () => {
  it("requires a valid item id", () => {
    expect(
      updateMealSchema.safeParse({
        itemId: "not-a-uuid",
        title: "Lunch",
        startTime: "12:30",
        endTime: "13:15",
      }).success,
    ).toBe(false);
  });
});

describe("createAppointmentSchema", () => {
  it("accepts a valid appointment", () => {
    expect(
      createAppointmentSchema.parse({
        title: "Dentist",
        startTime: "14:00",
        endTime: "15:00",
      }),
    ).toEqual({
      title: "Dentist",
      startTime: "14:00",
      endTime: "15:00",
    });
  });

  it("rejects end before start", () => {
    expect(
      createAppointmentSchema.safeParse({
        title: "Dentist",
        startTime: "15:00",
        endTime: "14:00",
      }).success,
    ).toBe(false);
  });
});
