import React, { useEffect, useState } from "react";
import { LogInIcon, LogOutIcon, ClockIcon } from "lucide-react";
import { usePlan } from "../plan/PlanContext";
import { checkIn, checkOut, listMyAttendance, type AttendanceRecordResponse } from "../../../api/entities";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Simple daily check-in/check-out — backend/src/services/attendance/. Only
// rendered when the doctor has been granted `mark_attendance` (see
// DoctorOverviewPage.tsx), matching how the rest of the doctor dashboard's
// optional surfaces are permission-gated.
export function AttendanceCard() {
  const { authedFetch } = usePlan();
  const [records, setRecords] = useState<AttendanceRecordResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!authedFetch) return;
    try {
      const history = await listMyAttendance(authedFetch);
      setRecords(history);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedFetch]);

  const openRecord = records.find((r) => !r.check_out_at);

  async function handleCheckIn() {
    if (!authedFetch) return;
    setBusy(true);
    setError(null);
    try {
      await checkIn(authedFetch);
      await refresh();
    } catch {
      setError("Couldn't check in — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut() {
    if (!authedFetch) return;
    setBusy(true);
    setError(null);
    try {
      await checkOut(authedFetch);
      await refresh();
    } catch {
      setError("Couldn't check out — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-sand-200 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2 text-sm font-bold text-ink">
        <ClockIcon className="h-4 w-4 text-accent-500" /> Attendance
      </div>

      {loading ?
      <p className="mt-3 text-sm text-ink-muted">Loading…</p> :
      openRecord ?
      <>
          <p className="mt-2 text-xs text-ink-muted">Checked in at {formatTime(openRecord.check_in_at)}</p>
          <button
          type="button"
          onClick={handleCheckOut}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-50">

            <LogOutIcon className="h-4 w-4" /> {busy ? "Checking out…" : "Check out"}
          </button>
        </> :

      <>
          <p className="mt-2 text-xs text-ink-muted">Not checked in yet today.</p>
          <button
          type="button"
          onClick={handleCheckIn}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:opacity-50">

            <LogInIcon className="h-4 w-4" /> {busy ? "Checking in…" : "Check in"}
          </button>
        </>
      }
      {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
    </div>);

}
