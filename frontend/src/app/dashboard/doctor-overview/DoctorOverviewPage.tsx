import React, { useEffect, useState } from "react";
import { CalendarCheckIcon, ScissorsIcon, UsersIcon, ClockIcon, CalendarIcon } from "lucide-react";
import { KpiCard } from "../components/KpiCard";
import { EmptyState } from "../components/EmptyState";
import { usePlan } from "../plan/PlanContext";
import { getMyDoctor, listMyAppointments, type AppointmentResponse } from "../../../api/entities";

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isUpcoming(iso: string) {
  return new Date(iso).getTime() >= Date.now();
}

export function DoctorOverviewPage() {
  const { authedFetch } = usePlan();
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authedFetch) {
        setLoading(false);
        return;
      }
      try {
        const [doctor, appts] = await Promise.all([
          getMyDoctor(authedFetch).catch(() => null),
          listMyAppointments(authedFetch).catch(() => [])
        ]);
        if (!cancelled) {
          setDoctorName(doctor?.name ?? null);
          setAppointments(appts);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  // Real counts from GET /api/v1/appointments?doctor_id=me — genuinely zero
  // today since real booking (Phase 2) hasn't been wired up yet. Shown as
  // honest zeros rather than fabricated activity.
  const appointmentsToday = appointments.filter((a) => isToday(a.start_time)).length;
  const upcomingSurgeries = appointments.filter(
    (a) => isUpcoming(a.start_time) && a.appointment_type.toLowerCase().includes("surg")
  ).length;
  const patientsUnderCare = new Set(appointments.map((a) => a.patient_id)).size;

  return (
    <>
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-500">My overview</p>
        <h1 className="mt-2 font-display text-[28px] font-600 tracking-tight text-ink sm:text-[32px]">
          {doctorName ? `Good morning, ${doctorName}` : "Good morning"}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
          Your own schedule and caseload, at a glance.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard icon={CalendarCheckIcon} label="Appointments today" value={String(appointmentsToday)} />
        <KpiCard icon={ScissorsIcon} label="Upcoming surgeries" value={String(upcomingSurgeries)} color="#10B981" />
        <KpiCard icon={UsersIcon} label="Patients under care" value={String(patientsUnderCare)} color="#06B6D4" />
      </div>

      <div className="mt-8 rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between border-b border-sand-200 px-5 py-4">
          <p className="text-sm font-bold text-ink">Upcoming appointments</p>
        </div>
        {loading ?
        <p className="px-5 py-8 text-sm text-ink-muted">Loading…</p> :
        appointments.length === 0 ?
        <EmptyState
          icon={ClockIcon}
          title="No appointments yet"
          body="Once patients start booking through the AI Receptionist, your upcoming appointments will show up here." /> :


        <div className="divide-y divide-sand-100">
            {appointments.
            filter((a) => isUpcoming(a.start_time)).
            slice(0, 8).
            map((a) =>
            <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500/10 text-accent-500">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{a.appointment_type}</p>
                  <p className="text-xs text-ink-muted">
                    {new Date(a.start_time).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-sand-100 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">{a.status}</span>
              </div>
            )}
          </div>
        }
      </div>
    </>);

}
