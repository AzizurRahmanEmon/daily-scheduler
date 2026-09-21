"use client";

import {
  useOptimistic,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  createAppointment,
  deletePlannedItem,
  updateAppointment,
  updateMeal,
} from "@/actions/planned-items";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatEventTimeRange } from "@/lib/google-calendar/format-event";
import {
  calendarEventToOverlapInterval,
  detectOverlapWarnings,
  plannedItemToOverlapInterval,
  type OverlapWarning,
} from "@/lib/planned-items/overlap";
import { formatTimeForInput } from "@/lib/time-of-day";

export type PlannedItemListItem = {
  id: string;
  kind: "meal" | "appointment";
  title: string;
  startTime: string;
  endTime: string;
};

export type CalendarContextEvent = {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
};

type MealsAppointmentsPanelProps = {
  initialMeals: PlannedItemListItem[];
  initialAppointments: PlannedItemListItem[];
  calendarEvents: CalendarContextEvent[];
  timezone: string;
  isReadOnly: boolean;
};

type OptimisticAction =
  | { type: "add"; item: PlannedItemListItem }
  | { type: "delete"; itemId: string }
  | { type: "update"; item: PlannedItemListItem };

function applyOptimisticAction(
  items: PlannedItemListItem[],
  action: OptimisticAction,
): PlannedItemListItem[] {
  switch (action.type) {
    case "add":
      return [...items, action.item].sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      );
    case "delete":
      return items.filter((item) => item.id !== action.itemId);
    case "update":
      return items
        .map((item) => (item.id === action.item.id ? action.item : item))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    default:
      return items;
  }
}

function DeleteIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function OverlapWarnings({
  warnings,
}: {
  warnings: OverlapWarning[];
}) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-medium text-amber-900">Schedule overlaps</p>
      <ul className="space-y-1 text-sm text-amber-800">
        {warnings.map((warning) => (
          <li key={`${warning.itemId}-${warning.conflictsWith.id}`}>
            {warning.itemTitle} overlaps with {warning.conflictsWith.title}
            {warning.conflictsWith.source === "calendar"
              ? " (calendar)"
              : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MealsAppointmentsPanel({
  initialMeals,
  initialAppointments,
  calendarEvents,
  timezone,
  isReadOnly,
}: MealsAppointmentsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticMeals, applyMealOptimistic] = useOptimistic(
    initialMeals,
    applyOptimisticAction,
  );
  const [optimisticAppointments, applyAppointmentOptimistic] = useOptimistic(
    initialAppointments,
    applyOptimisticAction,
  );

  const overlapWarnings = useMemo(() => {
    const planned = [...optimisticMeals, ...optimisticAppointments].map(
      plannedItemToOverlapInterval,
    );
    const calendar = calendarEvents
      .map((event) =>
        calendarEventToOverlapInterval({
          ...event,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          timezone,
        }),
      )
      .filter((interval): interval is NonNullable<typeof interval> =>
        Boolean(interval),
      );

    return detectOverlapWarnings(planned, calendar);
  }, [optimisticMeals, optimisticAppointments, calendarEvents, timezone]);

  const allDayEvents = calendarEvents.filter((event) => event.allDay);
  const timedCalendarEvents = calendarEvents.filter((event) => !event.allDay);

  function handleAddAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isReadOnly) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "");
    const startTime = String(formData.get("startTime") ?? "");
    const endTime = String(formData.get("endTime") ?? "");
    const tempId = crypto.randomUUID();

    startTransition(async () => {
      applyAppointmentOptimistic({
        type: "add",
        item: {
          id: tempId,
          kind: "appointment",
          title: title.trim(),
          startTime,
          endTime,
        },
      });

      const result = await createAppointment({ title, startTime, endTime });
      if (!result.ok) {
        applyAppointmentOptimistic({ type: "delete", itemId: tempId });
        setError(result.error ?? "Something went wrong.");
        return;
      }

      setError(null);
      form.reset();
    });
  }

  function handleUpdateMeal(item: PlannedItemListItem, form: HTMLFormElement) {
    if (isReadOnly) {
      return;
    }

    const formData = new FormData(form);
    const title = String(formData.get(`meal-title-${item.id}`) ?? item.title);
    const startTime = String(
      formData.get(`meal-start-${item.id}`) ?? item.startTime,
    );
    const endTime = String(formData.get(`meal-end-${item.id}`) ?? item.endTime);
    const updated = { ...item, title: title.trim(), startTime, endTime };

    startTransition(async () => {
      applyMealOptimistic({ type: "update", item: updated });
      const result = await updateMeal({
        itemId: item.id,
        title,
        startTime,
        endTime,
      });
      if (!result.ok) {
        applyMealOptimistic({ type: "update", item });
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setError(null);
    });
  }

  function handleDelete(item: PlannedItemListItem) {
    if (isReadOnly) {
      return;
    }

    startTransition(async () => {
      if (item.kind === "meal") {
        applyMealOptimistic({ type: "delete", itemId: item.id });
      } else {
        applyAppointmentOptimistic({ type: "delete", itemId: item.id });
      }

      const result = await deletePlannedItem({ itemId: item.id });
      if (!result.ok) {
        if (item.kind === "meal") {
          applyMealOptimistic({ type: "add", item });
        } else {
          applyAppointmentOptimistic({ type: "add", item });
        }
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setError(null);
    });
  }

  function handleUpdateAppointment(
    item: PlannedItemListItem,
    title: string,
    startTime: string,
    endTime: string,
  ) {
    if (isReadOnly) {
      return;
    }

    const updated = { ...item, title: title.trim(), startTime, endTime };

    startTransition(async () => {
      applyAppointmentOptimistic({ type: "update", item: updated });
      const result = await updateAppointment({
        itemId: item.id,
        title,
        startTime,
        endTime,
      });
      if (!result.ok) {
        applyAppointmentOptimistic({ type: "update", item });
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setError(null);
    });
  }

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This day is closed — meals and appointments are read-only.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <OverlapWarnings warnings={overlapWarnings} />

      {(allDayEvents.length > 0 || timedCalendarEvents.length > 0) && (
        <Card muted>
          <CardHeader>
            <CardTitle className="text-base">Included calendar events</CardTitle>
            <CardDescription>
              Read-only context from your calendar review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {timedCalendarEvents.map((event) => (
              <div key={event.id} className="text-sm">
                <p className="font-medium text-slate-700">{event.title}</p>
                <p className="text-slate-500">
                  {formatEventTimeRange(event, timezone)}
                </p>
              </div>
            ))}
            {allDayEvents.map((event) => (
              <div key={event.id} className="text-sm">
                <p className="font-medium text-slate-700">{event.title}</p>
                <p className="text-slate-500">All day</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meal times</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {optimisticMeals.length === 0 ? (
            <p className="text-sm text-slate-500">
              No meals yet. They will appear after the first load seeds your
              defaults.
            </p>
          ) : (
            optimisticMeals.map((meal) => (
              <form
                key={meal.id}
                className="grid gap-3 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[1fr_8rem_8rem_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleUpdateMeal(meal, event.currentTarget);
                }}
              >
                <Input
                  name={`meal-title-${meal.id}`}
                  defaultValue={meal.title}
                  disabled={isPending || isReadOnly}
                  required
                />
                <Input
                  name={`meal-start-${meal.id}`}
                  type="time"
                  defaultValue={formatTimeForInput(meal.startTime)}
                  disabled={isPending || isReadOnly}
                  required
                />
                <Input
                  name={`meal-end-${meal.id}`}
                  type="time"
                  defaultValue={formatTimeForInput(meal.endTime)}
                  disabled={isPending || isReadOnly}
                  required
                />
                {!isReadOnly && (
                  <div className="flex gap-1 self-end">
                    <Button type="submit" size="sm" disabled={isPending}>
                      Save
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDelete(meal)}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label={`Delete ${meal.title}`}
                      disabled={isPending}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                )}
              </form>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isReadOnly && (
            <form
              onSubmit={handleAddAppointment}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <Input
                name="title"
                placeholder="Appointment name"
                className="flex-1"
                disabled={isPending}
                required
              />
              <Input
                name="startTime"
                type="time"
                defaultValue="14:00"
                className="sm:max-w-35"
                disabled={isPending}
                required
              />
              <Input
                name="endTime"
                type="time"
                defaultValue="15:00"
                className="sm:max-w-35"
                disabled={isPending}
                required
              />
              <Button className="shrink-0" type="submit" disabled={isPending}>
                Add
              </Button>
            </form>
          )}

          {optimisticAppointments.length === 0 ? (
            <p className="text-sm text-slate-500">
              No appointments yet. Add one above.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {optimisticAppointments.map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  isPending={isPending}
                  isReadOnly={isReadOnly}
                  onDelete={() => handleDelete(appointment)}
                  onSave={handleUpdateAppointment}
                />
              ))}
            </ul>
          )}

          <ButtonLink href="/schedule" fullWidth size="lg">
            Continue to schedule
          </ButtonLink>
        </CardContent>
      </Card>
    </div>
  );
}

function AppointmentRow({
  appointment,
  isPending,
  isReadOnly,
  onDelete,
  onSave,
}: {
  appointment: PlannedItemListItem;
  isPending: boolean;
  isReadOnly: boolean;
  onDelete: () => void;
  onSave: (
    item: PlannedItemListItem,
    title: string,
    startTime: string,
    endTime: string,
  ) => void;
}) {
  const [title, setTitle] = useState(appointment.title);
  const [startTime, setStartTime] = useState(
    formatTimeForInput(appointment.startTime),
  );
  const [endTime, setEndTime] = useState(
    formatTimeForInput(appointment.endTime),
  );

  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-end">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="flex-1"
        disabled={isPending || isReadOnly}
      />
      <Input
        type="time"
        value={startTime}
        onChange={(event) => setStartTime(event.target.value)}
        className="sm:max-w-35"
        disabled={isPending || isReadOnly}
      />
      <Input
        type="time"
        value={endTime}
        onChange={(event) => setEndTime(event.target.value)}
        className="sm:max-w-35"
        disabled={isPending || isReadOnly}
      />
      {!isReadOnly && (
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() =>
              onSave(appointment, title, startTime, endTime)
            }
          >
            Save
          </Button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            aria-label={`Delete ${appointment.title}`}
            disabled={isPending}
          >
            <DeleteIcon />
          </button>
        </div>
      )}
    </li>
  );
}
