"use client";

import {
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  setCalendarEventIncludedAction,
  syncCalendar,
} from "@/actions/calendar";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CalendarConnectionStatus } from "@/lib/calendar/connection";
import {
  formatEventTimeRange,
  formatLastSynced,
} from "@/lib/google-calendar/format-event";

export type CalendarReviewEvent = {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
  included: boolean;
};

type CalendarReviewPanelProps = {
  events: CalendarReviewEvent[];
  connectionStatus: CalendarConnectionStatus;
  lastSyncedAt: string | null;
  timezone: string;
  isReadOnly: boolean;
};

type OptimisticAction = {
  eventId: string;
  included: boolean;
};

function applyIncludedToggle(
  events: CalendarReviewEvent[],
  action: OptimisticAction,
): CalendarReviewEvent[] {
  return events.map((event) =>
    event.id === action.eventId
      ? { ...event, included: action.included }
      : event,
  );
}

function EventSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-slate-700">{title}</h2>
      {children}
    </section>
  );
}

function EventCard({
  event,
  timezone,
  isReadOnly,
  isPending,
  onToggleIncluded,
}: {
  event: CalendarReviewEvent;
  timezone: string;
  isReadOnly: boolean;
  isPending: boolean;
  onToggleIncluded: (eventId: string, included: boolean) => void;
}) {
  return (
    <Card muted={!event.included}>
      <CardHeader className="mb-0 flex flex-row items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <CardTitle
            className={`text-base ${event.included ? "text-slate-800" : "text-slate-500 line-through"}`}
          >
            {event.title}
          </CardTitle>
          <CardDescription>
            {formatEventTimeRange(event, timezone)}
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
            Calendar
          </span>
          {!isReadOnly && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onToggleIncluded(event.id, !event.included)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                event.included
                  ? "bg-teal-100 text-teal-800 hover:bg-teal-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {event.included ? "Included" : "Excluded"}
            </button>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}

export function CalendarReviewPanel({
  events,
  connectionStatus,
  lastSyncedAt,
  timezone,
  isReadOnly,
}: CalendarReviewPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticEvents, applyOptimistic] = useOptimistic(
    events,
    applyIncludedToggle,
  );

  const timedEvents = optimisticEvents.filter((event) => !event.allDay);
  const allDayEvents = optimisticEvents.filter((event) => event.allDay);
  const lastSyncedLabel = formatLastSynced(lastSyncedAt, timezone);

  function handleRefresh() {
    startTransition(async () => {
      const result = await syncCalendar();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
    });
  }

  function handleToggleIncluded(eventId: string, included: boolean) {
    if (isReadOnly) {
      return;
    }

    const previous = optimisticEvents.find((event) => event.id === eventId);
    if (!previous) {
      return;
    }

    startTransition(async () => {
      applyOptimistic({ eventId, included });
      const result = await setCalendarEventIncludedAction({ eventId, included });
      if (!result.ok) {
        applyOptimistic({ eventId, included: previous.included });
        setError(result.error ?? "Could not update event.");
      } else {
        setError(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {connectionStatus === "not_connected" && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Google Calendar is not connected.{" "}
          <ButtonLink href="/settings" variant="ghost" size="sm" className="inline h-auto px-1 py-0">
            Connect in Settings
          </ButtonLink>
        </div>
      )}

      {connectionStatus === "needs_reconnect" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Google Calendar access expired.{" "}
          <ButtonLink href="/settings" variant="ghost" size="sm" className="inline h-auto px-1 py-0">
            Reconnect in Settings
          </ButtonLink>
        </div>
      )}

      {isReadOnly && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This day is closed — calendar events are read-only.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          {lastSyncedLabel ? (
            <span>Last synced: {lastSyncedLabel}</span>
          ) : (
            <span>Not synced yet today.</span>
          )}
        </div>
        {!isReadOnly && connectionStatus !== "not_connected" && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending || connectionStatus === "needs_reconnect"}
            onClick={handleRefresh}
          >
            {isPending ? "Refreshing..." : "Refresh calendar"}
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {optimisticEvents.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            {connectionStatus === "not_connected"
              ? "Connect Google Calendar to load today's events."
              : connectionStatus === "needs_reconnect"
                ? "Reconnect Google Calendar, then refresh to load events."
                : lastSyncedLabel
                  ? "No events on your calendar for today."
                  : "Refresh calendar to load today's events."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {timedEvents.length > 0 && (
            <EventSection title="Timed events">
              <div className="space-y-3">
                {timedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    timezone={timezone}
                    isReadOnly={isReadOnly}
                    isPending={isPending}
                    onToggleIncluded={handleToggleIncluded}
                  />
                ))}
              </div>
            </EventSection>
          )}

          {allDayEvents.length > 0 && (
            <EventSection title="All-day events">
              <div className="space-y-3">
                {allDayEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    timezone={timezone}
                    isReadOnly={isReadOnly}
                    isPending={isPending}
                    onToggleIncluded={handleToggleIncluded}
                  />
                ))}
              </div>
            </EventSection>
          )}
        </div>
      )}

      <ButtonLink href="/meals-appointments" fullWidth size="lg">
        Looks right, continue
      </ButtonLink>
    </div>
  );
}
