import {
  defaultMealTemplatesSchema,
  type DefaultMealTemplate,
} from "@/actions/settings.schemas";
import { getPresetMealTemplates } from "@/lib/meals/presets";

export function resolveDefaultMealTemplates(
  raw: unknown,
  mealCountPreference: number,
): DefaultMealTemplate[] {
  const parsed = defaultMealTemplatesSchema.safeParse(raw);
  if (
    parsed.success &&
    parsed.data.length === mealCountPreference
  ) {
    return parsed.data;
  }
  return getPresetMealTemplates(mealCountPreference);
}
