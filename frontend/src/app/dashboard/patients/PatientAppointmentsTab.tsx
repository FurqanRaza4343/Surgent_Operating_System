import React, { useEffect, useState } from "react";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { usePlan } from "../plan/PlanContext";
import { listPracticeAppointments, listMyAppointments, type AppointmentResponse } from "../../../api/entities";
import { EmptyState } from "../components/EmptyState";

const STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-accent-500/10 text-accent-700",
  checked_in: "bg-warning/10 text-warning",
  with_doctor: "bg-warning/10 text-warning",
  ready_for_checkout: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  cancelled: "bg-ink-muted/10 text-ink-muted",
  no_show: "bg-danger/10 text-danger"
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
}

// Doctor sees only their own schedule with this patient (listMyAppointments,
// server-scoped); Owner/Receptionist see every appointment this patient has
// at the clinic (listPracticeAppointments) — matches the same visibility
// split already established for the rest of the dashboard.
export function PatientAppointmentsTab({ patientId }: { patientId: string }) {
  const { authedFetch, role } = usePlan();
  const [appointments, setAppointments] = useState<AppointmentResponse[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!authedFetch) {
      setAppointments([]);
      return;
    }
    const fetcher = role === "doctor" ? listMyAppointments : listPracticeAppointments;
    fetcher(authedFetch)
      .then((all) => { if (!cancelled) setAppointments(all.filter((a) => a.patient_id === patientId)); })
      .catch(() => { if (!cancelled) setAppointments([]); });
    return () => { cancelled = true; };
  }, [authedFetch, role, patientId]);

  if (appointments === null) {
    return <p className="rounded-3xl border border-sand-200 bg-white p-8 text-center text-sm text-ink-muted">Loading…</p>;
  }
  if (appointments.length === 0) {
    return <EmptyState icon={CalendarIcon} title="No appointments" body="No appointments on file for this patient yet." />;
  }

  const sorted = [...appointments].sort((a, b) => +new Date(b.start_time) - +new Date(a.start_time));

  return (
    <div className="space-y-3">
      {sorted.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600/10 text-teal-600">
              <ClockIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{a.appointment_type}</p>
              <p className="text-xs text-ink-muted">{formatDateTime(a.start_time)}</p>
              {a.notes && <p className="mt-0.5 text-xs text-ink-muted">{a.notes}</p>}
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_CLASS[a.status] || "bg-ink-muted/10 text-ink-muted"}`}>
            {a.status.replace(/_/g, " ")}
          </span>
        </div>
      ))}
    </div>
  );
}
