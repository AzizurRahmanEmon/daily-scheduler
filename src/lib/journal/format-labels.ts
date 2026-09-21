import { formatPgTimeLabel } from "@/lib/time-of-day";

export function formatJournalTimeLabel(pgTime: string): string {
  return formatPgTimeLabel(pgTime);
}

export function formatJournalDateHeader(logDate: string, timezone: string): string {
  const [year, month, day] = logDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function journalEntrySnippet(content: string, maxLength = 80): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
}
