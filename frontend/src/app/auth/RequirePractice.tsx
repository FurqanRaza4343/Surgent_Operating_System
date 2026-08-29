import React from "react";
import { Link } from "react-router-dom";
import { SparklesIcon } from "lucide-react";
import { readPlanOverride } from "../dashboard/plan/plan";

const clerkEnabled = false; // TEMP-TEST-BYPASS

// Closes (partially — see the note below) the gap app/auth/README.md
// documents: RequireAuth only proves someone is signed in, not that they
// belong to a practice with an active plan. A real Clerk user who never went
// through /onboarding/claim (never bought a plan, or bought one before this
// existed) sees a friendly nudge to pricing instead of silently landing on a
// Solo-shaped dashboard that isn't really theirs.
//
// NOTE: this is a presentation-layer check only, same caveat as everywhere
// else in dashboard/plan/ — it looks for the local plan override
// (planStorage.ts), not a real backend practice record (doesn't exist yet,
// see backend Phase 4 in the plan doc). Degrades to "always allow" when
// Clerk itself is disabled, so local dev/testing (including Plan & Billing's dev switch buttons)
// is never blocked by this.
export function RequirePractice({ children }: { children: React.ReactNode }) {
  if (!clerkEnabled) return <>{children}</>;
  if (readPlanOverride()) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm rounded-3xl border border-sand-200 bg-white p-8 text-center shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600/8 text-teal-600">
          <SparklesIcon className="h-6 w-6" />
        </span>
        <p className="mt-4 text-lg font-bold text-ink">No active plan yet</p>
        <p className="mt-1.5 text-sm text-ink-muted">
          Your account isn't linked to a plan yet — pick one to get your dashboard set up.
        </p>
        <Link
          to="/#pricing"
          className="mt-6 block w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">

          See plans
        </Link>
      </div>
    </div>);

}
