import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon, ClockIcon, CheckIcon, PlusIcon, StethoscopeIcon, ReceiptIcon, XCircleIcon, ClipboardListIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { usePlan } from "../plan/PlanContext";
import { useFrontDesk } from "./useFrontDesk";
import { AttendanceCalendar } from "../attendance/AttendanceCalendar";
import { DASHBOARD_ROUTES } from "../constants/routes";
import {
  listWaitlist,
  addToWaitlist,
  fulfillWaitlistEntry,
  cancelWaitlistEntry,
  type WaitlistEntryResponse
} from "../../../api/entities";

const STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-accent-500/10 text-accent-700",
  confirmed: "bg-success/10 text-success",
  checked_in: "bg-teal-600/10 text-teal-600",
  with_doctor: "bg-warning/10 text-warning",
  ready_for_checkout: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
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
  const { appointments, loading, checkIn, startDoctor, readyForCheckout, complete, noShow } = useFrontDesk(authedFetch);
  const [busyId, setBusyId] = useState<string | null>(null);

  const today = appointments
    .filter((a) => isToday(a.start_time))
    .sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time));

  async function run(id: string, action: (id: string) => Promise<void>) {
    setBusyId(id);
    try {
      await action(id);
    } finally {
      setBusyId(null);
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

      <div className="mb-6 max-w-md">
        <AttendanceCalendar />
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
          <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
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
                  {a.status.replace(/_/g, " ")}
                </span>

                <div className="flex shrink-0 items-center gap-1.5">
                  {(a.status === "scheduled" || a.status === "confirmed") &&
              <>
                      <button
                  type="button"
                  onClick={() => run(a.id, checkIn)}
                  disabled={busyId === a.id}
                  className="flex items-center gap-1.5 rounded-xl border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600 disabled:opacity-50">
                        <CheckIcon className="h-3.5 w-3.5" /> {busyId === a.id ? "…" : "Check in"}
                      </button>
                      <button
                  type="button"
                  onClick={() => run(a.id, noShow)}
                  disabled={busyId === a.id}
                  className="flex items-center gap-1.5 rounded-xl border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-warning/40 hover:text-warning disabled:opacity-50">
                        <XCircleIcon className="h-3.5 w-3.5" /> No-show
                      </button>
                    </>
              }
                  {a.status === "checked_in" &&
              <button
                type="button"
                onClick={() => run(a.id, startDoctor)}
                disabled={busyId === a.id}
                className="flex items-center gap-1.5 rounded-xl border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600 disabled:opacity-50">
                      <StethoscopeIcon className="h-3.5 w-3.5" /> {busyId === a.id ? "…" : "With doctor"}
                    </button>
              }
                  {a.status === "with_doctor" &&
              <button
                type="button"
                onClick={() => run(a.id, readyForCheckout)}
                disabled={busyId === a.id}
                className="flex items-center gap-1.5 rounded-xl border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600 disabled:opacity-50">
                      <ReceiptIcon className="h-3.5 w-3.5" /> {busyId === a.id ? "…" : "Ready for checkout"}
                    </button>
              }
                  {a.status === "ready_for_checkout" &&
              <button
                type="button"
                onClick={() => run(a.id, complete)}
                disabled={busyId === a.id}
                className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50">
                      <CheckIcon className="h-3.5 w-3.5" /> {busyId === a.id ? "…" : "Complete"}
                    </button>
              }
                </div>
              </div>
          )}
          </div>
        </div>
      }

      <div className="mt-6">
        <WaitlistSection />
      </div>
    </>);

}

function WaitlistSection() {
  const { authedFetch } = usePlan();
  const [entries, setEntries] = useState<WaitlistEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!authedFetch) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listWaitlist(authedFetch);
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedFetch]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!authedFetch || !name.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await addToWaitlist(authedFetch, { patient_name: name.trim(), phone: phone.trim() || null, notes: notes.trim() || null });
      setName("");
      setPhone("");
      setNotes("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't add to the waitlist — try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleFulfill(id: string) {
    if (!authedFetch) return;
    setBusyId(id);
    try {
      await fulfillWaitlistEntry(authedFetch, id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id: string) {
    if (!authedFetch) return;
    setBusyId(id);
    try {
      await cancelWaitlistEntry(authedFetch, id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2.5 border-b border-sand-100 px-5 py-4">
        <ClipboardListIcon className="h-4 w-4 text-ink-muted" />
        <p className="text-sm font-bold text-ink">Waitlist</p>
      </div>

      <form onSubmit={submit} className="flex flex-wrap items-center gap-2 border-b border-sand-100 px-5 py-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="min-w-0 flex-1 rounded-xl border border-sand-200 bg-canvas px-3.5 py-2 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          className="min-w-0 flex-1 rounded-xl border border-sand-200 bg-canvas px-3.5 py-2 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What are they waiting for?"
          className="min-w-0 flex-[2] rounded-xl border border-sand-200 bg-canvas px-3.5 py-2 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
        <button
          type="submit"
          disabled={adding || !name.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">
          <PlusIcon className="h-3.5 w-3.5" /> Add
        </button>
      </form>
      {error && <p className="px-5 pt-3 text-sm font-medium text-danger">{error}</p>}

      {loading ?
      <p className="px-5 py-6 text-sm text-ink-muted">Loading…</p> :
      entries.length === 0 ?
      <p className="px-5 py-6 text-sm text-ink-muted">No one's waiting for a slot right now.</p> :

      <div className="divide-y divide-sand-100">
          {entries.map((e) =>
        <div key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{e.patient_name}</p>
                <p className="truncate text-xs text-ink-muted">
                  {[e.phone, e.doctor_name, e.notes].filter(Boolean).join(" · ") || "No details"}
                </p>
              </div>
              <button
            type="button"
            onClick={() => handleFulfill(e.id)}
            disabled={busyId === e.id}
            className="flex items-center gap-1.5 rounded-xl border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600 disabled:opacity-50">
                <CheckIcon className="h-3.5 w-3.5" /> Booked
              </button>
              <button
            type="button"
            onClick={() => handleCancel(e.id)}
            disabled={busyId === e.id}
            className="flex items-center gap-1.5 rounded-xl border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50">
                <XCircleIcon className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
        )}
        </div>
      }
    </div>);

}
