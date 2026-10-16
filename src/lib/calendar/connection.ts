import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { account } from "@/db/auth-schema";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { hasCalendarReadonlyScope } from "@/lib/calendar/scope";
import {
  GoogleCalendarAuthError,
  probeGoogleCalendarApi,
} from "@/lib/google-calendar/fetch-events";

export type CalendarConnectionStatus =
  | "not_connected"
  | "connected"
  | "needs_reconnect";

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

export async function getCalendarConnectionStatus(
  userId: string,
): Promise<CalendarConnectionStatus> {
  const googleAccount = await getGoogleAccountForUser(userId);

  if (!hasOfflineCredentials(googleAccount)) {
    return "not_connected";
  }

  try {
    const accessToken = await getGoogleAccessTokenForUser(userId);
    const probe = await probeGoogleCalendarApi(accessToken);

    if (probe === "auth_error") {
      return "needs_reconnect";
    }

    if (probe === "forbidden" || probe === "failed") {
      return "needs_reconnect";
    }

    return "connected";
  } catch (error) {
    if (error instanceof GoogleCalendarAuthError) {
      return "needs_reconnect";
    }
    return "needs_reconnect";
  }
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
