import { describe, expect, it } from "vitest";
import {
  defaultMealTemplatesSchema,
  mealCountPreferenceSchema,
  sleepDurationHoursSchema,
  timezoneSchema,
  updatePreferencesSchema,
} from "./settings.schemas";

const validTemplates = [
  { label: "Breakfast", startTime: "08:00", durationMinutes: 45 },
  { label: "Lunch", startTime: "12:30", durationMinutes: 45 },
  { label: "Dinner", startTime: "19:00", durationMinutes: 60 },
];

describe("timezoneSchema", () => {
  it("accepts a valid IANA zone", () => {
    expect(timezoneSchema.parse("America/New_York")).toBe("America/New_York");
  });

  it("rejects an invalid zone string", () => {
    expect(timezoneSchema.safeParse("Not/A_Real_Zone").success).toBe(false);
  });

  it("maps GMT+6 to Asia/Dhaka", () => {
    expect(timezoneSchema.parse("GMT+6")).toBe("Asia/Dhaka");
  });
});

describe("sleepDurationHoursSchema", () => {
  it("accepts values in range", () => {
    expect(sleepDurationHoursSchema.parse(8)).toBe(8);
  });

  it("rejects out-of-range sleep duration", () => {
    expect(sleepDurationHoursSchema.safeParse(3).success).toBe(false);
    expect(sleepDurationHoursSchema.safeParse(13).success).toBe(false);
  });
});

describe("mealCountPreferenceSchema", () => {
  it("accepts valid meal counts", () => {
    expect(mealCountPreferenceSchema.parse(3)).toBe(3);
  });

  it("rejects out-of-range meal count", () => {
    expect(mealCountPreferenceSchema.safeParse(1).success).toBe(false);
    expect(mealCountPreferenceSchema.safeParse(5).success).toBe(false);
  });
});

describe("defaultMealTemplatesSchema", () => {
  it("accepts non-overlapping templates in order", () => {
    expect(defaultMealTemplatesSchema.parse(validTemplates)).toHaveLength(3);
  });

  it("rejects overlapping template times", () => {
    expect(
      defaultMealTemplatesSchema.safeParse([
        { label: "Breakfast", startTime: "08:00", durationMinutes: 45 },
        { label: "Lunch", startTime: "08:30", durationMinutes: 45 },
        { label: "Dinner", startTime: "19:00", durationMinutes: 60 },
      ]).success,
    ).toBe(false);
  });

  it("rejects templates that cross midnight", () => {
    expect(
      defaultMealTemplatesSchema.safeParse([
        { label: "Late snack", startTime: "23:30", durationMinutes: 45 },
      ]).success,
    ).toBe(false);
  });
});

describe("updatePreferencesSchema", () => {
  it("accepts a full valid payload", () => {
    expect(
      updatePreferencesSchema.parse({
        timezone: "Asia/Dhaka",
        sleepDurationHours: 8,
        mealCountPreference: 3,
        defaultMealTemplates: validTemplates,
      }),
    ).toMatchObject({
      timezone: "Asia/Dhaka",
      sleepDurationHours: 8,
      mealCountPreference: 3,
    });
  });

  it("rejects when template count does not match meal count preference", () => {
    expect(
      updatePreferencesSchema.safeParse({
        timezone: "Asia/Dhaka",
        sleepDurationHours: 8,
        mealCountPreference: 2,
        defaultMealTemplates: validTemplates,
      }).success,
    ).toBe(false);
  });
});
