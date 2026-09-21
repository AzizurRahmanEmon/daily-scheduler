export const CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.readonly";

/** Split account.scope on both spaces and commas. */
export function parseAccountScopes(scope: string | null | undefined): string[] {
  if (!scope) {
    return [];
  }
  return scope.split(/[\s,]+/).filter(Boolean);
}

export function hasCalendarReadonlyScope(
  scope: string | null | undefined,
): boolean {
  return parseAccountScopes(scope).some(
    (entry) =>
      entry === CALENDAR_READONLY_SCOPE ||
      entry.endsWith("/auth/calendar.events.readonly"),
  );
}
