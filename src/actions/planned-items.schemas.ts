import { z } from "zod";
import { timeOfDaySchema } from "@/actions/settings.schemas";
import { durationMinutes, isValidSameDayRange } from "@/lib/time-of-day";

export const plannedItemTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title must be 200 characters or fewer");

export const plannedItemIdSchema = z.string().uuid("Invalid item");

const plannedItemTimesSchema = z
  .object({
    startTime: timeOfDaySchema,
    endTime: timeOfDaySchema,
  })
  .superRefine((data, ctx) => {
    if (!isValidSameDayRange(data.startTime, data.endTime)) {
      ctx.addIssue({
        code: "custom",
        message: "End time must be after start time",
        path: ["endTime"],
      });
    }
  });

function mealDurationRefinement(
  data: { startTime: string; endTime: string },
  ctx: z.RefinementCtx,
) {
  const minutes = durationMinutes(data.startTime, data.endTime);
  if (minutes < 5) {
    ctx.addIssue({
      code: "custom",
      message: "Meals must be at least 5 minutes",
      path: ["endTime"],
    });
  }
  if (minutes > 180) {
    ctx.addIssue({
      code: "custom",
      message: "Meals must be 180 minutes or fewer",
      path: ["endTime"],
    });
  }
}

export const createMealSchema = z
  .object({
    title: plannedItemTitleSchema,
    startTime: timeOfDaySchema,
    endTime: timeOfDaySchema,
  })
  .superRefine((data, ctx) => {
    if (!isValidSameDayRange(data.startTime, data.endTime)) {
      ctx.addIssue({
        code: "custom",
        message: "End time must be after start time",
        path: ["endTime"],
      });
      return;
    }
    mealDurationRefinement(data, ctx);
  });

export const updateMealSchema = z
  .object({
    itemId: plannedItemIdSchema,
    title: plannedItemTitleSchema,
    startTime: timeOfDaySchema,
    endTime: timeOfDaySchema,
  })
  .superRefine((data, ctx) => {
    if (!isValidSameDayRange(data.startTime, data.endTime)) {
      ctx.addIssue({
        code: "custom",
        message: "End time must be after start time",
        path: ["endTime"],
      });
      return;
    }
    mealDurationRefinement(data, ctx);
  });

export const createAppointmentSchema = z
  .object({
    title: plannedItemTitleSchema,
    startTime: timeOfDaySchema,
    endTime: timeOfDaySchema,
  })
  .and(plannedItemTimesSchema);

export const updateAppointmentSchema = z
  .object({
    itemId: plannedItemIdSchema,
    title: plannedItemTitleSchema,
    startTime: timeOfDaySchema,
    endTime: timeOfDaySchema,
  })
  .and(plannedItemTimesSchema);

export const deletePlannedItemSchema = z.object({
  itemId: plannedItemIdSchema,
});
