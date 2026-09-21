import type { DefaultMealTemplate } from "@/actions/settings.schemas";

const PRESETS: Record<2 | 3 | 4, DefaultMealTemplate[]> = {
  2: [
    { label: "Breakfast", startTime: "08:00", durationMinutes: 45 },
    { label: "Dinner", startTime: "19:00", durationMinutes: 60 },
  ],
  3: [
    { label: "Breakfast", startTime: "08:00", durationMinutes: 45 },
    { label: "Lunch", startTime: "12:30", durationMinutes: 45 },
    { label: "Dinner", startTime: "19:00", durationMinutes: 60 },
  ],
  4: [
    { label: "Breakfast", startTime: "08:00", durationMinutes: 45 },
    { label: "Lunch", startTime: "12:30", durationMinutes: 45 },
    { label: "Snack", startTime: "15:00", durationMinutes: 20 },
    { label: "Dinner", startTime: "19:00", durationMinutes: 60 },
  ],
};

export function getPresetMealTemplates(
  mealCountPreference: number,
): DefaultMealTemplate[] {
  if (mealCountPreference === 2 || mealCountPreference === 3 || mealCountPreference === 4) {
    return PRESETS[mealCountPreference].map((template) => ({ ...template }));
  }
  return PRESETS[3].map((template) => ({ ...template }));
}

/** Keep edited slots when count changes; pad or trim from presets. */
export function mergeMealTemplatesOnCountChange(
  current: DefaultMealTemplate[],
  newCount: number,
): DefaultMealTemplate[] {
  const preset = getPresetMealTemplates(newCount);
  if (current.length >= newCount) {
    return current.slice(0, newCount);
  }
  return [...current, ...preset.slice(current.length)];
}
