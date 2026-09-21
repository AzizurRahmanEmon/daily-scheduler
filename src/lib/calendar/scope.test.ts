import { describe, expect, it } from "vitest";
import {
  CALENDAR_READONLY_SCOPE,
  hasCalendarReadonlyScope,
  parseAccountScopes,
} from "./scope";

describe("parseAccountScopes", () => {
  it("splits on spaces and commas", () => {
    expect(
      parseAccountScopes(
        "openid email profile,https://www.googleapis.com/auth/calendar.events.readonly",
      ),
    ).toEqual([
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.events.readonly",
    ]);
  });

  it("returns empty array for nullish scope", () => {
    expect(parseAccountScopes(null)).toEqual([]);
    expect(parseAccountScopes(undefined)).toEqual([]);
  });
});

describe("hasCalendarReadonlyScope", () => {
  it("detects the full calendar readonly scope", () => {
    expect(
      hasCalendarReadonlyScope(
        `openid email ${CALENDAR_READONLY_SCOPE}`,
      ),
    ).toBe(true);
  });

  it("detects comma-separated scopes", () => {
    expect(
      hasCalendarReadonlyScope(`openid,${CALENDAR_READONLY_SCOPE},profile`),
    ).toBe(true);
  });

  it("returns false without calendar scope", () => {
    expect(hasCalendarReadonlyScope("openid email profile")).toBe(false);
  });
});
