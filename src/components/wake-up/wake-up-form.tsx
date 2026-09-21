"use client";

import { useActionState } from "react";
import { saveWakeTime, type SaveWakeTimeState } from "@/actions/wake-up";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatWakeTimeForInput } from "@/lib/date";

type WakeUpFormProps = {
  dailyLogId: string;
  defaultWakeTime: string | null;
};

const initialState: SaveWakeTimeState = {};

export function WakeUpForm({ dailyLogId, defaultWakeTime }: WakeUpFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveWakeTime,
    initialState,
  );
  const hasWakeTime = Boolean(defaultWakeTime);

  return (
    <Card>
      <CardContent className="space-y-6">
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="dailyLogId" value={dailyLogId} />
          <Input
            label="What time did you wake up?"
            name="wakeTime"
            type="time"
            defaultValue={formatWakeTimeForInput(defaultWakeTime) || "07:00"}
            required
          />
          {state.error && (
            <p role="alert" className="text-sm text-red-600">
              {state.error}
            </p>
          )}
          <Button fullWidth size="lg" type="submit" disabled={isPending}>
            {isPending ? "Saving..." : hasWakeTime ? "Update & continue" : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
