import { Card } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function ScheduleLoading() {
  return (
    <PageContainer wide>
      <PageHeader
        title="Your schedule"
        description="A full-day timeline from wake-up to sleep, color-coded by activity type."
      />
      <div className="space-y-6">
        <div className="flex justify-end">
          <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="h-7 w-20 animate-pulse rounded-full bg-slate-200"
            />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <Card key={item} className="h-20 animate-pulse bg-slate-100">
              <span className="sr-only">Loading</span>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
