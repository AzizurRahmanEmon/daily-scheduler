import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function MealsAppointmentsLoading() {
  return (
    <PageContainer>
      <PageHeader
        title="Meals & appointments"
        description="Set your meal times and add any personal appointments for today."
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-10 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
