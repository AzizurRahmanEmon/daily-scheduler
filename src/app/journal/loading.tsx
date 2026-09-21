import { Card } from "@/components/ui/card";

export default function JournalLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 h-10 w-48 animate-pulse rounded bg-slate-200" />
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <div className="hidden w-64 space-y-2 lg:block">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
        <Card className="min-h-80 flex-1 animate-pulse bg-slate-50">
          <span className="sr-only">Loading journal</span>
        </Card>
      </div>
    </div>
  );
}
