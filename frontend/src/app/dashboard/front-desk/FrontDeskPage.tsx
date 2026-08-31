import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon, ClockIcon, CheckIcon, PlusIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { usePlan } from "../plan/PlanContext";
import { useFrontDesk } from "./useFrontDesk";
import { DASHBOARD_ROUTES } from "../constants/routes";

const STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-accent-500/10 text-accent-700",
  confirmed: "bg-success/10 text-success",
  checked_in: "bg-teal-600/10 text-teal-600",
  cancelled: "bg-danger/10 text-danger",
  completed: "bg-ink-muted/10 text-ink-muted",
  no_show: "bg-warning/10 text-warning"
};

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function FrontDeskPage() {
  const { authedFetch } = usePlan();
  const { appointments, loading, checkIn } = useFrontDesk(authedFetch);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const today = appointments
    .filter((a) => isToday(a.start_time))
    .sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time));

  async function handleCheckIn(id: string) {
    setCheckingInId(id);
    try {
      await checkIn(id);
    } finally {
      setCheckingInId(null);
    }
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader title="Front Desk" subtitle="Every doctor's schedule for today, across the whole practice." />
        <Link
          to={DASHBOARD_ROUTES.bookAppointment}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">

          <PlusIcon className="h-4 w-4" /> Book appointment
        </Link>
      </div>

      {loading ?
      <p className="text-sm text-ink-muted">Loading…</p> :
      today.length === 0 ?
      <div className="rounded-3xl border border-sand-200 bg-white">
          <EmptyState icon={CalendarIcon} title="Nothing on today's schedule" body="Appointments booked for today will appear here." />
        </div> :

      <div className="rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <div className="divide-y divide-sand-100">
            {today.map((a) =>
          <div key={a.id} className="flex items-center gap-3 px-5 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-200 text-sm font-bold text-ink-soft">
                  {a.patientInitial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{a.patientName}</p>
                  <p className="flex items-center gap-1 text-xs text-ink-muted">
                    <ClockIcon className="h-3 w-3" />
                    {new Date(a.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    {" · "}{a.appointment_type}
                    {a.doctorName && <> · {a.doctorName}</>}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_CLASS[a.status] || "bg-sand-100 text-ink-soft"}`}>
                  {a.status.replace("_", " ")}
                </span>
                {(a.status === "scheduled" || a.status === "confirmed") &&
            <button
              type="button"
              onClick={() => handleCheckIn(a.id)}
              disabled={checkingInId === a.id}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600 disabled:opacity-50">

                    <CheckIcon className="h-3.5 w-3.5" /> {checkingInId === a.id ? "Checking in…" : "Check in"}
                  </button>
            }
              </div>
          )}
          </div>
        </div>
      }
    </>);

}
