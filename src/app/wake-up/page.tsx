import { WakeUpForm } from "@/components/wake-up/wake-up-form";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { getOrCreateTodayLog } from "@/db/queries/daily-logs";
import { requireUser } from "@/lib/session";

export default async function WakeUpPage() {
  const user = await requireUser();
  const log = await getOrCreateTodayLog(user.id);

  return (
    <PageContainer narrow>
      <PageHeader
        title="Good morning!"
        description="Let's have a productive day — what will you achieve today?"
      />
      <WakeUpForm dailyLogId={log.id} defaultWakeTime={log.wakeTime} />
    </PageContainer>
  );
}
