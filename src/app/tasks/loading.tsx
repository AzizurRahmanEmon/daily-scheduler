import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function TasksLoading() {
  return (
    <PageContainer>
      <PageHeader
        title="Today's tasks"
        description="Add everything you'd like to accomplish today."
      />
      <Card>
        <CardContent className="space-y-6">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="h-10 flex-1 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-10 w-20 animate-pulse rounded-xl bg-slate-200" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-12 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
