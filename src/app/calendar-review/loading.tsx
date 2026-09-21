import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function CalendarReviewLoading() {
  return (
    <PageContainer>
      <PageHeader
        title="Calendar review"
        description="These events were pulled from your Google Calendar. Review before scheduling."
      />
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-36 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <CardContent className="py-5">
                <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
