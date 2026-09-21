"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { CalendarConnectionStatus } from "@/lib/calendar/connection";
import { CALENDAR_READONLY_SCOPE } from "@/lib/calendar/scope";
import { Button } from "@/components/ui/button";

type CalendarConnectSectionProps = {
  status: CalendarConnectionStatus;
};

const STATUS_COPY: Record<
  CalendarConnectionStatus,
  { label: string; description: string; badgeClass: string; dotClass: string }
> = {
  not_connected: {
    label: "Not connected",
    description: "Connect to pull today's events into calendar review.",
    badgeClass: "bg-slate-200/80 text-slate-600",
    dotClass: "bg-slate-400",
  },
  connected: {
    label: "Connected",
    description: "Calendar access is active. Refresh events on calendar review.",
    badgeClass: "bg-teal-100 text-teal-800",
    dotClass: "bg-teal-500",
  },
  needs_reconnect: {
    label: "Needs reconnect",
    description: "Google access expired. Reconnect to sync events again.",
    badgeClass: "bg-amber-100 text-amber-800",
    dotClass: "bg-amber-500",
  },
};

export function CalendarConnectSection({ status }: CalendarConnectSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = STATUS_COPY[status];

  async function handleConnect() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL: "/settings",
        errorCallbackURL: "/settings?calendar_error=1",
        scopes: [CALENDAR_READONLY_SCOPE],
        additionalParams: {
          access_type: "offline",
          prompt: "consent",
        },
      });

      if (result.error) {
        setError("Could not connect Google Calendar. Try again.");
        setIsLoading(false);
      }
    } catch {
      setError("Could not connect Google Calendar. Try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800">Google Calendar</p>
          <p className="text-sm text-slate-500">{copy.description}</p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${copy.badgeClass}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${copy.dotClass}`} />
          {copy.label}
        </span>
      </div>

      {status !== "connected" && (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={handleConnect}
          >
            {isLoading
              ? "Redirecting..."
              : status === "needs_reconnect"
                ? "Reconnect Google Calendar"
                : "Connect Google Calendar"}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
