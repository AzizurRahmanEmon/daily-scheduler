"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FocusEvent,
} from "react";
import {
  closeDay,
  reopenDay,
  saveActualSleep,
  saveDayNotes,
  updateTaskNote,
} from "@/actions/end-of-day";
import { setTaskStatus } from "@/actions/tasks";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { computeDaySummary } from "@/lib/day-summary/compute-day-summary";
import type { DaySummary } from "@/lib/day-summary/types";
import { formatWakeTimeForInput } from "@/lib/date";

type TaskStatus = "pending" | "complete" | "partial" | "incomplete";

export type EndOfDayTaskItem = {
  id: string;
  title: string;
  estimatedMinutes: number;
  status: TaskStatus;
  notes: string | null;
};

type EndOfDayPanelProps = {
  initialTasks: EndOfDayTaskItem[];
  initialSummary: DaySummary;
  dayNotes: string | null;
  sleepTimeActual: string | null;
  isReadOnly: boolean;
  canReopen: boolean;
};

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "complete", label: "Complete" },
  { value: "partial", label: "Partial" },
  { value: "incomplete", label: "Not done" },
  { value: "pending", label: "Still pending" },
];

function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function EndOfDayPanel({
  initialTasks,
  initialSummary,
  dayNotes,
  sleepTimeActual,
  isReadOnly,
  canReopen,
}: EndOfDayPanelProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [notesValue, setNotesValue] = useState(dayNotes ?? "");
  const [sleepValue, setSleepValue] = useState(
    sleepTimeActual ? formatWakeTimeForInput(sleepTimeActual) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setNotesValue(dayNotes ?? "");
  }, [dayNotes]);

  useEffect(() => {
    setSleepValue(
      sleepTimeActual ? formatWakeTimeForInput(sleepTimeActual) : "",
    );
  }, [sleepTimeActual]);

  const summary = useMemo(() => {
    if (tasks === initialTasks) {
      return initialSummary;
    }
    return computeDaySummary(tasks);
  }, [initialSummary, initialTasks, tasks]);

  function handleStatusChange(taskId: string, status: TaskStatus) {
    if (isReadOnly) {
      return;
    }

    const previous = tasks.find((task) => task.id === taskId);
    if (!previous || previous.status === status) {
      return;
    }

    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status } : task,
      ),
    );

    startTransition(async () => {
      const result = await setTaskStatus({ taskId, status });
      if (!result.ok) {
        setTasks((current) =>
          current.map((task) =>
            task.id === taskId ? { ...task, status: previous.status } : task,
          ),
        );
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  function handleTaskNoteBlur(
    taskId: string,
    event: FocusEvent<HTMLTextAreaElement>,
  ) {
    if (isReadOnly) {
      return;
    }

    const notes = event.target.value;
    const previous = tasks.find((task) => task.id === taskId);
    if (!previous || (previous.notes ?? "") === notes) {
      return;
    }

    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, notes: notes || null } : task,
      ),
    );

    startTransition(async () => {
      const result = await updateTaskNote({
        taskId,
        notes: notes.trim() ? notes : null,
      });
      if (!result.ok) {
        setTasks((current) =>
          current.map((task) =>
            task.id === taskId ? { ...task, notes: previous.notes } : task,
          ),
        );
        setError(result.error);
        return;
      }
      setError(null);
    });
  }

  function handleDayNotesBlur(event: FocusEvent<HTMLTextAreaElement>) {
    if (isReadOnly) {
      return;
    }

    const value = event.target.value;
    if (value === (dayNotes ?? "")) {
      return;
    }

    startTransition(async () => {
      const result = await saveDayNotes({
        dayNotes: value.trim() ? value : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
    });
  }

  function handleSleepBlur(event: FocusEvent<HTMLInputElement>) {
    if (isReadOnly) {
      return;
    }

    const value = event.target.value;
    const previousFormatted = sleepTimeActual
      ? formatWakeTimeForInput(sleepTimeActual)
      : "";
    if (value === previousFormatted) {
      return;
    }

    startTransition(async () => {
      const result = await saveActualSleep({
        sleepTimeActual: value.trim() ? value : null,
      });
      if (!result.ok) {
        setSleepValue(previousFormatted);
        setError(result.error);
        return;
      }
      setError(null);
    });
  }

  function handleCloseDay() {
    if (isReadOnly) {
      return;
    }

    startTransition(async () => {
      const result = await closeDay();
      if (result && !result.ok) {
        setError(result.error);
        setConfirmClose(false);
      }
    });
  }

  function handleReopenDay() {
    startTransition(async () => {
      const result = await reopenDay();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-teal-100 bg-teal-50/60">
        <CardContent className="space-y-2 py-5">
          <h2 className="text-sm font-semibold text-teal-900">Day summary</h2>
          <p className="text-sm text-teal-800">
            {summary.completed} of {summary.total} tasks complete (
            {formatRatio(summary.completionRatio)})
          </p>
          <p className="text-sm text-teal-800">
            {summary.completedMinutes} of {summary.totalEstimatedMinutes} estimated
            minutes completed
          </p>
          {summary.total > 0 && (
            <p className="text-xs text-teal-700">
              Partial: {summary.partial} · Not done: {summary.incomplete} · Still
              pending: {summary.pending}
            </p>
          )}
        </CardContent>
      </Card>

      {isReadOnly && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This day is closed — review is read-only.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            No tasks today. You can still add day notes and close the day.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-slate-900">{task.title}</p>
                  <span className="text-xs text-slate-500">
                    {task.estimatedMinutes} min
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => {
                    const selected = task.status === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isReadOnly || isPending}
                        onClick={() => handleStatusChange(task.id, option.value)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                          selected
                            ? "bg-teal-100 text-teal-800 ring-2 ring-teal-500/30"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <Textarea
                  label="Note (optional)"
                  placeholder="Anything worth remembering about this task..."
                  rows={2}
                  defaultValue={task.notes ?? ""}
                  disabled={isReadOnly || isPending}
                  onBlur={(event) => handleTaskNoteBlur(task.id, event)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4">
          <Textarea
            label="Day notes"
            placeholder="How did the day go overall?"
            rows={4}
            value={notesValue}
            disabled={isReadOnly || isPending}
            onChange={(event) => setNotesValue(event.target.value)}
            onBlur={handleDayNotesBlur}
          />

          <Input
            label="Actual bedtime (optional)"
            type="time"
            value={sleepValue}
            disabled={isReadOnly || isPending}
            onChange={(event) => setSleepValue(event.target.value)}
            onBlur={handleSleepBlur}
          />
        </CardContent>
      </Card>

      {!isReadOnly && (
        <div className="space-y-3">
          {!confirmClose ? (
            <Button
              type="button"
              fullWidth
              size="lg"
              disabled={isPending}
              onClick={() => setConfirmClose(true)}
            >
              Close day
            </Button>
          ) : (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                Close this day? Your tasks, schedule, and calendar data will stay
                as they are, but the day becomes read-only.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  fullWidth
                  size="lg"
                  disabled={isPending}
                  onClick={handleCloseDay}
                >
                  {isPending ? "Closing…" : "Yes, close day"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  size="lg"
                  disabled={isPending}
                  onClick={() => setConfirmClose(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {isReadOnly && canReopen && (
        <Button
          type="button"
          variant="outline"
          fullWidth
          size="lg"
          disabled={isPending}
          onClick={handleReopenDay}
        >
          Reopen day
        </Button>
      )}

      {isReadOnly && (
        <ButtonLink href="/journal" fullWidth size="lg">
          View journal
        </ButtonLink>
      )}
    </div>
  );
}
