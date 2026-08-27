import React from "react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { ActivityIcon } from "lucide-react";

// Same graceful-degradation pattern used everywhere else Clerk is touched
// (see index.tsx, components/layout/Navbar.tsx) — a clone without
// VITE_CLERK_PUBLISHABLE_KEY set keeps the dashboard reachable rather than
// throwing, since ClerkProvider itself isn't mounted in that case.
const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!clerkEnabled) return <>{children}</>;

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
    </>);

}

function SignInScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm rounded-3xl border border-sand-200 bg-white p-8 text-center shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white">
          <ActivityIcon className="h-6 w-6" strokeWidth={2.4} />
        </span>
        <p className="mt-4 text-lg font-bold text-ink">Sign in to your practice</p>
        <p className="mt-1.5 text-sm text-ink-muted">
          The dashboard is only visible to your practice's signed-in staff.
        </p>
        <SignInButton mode="modal">
          <button className="mt-6 w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
            Sign in
          </button>
        </SignInButton>
      </div>
    </div>);

}
