"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updatePreferences } from "@/actions/settings";
import type { DefaultMealTemplate } from "@/actions/settings.schemas";
import { sleepMinutesToHours } from "@/actions/settings.schemas";
import { CalendarConnectSection } from "@/components/calendar/calendar-connect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import type { CalendarConnectionStatus } from "@/lib/calendar/connection";
import { mergeMealTemplatesOnCountChange } from "@/lib/meals/presets";

export type SettingsFormValues = {
  timezone: string;
  defaultSleepDuration: number;
  mealCountPreference: number;
  defaultMealTemplates: DefaultMealTemplate[];
};

type SettingsFormProps = {
  preferences: SettingsFormValues;
  timezones: string[];
  calendarStatus: CalendarConnectionStatus;
};

export function SettingsForm({
  preferences,
  timezones,
  calendarStatus,
}: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mealCountPreference, setMealCountPreference] = useState(
    String(preferences.mealCountPreference),
  );
  const [mealTemplates, setMealTemplates] = useState<DefaultMealTemplate[]>(
    preferences.defaultMealTemplates,
  );

  function handleMealCountChange(nextCount: string) {
    setMealCountPreference(nextCount);
    setMealTemplates((current) =>
      mergeMealTemplatesOnCountChange(current, Number(nextCount)),
    );
  }

  function updateMealTemplate(
    index: number,
    field: keyof DefaultMealTemplate,
    value: string,
  ) {
    setMealTemplates((current) =>
      current.map((template, templateIndex) => {
        if (templateIndex !== index) {
          return template;
        }
        if (field === "durationMinutes") {
          return {
            ...template,
            durationMinutes: Number(value),
          };
        }
        return {
          ...template,
          [field]: value,
        };
      }),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(false);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updatePreferences({
        timezone: formData.get("timezone"),
        sleepDurationHours: formData.get("sleepDurationHours"),
        mealCountPreference: Number(mealCountPreference),
        defaultMealTemplates: mealTemplates,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setError(null);
      setSuccess(true);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              label="Timezone"
              name="timezone"
              list="timezone-options"
              defaultValue={preferences.timezone}
              disabled={isPending}
              required
              hint="Applies to new daily logs starting tomorrow. Existing logs keep their stored timezone."
            />
            <datalist id="timezone-options">
              {timezones.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
            <p className="mt-1.5 text-xs text-slate-500">
              Changing timezone does not rewrite today&apos;s log. The update
              takes effect from your next daily log.
            </p>
          </div>

          <Input
            label="Default sleep duration (hours)"
            name="sleepDurationHours"
            type="number"
            min={4}
            max={12}
            step={0.5}
            defaultValue={sleepMinutesToHours(preferences.defaultSleepDuration)}
            disabled={isPending}
            required
            hint="Used to calculate your bedtime on the schedule."
          />

          <Select
            label="Meal count preference"
            name="mealCountPreference"
            value={mealCountPreference}
            onChange={(event) => handleMealCountChange(event.target.value)}
            disabled={isPending}
          >
            <option value="2">2 meals</option>
            <option value="3">3 meals</option>
            <option value="4">4 meals (with snack)</option>
          </Select>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-medium text-slate-800">
                Default meal times
              </p>
              <p className="text-sm text-slate-500">
                Used when a new day&apos;s meals are first seeded. Changing
                these does not update today&apos;s meals.
              </p>
            </div>
            <div className="space-y-3">
              {mealTemplates.map((template, index) => (
                <div
                  key={`${index}-${template.label}`}
                  className="grid gap-3 sm:grid-cols-[1fr_8rem_7rem]"
                >
                  <Input
                    label={index === 0 ? "Label" : undefined}
                    value={template.label}
                    onChange={(event) =>
                      updateMealTemplate(index, "label", event.target.value)
                    }
                    disabled={isPending}
                    required
                  />
                  <Input
                    label={index === 0 ? "Start" : undefined}
                    type="time"
                    value={template.startTime}
                    onChange={(event) =>
                      updateMealTemplate(index, "startTime", event.target.value)
                    }
                    disabled={isPending}
                    required
                  />
                  <Input
                    label={index === 0 ? "Minutes" : undefined}
                    type="number"
                    min={5}
                    max={180}
                    value={template.durationMinutes}
                    onChange={(event) =>
                      updateMealTemplate(
                        index,
                        "durationMinutes",
                        event.target.value,
                      )
                    }
                    disabled={isPending}
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          <CalendarConnectSection status={calendarStatus} />

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          {success && (
            <p role="status" className="text-sm text-teal-700">
              Settings saved successfully.
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
