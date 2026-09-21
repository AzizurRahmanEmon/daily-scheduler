"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const SIGN_IN_DENIED_MESSAGE = "Sign-in was denied. Please try again.";

function getErrorMessage(errorParam: string | null): string | null {
  if (!errorParam) {
    return null;
  }

  if (errorParam === "not_authorized") {
    return SIGN_IN_DENIED_MESSAGE;
  }

  const normalized = errorParam.toLowerCase();
  if (
    normalized.includes("unable_to_create_user") ||
    normalized.includes("access_denied") ||
    normalized.includes("signup_disabled")
  ) {
    return SIGN_IN_DENIED_MESSAGE;
  }

  return "Sign-in failed. Please try again.";
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    getErrorMessage(searchParams.get("error")),
  );

  async function handleGoogleSignIn() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/wake-up",
        errorCallbackURL: "/login?error=not_authorized",
      });

      if (result.error) {
        setError(SIGN_IN_DENIED_MESSAGE);
        setIsLoading(false);
      }
    } catch {
      setError("Sign-in failed. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-lg font-bold text-white shadow-md">
          DS
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Daily Scheduler</h1>
        <CardDescription>
          Plan your day around your wake-up time, tasks, and calendar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}
        <Button
          fullWidth
          size="lg"
          type="button"
          disabled={isLoading}
          onClick={handleGoogleSignIn}
        >
          <GoogleIcon />
          {isLoading ? "Signing in..." : "Continue with Google"}
        </Button>
        <p className="mt-4 text-center text-xs text-slate-500">
          Sign in with Google to access your daily schedule.
        </p>
      </CardContent>
    </Card>
  );
}
