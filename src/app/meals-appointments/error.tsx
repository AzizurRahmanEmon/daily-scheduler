"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function MealsAppointmentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageContainer>
      <PageHeader
        title="Meals & appointments"
        description="Set your meal times and add any personal appointments for today."
      />
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-sm text-slate-600">
            Could not load meals and appointments. Please try again.
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
