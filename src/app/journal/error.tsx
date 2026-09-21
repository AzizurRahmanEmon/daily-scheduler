"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function JournalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-sm text-slate-600">
            Could not load your journal. Please try again.
          </p>
          {error.message && (
            <p className="text-xs text-slate-500">{error.message}</p>
          )}
          <Button type="button" onClick={reset}>
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
