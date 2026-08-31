import React from "react";
import { UsersIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { usePlan } from "../plan/PlanContext";
import { useFrontDesk, type FrontDeskAppointment } from "./useFrontDesk";

type CheckedInAppointment = FrontDeskAppointment & { checked_in_at: string };

function isCheckedIn(a: FrontDeskAppointment): a is CheckedInAppointment {
  return a.status === "checked_in" && Boolean(a.checked_in_at);
}

function waitTime(checkedInAt: string) {
  const mins = Math.round((Date.now() - new Date(checkedInAt).getTime()) / 60000);
  if (mins < 1) return "just now";
  return `${mins}m waiting`;
}

export function WaitingRoomPage() {
  const { authedFetch } = usePlan();
  const { appointments, loading } = useFrontDesk(authedFetch);

  const waiting = appointments
    .filter(isCheckedIn)
    .sort((a, b) => +new Date(a.checked_in_at) - +new Date(b.checked_in_at));

  return (
    <>
      <PageHeader title="Waiting Room" subtitle="Patients who've checked in and are waiting to be seen, earliest first." />

      {loading ?
      <p className="mt-6 text-sm text-ink-muted">Loading…</p> :
      waiting.length === 0 ?
      <div className="mt-6 rounded-3xl border border-sand-200 bg-white">
          <EmptyState icon={UsersIcon} title="Waiting room is empty" body="Patients checked in from the Front Desk will show up here." />
        </div> :

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {waiting.map((a) =>
        <div key={a.id} className="rounded-3xl border border-sand-200 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-600/8 text-sm font-bold text-teal-600">
                  {a.patientInitial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{a.patientName}</p>
                  <p className="truncate text-xs text-ink-muted">{a.appointment_type}{a.doctorName && ` · ${a.doctorName}`}</p>
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold text-teal-600">{waitTime(a.checked_in_at)}</p>
            </div>
        )}
        </div>
      }
    </>);

}
