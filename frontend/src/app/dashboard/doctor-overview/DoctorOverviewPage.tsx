import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarCheckIcon,
  ScissorsIcon,
  UsersIcon,
  ClockIcon,
  PlusIcon,
  UserPlusIcon,
  CalendarDaysIcon,
  FileTextIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { KpiCard } from "../components/KpiCard";
import { EmptyState } from "../components/EmptyState";
import { usePlan } from "../plan/PlanContext";
import { getMyDoctor, listMyAppointments, type AppointmentResponse } from "../../../api/entities";
import { DASHBOARD_ROUTES } from "../constants/routes";
import { TodayAgenda, buildMockTodayAgenda } from "./TodayAgenda";
import { PatientQuickSearch } from "./PatientQuickSearch";
import { AttendanceCalendar } from "../attendance/AttendanceCalendar";

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isUpcoming(iso: string) {
  return new Date(iso).getTime() >= Date.now();
}

function isSurgery(type: string) {
  return /surg|plasty|lift|implant|augment|reduc|rhino|facelift|botox|filler/i.test(type);
}

export function DoctorOverviewPage() {
  const { authedFetch, permissions } = usePlan();
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authedFetch) {
        // Demo / signed-out: the agenda paints a believable working day and
        // the KPIs reflect it, so the "My Day" screen reads full rather than
        // an invitation to a blank page.
        setDoctorName(null);
        setAppointments(buildMockTodayAgenda());
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

  const appointmentsToday = appointments.filter((a) => isToday(a.start_time));
  const appointmentsTodayCount = useMemo(() => appointmentsToday.length, [appointmentsToday]);
  const surgeriesCount = useMemo(
    () => appointmentsToday.filter((a) => isSurgery(a.appointment_type)).length,
    [appointmentsToday]
  );
  const patientsUnderCare = useMemo(
    () => new Set(appointmentsToday.map((a) => a.patient_id)).size,
    [appointmentsToday]
  );

  const upcoming = appointments
    .filter((a) => isUpcoming(a.start_time))
    .sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time))
    .slice(0, 5);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-500">My day</p>
          <h1 className="mt-2 font-display text-[28px] font-600 tracking-tight text-ink sm:text-[32px]">
            {doctorName ? `Good morning, ${doctorName}` : "Good morning"}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            {" · "}
            {appointmentsTodayCount > 0
              ? `${appointmentsTodayCount} appointment${appointmentsTodayCount === 1 ? "" : "s"} on your schedule`
              : "A clear day — use the time however you need."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={DASHBOARD_ROUTES.myBook}
            className="flex items-center gap-1.5 rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">
            <PlusIcon className="h-4 w-4" /> Book
          </Link>
          <Link
            to={DASHBOARD_ROUTES.patientNew}
            className="flex items-center gap-1.5 rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">
            <UserPlusIcon className="h-4 w-4" /> Patient
          </Link>
          <Link
            to={DASHBOARD_ROUTES.myCalendar}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
            <CalendarDaysIcon className="h-4 w-4" /> My calendar
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard icon={CalendarCheckIcon} label="Appointments today" value={String(appointmentsTodayCount)} />
        <KpiCard icon={ScissorsIcon} label="Surgeries today" value={String(surgeriesCount)} color="#10B981" />
        <KpiCard icon={UsersIcon} label="Patients today" value={String(patientsUnderCare)} color="#06B6D4" />
      </div>

      <div className="mt-6 max-w-xl">
        <PatientQuickSearch />
      </div>

      <div className="mt-6">
        <TodayAgenda appointments={appointments} loading={loading} />
      </div>

      <div className="mt-6">
        <AttendanceCalendar />
      </div>

      {upcoming.length > 0 && !isToday(upcoming[0].start_time) &&
      <div className="mt-6 rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between border-b border-sand-200 px-5 py-4">
            <p className="text-sm font-bold text-ink">Coming up</p>
            <Link to={DASHBOARD_ROUTES.myCalendar} className="text-xs font-semibold text-teal-600 hover:underline">
              View calendar
            </Link>
          </div>
          <div className="divide-y divide-sand-100">
            {upcoming.map((a) =>
          <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500/10 text-accent-500">
                  <ClockIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{a.appointment_type}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {a.patient_name || "Patient"}
                    {" · "}
                    {new Date(a.start_time).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <Link
                  to={`${DASHBOARD_ROUTES.consultationNoteNew(a.patient_id)}?appointmentId=${a.id}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">
                  <FileTextIcon className="h-3.5 w-3.5" /> Document visit
                </Link>
              </div>
          )}
          </div>
        </div>
      }
    </>);
}