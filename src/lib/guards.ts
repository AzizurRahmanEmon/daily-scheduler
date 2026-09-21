import { redirect } from "next/navigation";
import { getOrCreateTodayLog } from "@/db/queries/daily-logs";
import { requireUser } from "@/lib/session";

export async function requireWakeTime() {
  const user = await requireUser();
  const log = await getOrCreateTodayLog(user.id);

  if (!log.wakeTime) {
    redirect("/wake-up");
  }

  return { user, log };
}
