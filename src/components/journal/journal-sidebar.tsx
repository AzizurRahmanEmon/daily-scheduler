import Link from "next/link";
import type { JournalSidebarItem } from "@/db/queries/journal";

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 text-teal-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function formatSidebarDate(date: string): { label: string; weekday: string } {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return {
    label: value.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weekday: value.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

function SidebarRow({
  item,
  selectedDate,
  todayDate,
}: {
  item: JournalSidebarItem;
  selectedDate: string | null;
  todayDate: string | null;
}) {
  const { label, weekday } = formatSidebarDate(item.date);
  const isSelected = item.date === selectedDate;
  const isToday = item.date === todayDate;

  return (
    <Link
      href={`/journal?date=${item.date}`}
      aria-current={isSelected ? "date" : undefined}
      className={`flex w-full shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors lg:w-auto ${
        isSelected
          ? "border border-teal-200 bg-teal-50 shadow-sm"
          : "border border-transparent hover:bg-slate-100"
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <CheckIcon />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm ${isSelected ? "font-semibold text-teal-900" : "font-medium text-slate-800"}`}
        >
          {label}
        </span>
        <span className="block truncate text-xs text-slate-500">{item.snippet}</span>
        <span className="block text-xs text-slate-500 lg:hidden">{weekday}</span>
      </span>
      {isToday && (
        <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700">
          Today
        </span>
      )}
    </Link>
  );
}

type JournalSidebarProps = {
  items: JournalSidebarItem[];
  selectedDate: string | null;
  todayDate: string | null;
};

export function JournalSidebar({
  items,
  selectedDate,
  todayDate,
}: JournalSidebarProps) {
  return (
    <aside className="shrink-0 lg:w-64">
      <div className="mb-3 px-1 lg:px-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Past entries
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="px-1 text-sm text-slate-500">No journal entries yet.</p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {items.map((item) => (
              <div key={item.date} className="w-[180px]">
                <SidebarRow
                  item={item}
                  selectedDate={selectedDate}
                  todayDate={todayDate}
                />
              </div>
            ))}
          </div>

          <div className="hidden max-h-[calc(100vh-12rem)] space-y-1 overflow-y-auto pr-1 lg:block">
            {items.map((item) => (
              <SidebarRow
                key={item.date}
                item={item}
                selectedDate={selectedDate}
                todayDate={todayDate}
              />
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
