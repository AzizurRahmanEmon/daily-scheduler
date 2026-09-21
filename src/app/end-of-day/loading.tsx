import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function EndOfDayLoading() {
  return (
    <PageContainer>
      <PageHeader
        title="How did it go?"
        description="Review each task and add a quick note if you'd like."
      />
      <div className="space-y-6">
        <Card className="h-24 animate-pulse bg-teal-50">
          <span className="sr-only">Loading summary</span>
        </Card>
        {[1, 2, 3].map((item) => (
          <Card key={item}>
            <CardContent className="space-y-4 py-6">
              <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((pill) => (
                  <div
                    key={pill}
                    className="h-8 w-24 animate-pulse rounded-full bg-slate-200"
                  />
                ))}
              </div>
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
