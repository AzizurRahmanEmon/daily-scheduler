import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { account } from "@/db/auth-schema";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { hasCalendarReadonlyScope } from "@/lib/calendar/scope";
import { GoogleCalendarAuthError } from "@/lib/google-calendar/fetch-events";

export type CalendarConnectionStatus =
  | "not_connected"
  | "connected"
  | "needs_reconnect";

const PROBE_TIMEOUT_MS = 3000;

export type GoogleAccountRow = typeof account.$inferSelect;

export async function getGoogleAccountForUser(
  userId: string,
): Promise<GoogleAccountRow | null> {
  const [row] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1);

  return row ?? null;
}

function hasOfflineCredentials(googleAccount: GoogleAccountRow | null): boolean {
  if (!googleAccount) {
    return false;
  }
  return (
    hasCalendarReadonlyScope(googleAccount.scope) &&
    Boolean(googleAccount.refreshToken)
  );
}

function isAuthProbeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("invalid_grant") ||
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("token")
  );
}

async function probeGoogleAccessToken(
  accountId: string,
): Promise<"ok" | "auth_error" | "timeout"> {
  const probe = auth.api.getAccessToken({
    body: { accountId },
    headers: await headers(),
  });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const result = await Promise.race([
      probe,
      new Promise<"timeout">((resolve) => {
        timeoutId = setTimeout(() => resolve("timeout"), PROBE_TIMEOUT_MS);
      }),
    ]);

    if (result === "timeout") {
      return "timeout";
    }

    return "ok";
  } catch (error) {
    if (isAuthProbeError(error)) {
      return "auth_error";
    }
    return "timeout";
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function getCalendarConnectionStatus(
  userId: string,
): Promise<CalendarConnectionStatus> {
  const googleAccount = await getGoogleAccountForUser(userId);

  if (!hasOfflineCredentials(googleAccount)) {
    return "not_connected";
  }

  const probe = await probeGoogleAccessToken(googleAccount!.id);

  if (probe === "auth_error") {
    return "needs_reconnect";
  }

  return "connected";
}

export async function getGoogleAccessTokenForUser(
  userId: string,
): Promise<string> {
  const googleAccount = await getGoogleAccountForUser(userId);

  if (!hasOfflineCredentials(googleAccount)) {
    throw new GoogleCalendarAuthError("Google Calendar is not connected");
  }

  try {
    const tokenResult = await auth.api.getAccessToken({
      body: { accountId: googleAccount!.id },
      headers: await headers(),
    });

    if (!tokenResult?.accessToken) {
      throw new GoogleCalendarAuthError("Missing Google access token");
    }

    return tokenResult.accessToken;
  } catch (error) {
    if (isAuthProbeError(error)) {
      throw new GoogleCalendarAuthError();
    }
    throw error;
  }
}
