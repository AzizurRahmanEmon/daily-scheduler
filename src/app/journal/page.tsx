import { JournalPanel } from "@/components/journal/journal-panel";
import { JournalSidebar } from "@/components/journal/journal-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { journalDateParamSchema } from "@/actions/journal.schemas";
import { getCalendarEventsForLog } from "@/db/queries/calendar-events";
import { getUserPreferences } from "@/db/queries/daily-logs";
import {
  getDailyLogByUserAndDate,
  getJournalEntryForLog,
  getJournalSidebarEntries,
  getMostRecentClosedLog,
} from "@/db/queries/journal";
import { getTasksForLog } from "@/db/queries/tasks";
import {
  assembleJournalInput,
  computeJournalStats,
} from "@/lib/journal/assemble-journal-input";
import { formatJournalDateHeader } from "@/lib/journal/format-labels";
import { getCalendarDateInTimezone } from "@/lib/date";
import { requireUser } from "@/lib/session";
import type { ReactNode } from "react";
import type { JournalSidebarItem } from "@/db/queries/journal";

export const dynamic = "force-dynamic";

type JournalPageProps = {
  searchParams: Promise<{ date?: string | string[] }>;
};

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const user = await requireUser();
  const preferences = await getUserPreferences(user.id);
  const params = await searchParams;
  const rawDate = Array.isArray(params.date) ? params.date[0] : params.date;

  let dateError: string | null = null;
  let requestedDate: string | null = null;

  if (rawDate) {
    const parsedDate = journalDateParamSchema.safeParse(rawDate);
    if (!parsedDate.success) {
      dateError = "That date is not valid.";
    } else {
      requestedDate = parsedDate.data;
    }
  }

  const todayDate = getCalendarDateInTimezone(new Date(), preferences.timezone);
  const sidebarItems = await getJournalSidebarEntries(user.id, 30);

  if (dateError) {
    return (
      <JournalPageShell
        sidebarItems={sidebarItems}
        selectedDate={null}
        todayDate={todayDate}
      >
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-600">
            {dateError}
          </CardContent>
        </Card>
      </JournalPageShell>
    );
  }

  const selectedLog = requestedDate
    ? await getDailyLogByUserAndDate(user.id, requestedDate)
    : await getMostRecentClosedLog(user.id);

  if (!selectedLog) {
    return (
      <JournalPageShell
        sidebarItems={sidebarItems}
        selectedDate={null}
        todayDate={todayDate}
      >
        <Card>
          <CardContent className="space-y-3 py-8 text-center">
            <p className="text-sm text-slate-600">
              {requestedDate
                ? "No log found for that date."
                : "No closed days yet. Close a day from end-of-day review to start your journal."}
            </p>
          </CardContent>
        </Card>
      </JournalPageShell>
    );
  }

  const [entry, tasks, calendarEvents] = await Promise.all([
    getJournalEntryForLog(user.id, selectedLog.id),
    getTasksForLog(user.id, selectedLog.id),
    getCalendarEventsForLog(user.id, selectedLog.id),
  ]);

  const journalInput = assembleJournalInput(
    {
      date: selectedLog.date,
      timezone: selectedLog.timezone,
      wakeTime: selectedLog.wakeTime,
      sleepTime: selectedLog.sleepTime,
      sleepTimeActual: selectedLog.sleepTimeActual,
      dayNotes: selectedLog.dayNotes,
    },
    tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      notes: task.notes,
      estimatedMinutes: task.estimatedMinutes,
    })),
    calendarEvents,
  );

  const stats = computeJournalStats(journalInput);
  const dateHeader = formatJournalDateHeader(
    selectedLog.date,
    selectedLog.timezone,
  );

  return (
    <JournalPageShell
      sidebarItems={sidebarItems}
      selectedDate={selectedLog.date}
      todayDate={todayDate}
    >
      <JournalPanel
        logId={selectedLog.id}
        dateHeader={dateHeader}
        logStatus={selectedLog.status}
        entry={
          entry
            ? {
                content: entry.content,
                generatedAt: entry.generatedAt.toISOString(),
                editedAt: entry.editedAt?.toISOString() ?? null,
              }
            : null
        }
        stats={stats}
      />
    </JournalPageShell>
  );
}

function JournalPageShell({
  sidebarItems,
  selectedDate,
  todayDate,
  children,
}: {
  sidebarItems: JournalSidebarItem[];
  selectedDate: string | null;
  todayDate: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 lg:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Journal
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse past entries and reflect on your days.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <JournalSidebar
          items={sidebarItems}
          selectedDate={selectedDate}
          todayDate={todayDate}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
