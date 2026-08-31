import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon, ClockIcon, FileTextIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { usePlan } from "../plan/PlanContext";
import { listMyAppointments, type AppointmentResponse } from "../../../api/entities";
import { DASHBOARD_ROUTES } from "../constants/routes";

const RECENT_DAYS = 7;

const STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-accent-500/10 text-accent-700",
  confirmed: "bg-success/10 text-success",
  cancelled: "bg-danger/10 text-danger",
  completed: "bg-ink-muted/10 text-ink-muted",
  no_show: "bg-warning/10 text-warning"
};

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function groupByDay(appointments: AppointmentResponse[]) {
  const groups = new Map<string, AppointmentResponse[]>();
  for (const a of appointments) {
    const key = new Date(a.start_time).toDateString();
    groups.set(key, [...(groups.get(key) || []), a]);
  }
  return groups;
}

export function MyCalendarPage() {
  const { authedFetch } = usePlan();
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
        const appts = await listMyAppointments(authedFetch);
        if (!cancelled) setAppointments(appts);
      } catch {
        if (!cancelled) setAppointments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  const upcoming = appointments
    .filter((a) => new Date(a.start_time).getTime() >= Date.now())
    .sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time));
  const grouped = groupByDay(upcoming);

  const recentCompletedCutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
  const recentlyCompleted = appointments
    .filter((a) => a.status === "completed" && new Date(a.start_time).getTime() >= recentCompletedCutoff)
    .sort((a, b) => +new Date(b.start_time) - +new Date(a.start_time));

  return (
    <>
      <PageHeader title="My Calendar" subtitle="Your upcoming appointments, in order." />

      {loading ?
      <p className="text-sm text-ink-muted">Loading…</p> :
      upcoming.length === 0 ?
      <div className="rounded-3xl border border-sand-200 bg-white">
          <EmptyState
          icon={CalendarIcon}
          title="Nothing on your calendar yet"
          body="Once patients start booking through the AI Receptionist, your appointments will appear here in order." />

        </div> :

      <div className="space-y-6">
          {Array.from(grouped.entries()).map(([dayKey, dayAppointments]) =>
        <div key={dayKey} className="rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
              <div className="border-b border-sand-200 px-5 py-3.5">
                <p className="text-sm font-bold text-ink">{dayLabel(dayAppointments[0].start_time)}</p>
              </div>
              <div className="divide-y divide-sand-100">
                {dayAppointments.map((a) =>
            <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500/10 text-accent-500">
                      <ClockIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{a.appointment_type}</p>
                      <p className="text-xs text-ink-muted">
                        {new Date(a.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        {" – "}
                        {new Date(a.end_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASS[a.status] || "bg-sand-100 text-ink-soft"}`}>
                      {a.status}
                    </span>
                  </div>
            )}
              </div>
            </div>
        )}
        </div>
      }

      {recentlyCompleted.length > 0 &&
      <div className="mt-6 rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <div className="border-b border-sand-200 px-5 py-3.5">
            <p className="text-sm font-bold text-ink">Recently completed</p>
          </div>
          <div className="divide-y divide-sand-100">
            {recentlyCompleted.map((a) =>
          <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-muted/10 text-ink-muted">
                  <ClockIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{a.appointment_type}</p>
                  <p className="text-xs text-ink-muted">
                    {new Date(a.start_time).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <Link
              to={`${DASHBOARD_ROUTES.consultationNoteNew(a.patient_id)}?appointmentId=${a.id}`}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">

                  <FileTextIcon className="h-3.5 w-3.5" /> Document this visit
                </Link>
              </div>
          )}
          </div>
        </div>
      }
    </>);

}
