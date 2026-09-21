import { z } from "zod";
import { isValidIanaTimezone } from "@/lib/timezones";
import {
  addMinutesToTime,
  crossesMidnight,
  timeToMinutes,
} from "@/lib/time-of-day";

export const timezoneSchema = z
  .string()
  .trim()
  .min(1, "Timezone is required")
  .refine(isValidIanaTimezone, "Invalid timezone");

export const sleepDurationHoursSchema = z.coerce
  .number()
  .min(4, "Minimum 4 hours")
  .max(12, "Maximum 12 hours");

export const mealCountPreferenceSchema = z.coerce
  .number()
  .int("Meal count must be a whole number")
  .min(2, "Minimum 2 meals")
  .max(4, "Maximum 4 meals");

export const timeOfDaySchema = z
  .string()
  .trim()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
    "Invalid time (use HH:MM)",
  )
  .transform((value) => {
    const [hours, minutes] = value.split(":");
    return `${hours}:${minutes}`;
  });

export const defaultMealTemplateSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1, "Label is required")
      .max(100, "Label must be 100 characters or fewer"),
    startTime: timeOfDaySchema,
    durationMinutes: z.coerce
      .number()
      .int("Duration must be a whole number")
      .min(5, "Minimum 5 minutes")
      .max(180, "Maximum 180 minutes"),
  })
  .superRefine((template, ctx) => {
    if (crossesMidnight(template.startTime, template.durationMinutes)) {
      ctx.addIssue({
        code: "custom",
        message: "Meal duration cannot cross midnight",
        path: ["durationMinutes"],
      });
    }
  });

export type DefaultMealTemplate = z.infer<typeof defaultMealTemplateSchema>;

function validateTemplateSchedule(
  templates: DefaultMealTemplate[],
  ctx: z.RefinementCtx,
) {
  const intervals = templates.map((template, index) => ({
    index,
    start: timeToMinutes(template.startTime),
    end: timeToMinutes(
      addMinutesToTime(template.startTime, template.durationMinutes),
    ),
  }));

  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      const a = intervals[i]!;
      const b = intervals[j]!;

      if (a.start === b.start) {
        ctx.addIssue({
          code: "custom",
          message: "Meal times must not duplicate",
          path: [b.index, "startTime"],
        });
      }

      if (a.start < b.end && b.start < a.end) {
        ctx.addIssue({
          code: "custom",
          message: "Default meal times must not overlap",
          path: [b.index, "startTime"],
        });
      }
    }
  }

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i]!.start <= intervals[i - 1]!.start) {
      ctx.addIssue({
        code: "custom",
        message: "Default meal times must be in chronological order",
        path: [intervals[i]!.index, "startTime"],
      });
    }
  }
}

export function createDefaultMealTemplatesSchema(expectedCount: number) {
  return z
    .array(defaultMealTemplateSchema)
    .length(
      expectedCount,
      `Provide exactly ${expectedCount} default meals`,
    )
    .superRefine((templates, ctx) => {
      validateTemplateSchedule(templates, ctx);
    });
}

export const defaultMealTemplatesSchema = z
  .array(defaultMealTemplateSchema)
  .min(2)
  .max(4)
  .superRefine((templates, ctx) => {
    validateTemplateSchedule(templates, ctx);
  });

export const updatePreferencesSchema = z
  .object({
    timezone: timezoneSchema,
    sleepDurationHours: sleepDurationHoursSchema,
    mealCountPreference: mealCountPreferenceSchema,
    defaultMealTemplates: z.array(defaultMealTemplateSchema),
  })
  .superRefine((data, ctx) => {
    if (data.defaultMealTemplates.length !== data.mealCountPreference) {
      ctx.addIssue({
        code: "custom",
        message: "Meal template count must match meal count preference",
        path: ["defaultMealTemplates"],
      });
    }
    validateTemplateSchedule(data.defaultMealTemplates, ctx);
  });

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

/** Convert hours (UI) to minutes (database). */
export function sleepHoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

/** Convert minutes (database) to hours (UI). */
export function sleepMinutesToHours(minutes: number): number {
  return minutes / 60;
}
