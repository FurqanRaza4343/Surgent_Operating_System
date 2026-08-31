import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClockIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { AuthLayout } from "./AuthLayout";
import { useAuthedFetch } from "../../api/authFetch";
import { getMyApplication, type DoctorApplicationResponse } from "../../api/entities";

const POLL_MS = 8000;

export function DoctorApplyPendingPage() {
  const { authedFetch } = useAuthedFetch();
  const [application, setApplication] = useState<DoctorApplicationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const app = await getMyApplication(authedFetch);
        if (!cancelled) setApplication(app);
      } catch {
        // no application found yet, or a transient error — keep polling
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    }
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authedFetch]);

  if (loading) {
    return (
      <AuthLayout variant="doctor">
        <p className="text-center text-sm text-ink-muted">Checking your application…</p>
      </AuthLayout>);

  }

  if (!application || application.status === "pending") {
    return (
      <AuthLayout variant="doctor">
        <div className="rounded-3xl border border-sand-200 bg-white p-8 text-center shadow-lift">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/8 text-accent-500">
            <ClockIcon className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-600 text-ink">Waiting for approval</h1>
          <p className="mt-2 text-sm text-ink-muted">
            The practice has your application. This page will update automatically once they review it — no need to
            refresh.
          </p>
        </div>
      </AuthLayout>);

  }

  if (application.status === "approved") {
    return (
      <AuthLayout variant="doctor">
        <div className="rounded-3xl border border-sand-200 bg-white p-8 text-center shadow-lift">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
            <CheckCircle2Icon className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-600 text-ink">You&apos;re approved!</h1>
          <p className="mt-2 text-sm text-ink-muted">Your dashboard is ready.</p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-accent-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600">

            Go to dashboard
          </Link>
        </div>
      </AuthLayout>);

  }

  return (
    <AuthLayout variant="doctor">
      <div className="rounded-3xl border border-sand-200 bg-white p-8 text-center shadow-lift">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <XCircleIcon className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-600 text-ink">Application not approved</h1>
        {application.rejected_reason &&
        <p className="mt-2 text-sm text-ink-muted">{application.rejected_reason}</p>
        }
        <Link
          to="/doctor/apply/complete"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600">

          Update and resubmit
        </Link>
      </div>
    </AuthLayout>);

}
