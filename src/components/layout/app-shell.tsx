"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";

const navItems = [
  { href: "/login", label: "Login" },
  { href: "/wake-up", label: "Wake Up" },
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar-review", label: "Calendar" },
  { href: "/meals-appointments", label: "Meals" },
  { href: "/schedule", label: "Schedule" },
  { href: "/end-of-day", label: "End of Day" },
  { href: "/journal", label: "Journal" },
  { href: "/settings", label: "Settings" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-teal-50 text-teal-800"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const showSignOut = pathname !== "/login";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar — fixed full height so main content aligns beside it */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-slate-200/80 bg-white lg:flex"
      >
        <div className="flex h-full min-h-screen flex-col p-5">
          <div className="mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white">
              DS
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              Daily Scheduler
            </p>
            <p className="text-xs text-slate-500">Plan your day with ease</p>
          </div>
          <NavLinks />
          {showSignOut && (
            <div className="mt-auto border-t border-slate-200/80 pt-4">
              <SignOutButton />
            </div>
          )}
        </div>
      </aside>

      {/* Main column offset by sidebar width on large screens */}
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-56">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white">
              DS
            </div>
            <span className="text-sm font-semibold text-slate-900">
              Daily Scheduler
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Toggle navigation"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </header>

        {mobileOpen && (
          <div className="border-b border-slate-200/80 bg-white px-4 py-3 lg:hidden">
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            {showSignOut && (
              <div className="mt-3 border-t border-slate-200/80 pt-3">
                <SignOutButton />
              </div>
            )}
          </div>
        )}

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
