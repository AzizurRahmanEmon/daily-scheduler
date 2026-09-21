"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function ScheduleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageContainer wide>
      <PageHeader
        title="Your schedule"
        description="A full-day timeline from wake-up to sleep, color-coded by activity type."
      />
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-sm text-slate-600">
            Could not load your schedule. Please try again.
          </p>
          {error.message && (
            <p className="text-xs text-slate-500">{error.message}</p>
          )}
          <Button type="button" onClick={reset}>
            Retry
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
