import { headers } from "next/headers";
import { APIError } from "@better-auth/core/error";
import { account } from "@/db/auth-schema";
import { auth } from "@/lib/auth";

type GoogleAccountRow = typeof account.$inferSelect;
import { GoogleCalendarAuthError } from "@/lib/google-calendar/fetch-events";

function isAuthRelatedError(error: unknown): boolean {
  if (error instanceof GoogleCalendarAuthError) {
    return true;
  }

  if (error instanceof APIError) {
    const code = String((error as APIError & { code?: string }).code ?? "");
    return (
      code === "FAILED_TO_GET_ACCESS_TOKEN" ||
      code === "REFRESH_TOKEN_NOT_FOUND" ||
      code === "UNAUTHORIZED" ||
      code === "ACCOUNT_NOT_FOUND"
    );
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("invalid_grant") ||
      message.includes("unauthorized") ||
      message.includes("refresh token") ||
      message.includes("access token")
    );
  }

  return false;
}

async function refreshAccessTokenWithGoogle(
  refreshToken: string,
): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client is not configured.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    cache: "no-store",
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    const detail =
      payload.error_description ?? payload.error ?? `HTTP ${response.status}`;
    if (
      payload.error === "invalid_grant" ||
      detail.toLowerCase().includes("invalid_grant")
    ) {
      throw new GoogleCalendarAuthError();
    }
    throw new Error(`Google token refresh failed: ${detail}`);
  }

  return payload.access_token;
}

async function getAccessTokenViaBetterAuth(
  accountId: string,
  userId: string,
  withRequestHeaders: boolean,
): Promise<string> {
  const tokenResult = await auth.api.getAccessToken({
    body: { accountId, userId },
    ...(withRequestHeaders ? { headers: await headers() } : {}),
  });

  if (!tokenResult?.accessToken) {
    throw new GoogleCalendarAuthError("Missing Google access token");
  }

  return tokenResult.accessToken;
}

/**
 * Resolve a valid Google access token for Calendar API calls.
 * Tries Better Auth (server-trusted, then session), then direct refresh.
 */
export async function resolveGoogleCalendarAccessToken(
  userId: string,
  googleAccount: GoogleAccountRow,
): Promise<string> {
  const attempts: Array<() => Promise<string>> = [
    () => getAccessTokenViaBetterAuth(googleAccount.id, userId, false),
    () => getAccessTokenViaBetterAuth(googleAccount.id, userId, true),
  ];

  if (googleAccount.refreshToken) {
    attempts.push(() =>
      refreshAccessTokenWithGoogle(googleAccount.refreshToken!),
    );
  }

  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      if (isAuthRelatedError(error)) {
        continue;
      }
      throw error;
    }
  }

  if (isAuthRelatedError(lastError)) {
    throw new GoogleCalendarAuthError();
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not resolve Google access token");
}
