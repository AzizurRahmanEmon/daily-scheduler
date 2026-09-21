"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateSchedule } from "@/actions/schedule";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPgTimeLabel } from "@/lib/time-of-day";
import type {
  FixedConflict,
  UnscheduledTask,
} from "@/lib/scheduler/types";

type BlockType =
  | "task"
  | "meal"
  | "calendar_event"
  | "appointment"
  | "sleep";

export type ScheduleBlockItem = {
  id: string;
  type: BlockType;
  title: string;
  startTime: string;
  endTime: string;
};

type SchedulePanelProps = {
  blocks: ScheduleBlockItem[];
  unscheduled: UnscheduledTask[];
  fixedConflicts: FixedConflict[];
  hasGenerated: boolean;
  isStale: boolean;
  sleepTargetClamped: boolean;
  isReadOnly: boolean;
};

const blockStyles: Record<BlockType, string> = {
  task: "border-l-blue-500 bg-blue-50 text-blue-900",
  meal: "border-l-green-500 bg-green-50 text-green-900",
  calendar_event: "border-l-purple-500 bg-purple-50 text-purple-900",
  appointment: "border-l-orange-500 bg-orange-50 text-orange-900",
  sleep: "border-l-indigo-500 bg-indigo-50 text-indigo-900",
};

const blockLabels: Record<BlockType, string> = {
  task: "Task",
  meal: "Meal",
  calendar_event: "Calendar",
  appointment: "Appointment",
  sleep: "Sleep",
};

function unscheduledReasonLabel(reason: UnscheduledTask["reason"]): string {
  return reason === "no_time_left"
    ? "No time left today"
    : "No gap long enough";
}

export function SchedulePanel({
  blocks,
  unscheduled,
  fixedConflicts,
  hasGenerated,
  isStale,
  sleepTargetClamped,
  isReadOnly,
}: SchedulePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateSchedule();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          {isStale && (
            <p className="text-sm font-medium text-amber-700">
              Schedule may be out of date — tasks, meals, or calendar events
              changed since the last generation.
            </p>
          )}
          {hasGenerated && (
            <p className="text-sm text-slate-600">
              Regenerating uses the current time: future task blocks move
              forward, and tasks that no longer fit before bedtime are dropped
              from the timeline.
            </p>
          )}
          {sleepTargetClamped && (
            <p className="text-sm text-slate-600">
              Sleep target was clamped to 11:59 PM because wake time plus sleep
              duration would exceed the end of the day.
            </p>
          )}
        </div>
        {!isReadOnly && (
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="shrink-0"
          >
            {isPending
              ? "Generating…"
              : hasGenerated
                ? "Regenerate schedule"
                : "Generate schedule"}
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {fixedConflicts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <h2 className="font-medium text-amber-900">Fixed item overlaps</h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {fixedConflicts.map((conflict) => (
              <li key={`${conflict.itemAId}-${conflict.itemBId}`}>
                {conflict.itemATitle} overlaps with {conflict.itemBTitle}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {unscheduled.length > 0 && (
        <Card className="border-slate-200 bg-slate-50 p-4">
          <h2 className="font-medium text-slate-900">Unscheduled tasks</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {unscheduled.map((task) => (
              <li key={task.taskId}>
                {task.title} — {unscheduledReasonLabel(task.reason)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!hasGenerated && blocks.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-600">
            No schedule yet. Add tasks, meals, and calendar events, then generate
            your day.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(blockStyles) as BlockType[]).map((type) => (
              <span
                key={type}
                className={`rounded-full px-3 py-1 text-xs font-medium ${blockStyles[type]}`}
              >
                {blockLabels[type]}
              </span>
            ))}
          </div>

          <div className="relative space-y-0">
            <div className="absolute bottom-4 left-18 top-4 hidden w-px bg-slate-200 sm:block" />

            {blocks.map((block) => {
              const startLabel = formatPgTimeLabel(block.startTime);
              const endLabel = formatPgTimeLabel(block.endTime);

              return (
                <div key={block.id} className="flex gap-4 sm:gap-6">
                  <div className="w-16 shrink-0 pt-4 text-right sm:w-20">
                    <span className="text-xs font-medium text-slate-500 sm:text-sm">
                      {startLabel}
                    </span>
                  </div>
                  <div className="relative flex-1 pb-4">
                    <Card
                      className={`border-l-4 py-4 ${blockStyles[block.type]}`}
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{block.title}</p>
                          <p className="text-xs opacity-70">
                            {startLabel} – {endLabel}
                          </p>
                        </div>
                        <span className="mt-1 w-fit rounded-md bg-white/60 px-2 py-0.5 text-xs font-medium sm:mt-0">
                          {blockLabels[block.type]}
                        </span>
                      </div>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ButtonLink href="/end-of-day" fullWidth size="lg">
        End my day
      </ButtonLink>
    </div>
  );
}
