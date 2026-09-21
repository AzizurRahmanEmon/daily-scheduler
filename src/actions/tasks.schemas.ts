import { z } from "zod";

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title must be 200 characters or fewer");

export const estimatedMinutesSchema = z.coerce
  .number()
  .int("Minutes must be a whole number")
  .min(5, "Minimum 5 minutes")
  .max(480, "Maximum 480 minutes");

export const taskStatusSchema = z.enum([
  "pending",
  "complete",
  "partial",
  "incomplete",
]);

export const createTaskSchema = z.object({
  title: taskTitleSchema,
  estimatedMinutes: estimatedMinutesSchema.default(30),
});

export const updateTaskSchema = z.object({
  taskId: z.string().uuid("Invalid task"),
  title: taskTitleSchema,
  estimatedMinutes: estimatedMinutesSchema,
});

export const taskIdSchema = z.object({
  taskId: z.string().uuid("Invalid task"),
});

export const setTaskStatusSchema = z.object({
  taskId: z.string().uuid("Invalid task"),
  status: taskStatusSchema,
});
