import React from "react";
import { Link, Navigate } from "react-router-dom";
import { LockIcon, Loader2Icon } from "lucide-react";
import { useAdminAccess } from "./useAdminAccess";
import { ADMIN_ROUTES } from "./constants/routes";
import { getAdminToken } from "../../api/admin";

// Gates every /admin/* route except sign-in. Deliberately fails CLOSED with
// no dev bypass (unlike ../auth/RequireAuth.tsx's `if (!clerkEnabled) return
// children`) — this panel edits live pricing, so there's no safe "just let
// anyone in" fallback. See app/admin/README.md.
export function AdminRequireAuth({ children }: { children: React.ReactNode }) {
  if (!getAdminToken()) {
    return <Navigate to={ADMIN_ROUTES.signIn} replace />;
  }
  return <AdminGate>{children}</AdminGate>;
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const { status } = useAdminAccess();

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loader2Icon className="h-6 w-6 animate-spin text-accent-500" />
      </div>);

  }

  if (status === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="w-full max-w-sm rounded-3xl border border-sand-200 bg-white p-8 text-center shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <LockIcon className="h-6 w-6" />
          </span>
          <p className="mt-4 text-lg font-bold text-ink">Session expired</p>
          <p className="mt-1.5 text-sm text-ink-muted">Please sign in again.</p>
          <Link
            to={ADMIN_ROUTES.signIn}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600">

            Sign in
          </Link>
        </div>
      </div>);

  }

  return <>{children}</>;
}
