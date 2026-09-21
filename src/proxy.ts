import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

function isPublicPath(pathname: string): boolean {
  return pathname === "/login";
}

function isStaticOrAuthApi(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticOrAuthApi(pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(getSessionCookie(request));

  if (isPublicPath(pathname)) {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL("/wake-up", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
