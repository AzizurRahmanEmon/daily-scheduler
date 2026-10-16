const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dhaka",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

export function getIanaTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone").sort();
  }
  return FALLBACK_TIMEZONES;
}

export function isValidIanaTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** Common labels users type instead of IANA IDs (keys are normalized). */
const TIMEZONE_ALIASES: Record<string, string> = {
  "gmt+6": "Asia/Dhaka",
  "utc+6": "Asia/Dhaka",
  "gmt+06": "Asia/Dhaka",
  "utc+06": "Asia/Dhaka",
  "gmt+06:00": "Asia/Dhaka",
  "utc+06:00": "Asia/Dhaka",
  "bangladesh": "Asia/Dhaka",
  "dhaka": "Asia/Dhaka",
};

function normalizeTimezoneKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Map friendly timezone labels to IANA IDs. Passes through valid IANA names unchanged.
 */
export function normalizeTimezoneInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (isValidIanaTimezone(trimmed)) {
    return trimmed;
  }

  const aliasKey = normalizeTimezoneKey(trimmed);
  const alias = TIMEZONE_ALIASES[aliasKey];
  if (alias) {
    return alias;
  }

  const offsetMatch = aliasKey.match(/^(gmt|utc)([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (offsetMatch) {
    const sign = offsetMatch[2];
    const hours = Number(offsetMatch[3]);
    const minutes = offsetMatch[4] ? Number(offsetMatch[4]) : 0;

    if (sign === "+" && hours === 6 && minutes === 0) {
      return "Asia/Dhaka";
    }
  }

  return trimmed;
}

/** IANA timezone from the browser / OS (client-only). */
export function getBrowserIanaTimezone(): string | null {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") {
    return null;
  }

  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone || !isValidIanaTimezone(zone)) {
      return null;
    }
    return zone;
  } catch {
    return null;
  }
}
