import React from "react";
import { Link } from "react-router-dom";
import { ClockIcon, FileTextIcon, PlayCircleIcon, UserCircleIcon } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { MOCK_PATIENTS } from "../data/mockPatients";
import { DASHBOARD_ROUTES } from "../constants/routes";
import type { AppointmentResponse } from "../../../api/entities";

const STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-accent-500/10 text-accent-700",
  confirmed: "bg-success/10 text-success",
  checked_in: "bg-teal-600/10 text-teal-600",
  cancelled: "bg-danger/10 text-danger",
  completed: "bg-ink-muted/10 text-ink-muted",
  no_show: "bg-warning/10 text-warning"
};

function timeRange(a: AppointmentResponse) {
  const start = new Date(a.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = new Date(a.end_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${start} – ${end}`;
}

// Demo (signed-out) stand-in: a believable today-schedule built from the mock
// patient roster so the "My Day" screen reads as a full working day instead of
// an empty list. Real sessions replace this with the API's own records — this
// array is never mixed with real data.
export function buildMockTodayAgenda(): AppointmentResponse[] {
  const now = new Date();
  const at = (hour: number, minute: number) => {
    const d = new Date(now);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const raws: Array<{ patient: (typeof MOCK_PATIENTS)[number]; type: string; hour: number; minute: number }> = [
    { patient: MOCK_PATIENTS[3], type: "Rhinoplasty consultation", hour: 9, minute: 0 },
    { patient: MOCK_PATIENTS[4], type: "Botox follow-up", hour: 10, minute: 30 },
    { patient: MOCK_PATIENTS[0], type: "Rhinoplasty surgery", hour: 11, minute: 45 },
    { patient: MOCK_PATIENTS[5], type: "Facelift consultation", hour: 14, minute: 0 },
    { patient: MOCK_PATIENTS[1], type: "Post-op check-in", hour: 15, minute: 45 },
    { patient: MOCK_PATIENTS[2], type: "Healing follow-up", hour: 17, minute: 0 }
  ];
  return raws.map((r, i) => ({
    id: `mock-appt-${i}`,
    practice_id: "mock",
    patient_id: r.patient.id,
    doctor_id: null,
    appointment_type: r.type,
    status: "scheduled",
    start_time: at(r.hour, r.minute),
    end_time: at(r.hour, r.minute + 30),
    checked_in_at: null,
    notes: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    patient_name: r.patient.name
  }));
}

function timeToMinutes(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function TodayAgenda({ appointments, loading }: { appointments: AppointmentResponse[]; loading: boolean }) {
  const sorted = [...appointments].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  const nowMs = Date.now();
  let nowIndex = -1;
  for (let i = 0; i < sorted.length; i++) {
    const s = +new Date(sorted[i].start_time);
    const e = +new Date(sorted[i].end_time);
    if (s <= nowMs && e >= nowMs) {
      nowIndex = i;
      break;
    }
  }
  const nextIndex = nowIndex === -1 ? sorted.findIndex((a) => +new Date(a.start_time) > nowMs) : -1;

  return (
    <div className="rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between border-b border-sand-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-ink">Today&apos;s schedule</p>
          {sorted.length > 0 &&
          <span className="rounded-full bg-teal-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-teal-600">
              {sorted.length}
            </span>
          }
        </div>
        <span className="text-xs text-ink-muted">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </span>
      </div>

      {loading ?
      <p className="px-5 py-8 text-sm text-ink-muted">Loading…</p> :
      sorted.length === 0 ?
      <EmptyState
        icon={ClockIcon}
        title="Nothing scheduled for today"
        body="New appointments booked through the AI Receptionist will land here in order." /> :

      <div className="divide-y divide-sand-100">
          {sorted.map((a, i) => {
          const isNow = i === nowIndex;
          const isNext = i === nextIndex;
          return (
            <div
              key={a.id}
              className={`flex flex-wrap items-center gap-3 px-5 py-3.5 ${isNow ? "bg-teal-600/[0.04]" : ""}`}>

              <div className="w-[86px] shrink-0">
                {isNow ?
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    <PlayCircleIcon className="h-3 w-3" /> Now
                  </span> :
                isNext ?
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-700">
                    <ClockIcon className="h-3 w-3" /> Up next
                  </span> :
                <span className="text-xs font-semibold tabular-nums text-ink-muted">{timeRange(a)}</span>
                }
              </div>

              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-200 text-sm font-bold text-ink-soft">
                {a.patient_name ? a.patient_name[0]?.toUpperCase() : "?"}
              </span>

              <div className="min-w-0 flex-1">
                <Link
                  to={DASHBOARD_ROUTES.patientDetail(a.patient_id)}
                  className="block truncate text-sm font-semibold text-ink hover:text-teal-600">
                  {a.patient_name || "Patient"}
                </Link>
                <p className="truncate text-xs text-ink-muted">
                  {a.appointment_type}{!isNow && !isNext ? ` · ${timeRange(a)}` : ""}
                </p>
              </div>

              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_CLASS[a.status] || "bg-sand-100 text-ink-soft"}`}>
                {a.status.replace("_", " ")}
              </span>

              <Link
                to={`${DASHBOARD_ROUTES.consultationNoteNew(a.patient_id)}?appointmentId=${a.id}`}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">
                <FileTextIcon className="h-3.5 w-3.5" /> Document visit
              </Link>
            </div>
          );
        })}
        </div>
      }
    </div>
  );
}