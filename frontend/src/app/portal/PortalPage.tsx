import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  CalendarIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  ReceiptIcon,
  PhoneIcon,
  MailIcon,
  FileTextIcon,
  ClockIcon,
  LoaderIcon,
  CameraIcon,
  CalendarPlusIcon,
  DollarSignIcon,
  CheckCircle2Icon
} from "lucide-react";
import { Logo } from "../../components/ui";
import {
  portalBookAppointment,
  type PortalPatientResponse
} from "../../api/entities";

type Tab = "book" | "appointments" | "photos" | "consent" | "invoices";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-success/10 text-success",
  completed: "bg-teal-600/10 text-teal-600",
  cancelled: "bg-ink-muted/10 text-ink-muted",
  signed: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning",
  sent: "bg-teal-600/10 text-teal-600",
  void: "bg-ink-muted/10 text-ink-muted",
  paid: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  overdue: "bg-danger/10 text-danger"
};

export function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalPatientResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("appointments");

  const load = async (tok: string) => {
    try {
      const res = await fetch(`/api/v1/patient-portal/${encodeURIComponent(tok)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body?.detail === "string" ? body.detail : "This portal link is invalid or no longer active.");
        return;
      }
      const json: PortalPatientResponse = await res.json();
      setData(json);
    } catch {
      setError("Couldn't load your portal. Please try again.");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        if (!cancelled) setError("This portal link is invalid.");
        setLoading(false);
        return;
      }
      await load(token);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleBooked(newData: PortalPatientResponse) {
    setData(newData);
    setTab("appointments");
  }

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <header className="border-b border-sand-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-sand-200 bg-white">
              <Logo className="h-5 w-5" />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-ink">Aiaceone</span>
          </Link>
          {data && <span className="text-sm text-ink-muted">Patient Portal</span>}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {loading &&
        <div className="flex items-center gap-3 text-sm text-ink-muted">
            <LoaderIcon className="h-5 w-5 animate-spin text-teal-600" /> Loading your portal…
          </div>
        }

        {!loading && error &&
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-sand-200 bg-white p-10 text-center shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
              <ShieldAlertIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Portal unavailable</p>
              <p className="mt-1 text-sm text-ink-muted">{error}</p>
            </div>
            <Link to="/" className="text-sm font-semibold text-teal-600 hover:underline">Back to Aiaceone</Link>
          </div>
        }

        {!loading && !error && data &&
        <>
            <div className="mb-4 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sand-200 text-lg font-bold text-ink-soft">
                    {data.first_name.charAt(0)}{data.last_name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-lg font-bold text-ink">{data.first_name} {data.last_name}</p>
                    <p className="text-xs text-ink-muted">Welcome back — here&apos;s your care overview.</p>
                  </div>
                </div>
                {data.consent_status ?
                <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                    <ShieldCheckIcon className="h-3.5 w-3.5" /> Consent on file
                  </span> :
                <span className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning">
                    <ShieldAlertIcon className="h-3.5 w-3.5" /> Consent pending
                  </span>
                }
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-2.5 rounded-xl bg-sand-100 px-4 py-3">
                  <MailIcon className="h-4 w-4 text-ink-muted" />
                  <span className="truncate text-sm text-ink-soft">{data.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-sand-100 px-4 py-3">
                  <PhoneIcon className="h-4 w-4 text-ink-muted" />
                  <span className="text-sm text-ink-soft">{data.phone || "—"}</span>
                </div>
              </div>

              {data.chief_complaint &&
              <p className="mt-4 rounded-xl bg-sand-100 px-4 py-3 text-sm leading-relaxed text-ink-soft">
                  <span className="font-semibold text-ink">What you&apos;re here for: </span>
                  {data.chief_complaint}
                </p>
              }
            </div>

            {data.invoice_total_pending > 0 &&
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-3xl border border-warning/25 bg-warning/[0.04] p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                  <DollarSignIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">Balance due</p>
                  <p className="text-xs text-ink-muted">
                    ${data.invoice_total_pending.toFixed(2)} outstanding — see the Invoices tab for details.
                  </p>
                </div>
              </div>
            }

            <div className="mb-6 flex flex-wrap gap-2">
              <TabButton active={tab === "book"} onClick={() => setTab("book")} icon={<CalendarPlusIcon className="h-3.5 w-3.5" />} label="Book appointment" />
              <TabButton active={tab === "appointments"} onClick={() => setTab("appointments")} icon={<CalendarIcon className="h-3.5 w-3.5" />} label={`Appointments (${data.appointments.length})`} />
              <TabButton active={tab === "photos"} onClick={() => setTab("photos")} icon={<CameraIcon className="h-3.5 w-3.5" />} label={`Photos (${data.photos.length})`} />
              <TabButton active={tab === "consent"} onClick={() => setTab("consent")} icon={<FileTextIcon className="h-3.5 w-3.5" />} label={`Consent (${data.consent_documents.length})`} />
              <TabButton active={tab === "invoices"} onClick={() => setTab("invoices")} icon={<ReceiptIcon className="h-3.5 w-3.5" />} label={`Invoices (${data.invoices.length})`} />
            </div>

            {tab === "book" && token && <BookTab token={token} onBooked={handleBooked} patientName={`${data.first_name} ${data.last_name}`} />}
            {tab === "appointments" && <AppointmentsTab appointments={data.appointments} />}
            {tab === "photos" && <PhotosTab photos={data.photos} />}
            {tab === "consent" && <ConsentTab documents={data.consent_documents} />}
            {tab === "invoices" && <InvoicesTab invoices={data.invoices} />}
          </>
        }
      </main>
    </div>);
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-teal-600 text-white" : "bg-white text-ink-soft hover:bg-sand-100"}`}>
      {icon} {label}
    </button>);
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-sand-200 bg-white p-10 text-center shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sand-100 text-ink-muted">{icon}</span>
      <p className="max-w-sm text-sm text-ink-muted">{message}</p>
    </div>);
}

// --- Book appointment -----------------------------------------------------

const APPOINTMENT_TYPES = [
  "Consultation",
  "Follow-up",
  "Rhinoplasty consultation",
  "Facelift consultation",
  "Botox / fillers",
  "Post-op check-in",
  "Other"
];

function BookTab({ token, onBooked, patientName }: { token: string; onBooked: (d: PortalPatientResponse) => void; patientName: string }) {
  const [appointmentType, setAppointmentType] = useState(APPOINTMENT_TYPES[0]);
  const [day, setDay] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const minDay = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      const [y, mo, d] = day.split("-").map(Number);
      const [hh, mm] = time.split(":").map(Number);
      const start = new Date(y, mo - 1, d, hh, mm);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const fresh = await portalBookAppointment(token, {
        appointment_type: appointmentType,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        notes: notes.trim() || null
      });
      onBooked(fresh);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't book your appointment.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-success/25 bg-success/[0.04] p-10 text-center shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        <CheckCircle2Icon className="h-10 w-10 text-success" />
        <p className="text-sm font-bold text-ink">Request sent</p>
        <p className="max-w-sm text-sm text-ink-muted">
          Your appointment request for {appointmentType} is in — the clinic&apos;s front desk will confirm it. Check the Appointments tab.
        </p>
      </div>);
  }

  return (
    <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-bold text-ink">Request an appointment</p>
      <p className="mt-1 text-xs text-ink-muted">
        Pick a type and a preferred slot — the clinic confirms it. Doctor assignment happens at the practice.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Appointment type</span>
          <select
            value={appointmentType}
            onChange={(e) => setAppointmentType(e.target.value)}
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white">
            {APPOINTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Preferred day</span>
            <input
              type="date"
              value={day}
              min={minDay}
              onChange={(e) => setDay(e.target.value)}
              className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Preferred time</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Notes for the clinic (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={patientName ? `Anything we should know before ${patientName.split(" ")[0]}'s visit…` : "Anything the clinic should know…"}
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />
        </label>

        {error && <p className="text-sm font-medium text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy || !day || !time}
          className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">
          <CalendarPlusIcon className="h-4 w-4" /> {busy ? "Sending…" : "Send request"}
        </button>
      </form>
    </div>);
}

function AppointmentsTab({ appointments }: { appointments: PortalPatientResponse["appointments"] }) {
  if (appointments.length === 0) {
    return <EmptyState icon={<CalendarIcon className="h-5 w-5" />} message="No appointments to show yet — book one above." />;
  }
  return (
    <div className="space-y-3">
      {appointments.map((a) =>
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
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[a.status] || "bg-ink-muted/10 text-ink-muted"}`}>
            {a.status}
          </span>
        </div>
      )}
    </div>);
}

function PhotosTab({ photos }: { photos: PortalPatientResponse["photos"] }) {
  if (photos.length === 0) {
    return <EmptyState icon={<CameraIcon className="h-5 w-5" />} message="No photos shared yet — your progress photos will appear here as they're captured." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((p) =>
      <figure key={p.id} className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <img src={p.url} alt={p.photo_type || "Progress photo"} className="h-52 w-full object-cover" />
          <figcaption className="px-4 py-3">
            <p className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{p.photo_type || "Progress photo"}</span>
              <span className="text-xs text-ink-muted">{formatDate(p.taken_at)}</span>
            </p>
            {p.notes && <p className="mt-1 text-xs leading-relaxed text-ink-muted">{p.notes}</p>}
          </figcaption>
        </figure>
      )}
    </div>);
}

function ConsentTab({ documents }: { documents: PortalPatientResponse["consent_documents"] }) {
  if (documents.length === 0) {
    return <EmptyState icon={<FileTextIcon className="h-5 w-5" />} message="No consent documents to show yet." />;
  }
  return (
    <div className="space-y-3">
      {documents.map((d) =>
      <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600/10 text-teal-600">
              {d.status === "signed" ? <ShieldCheckIcon className="h-5 w-5" /> : <FileTextIcon className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{d.document_type}</p>
              <p className="text-xs text-ink-muted">
                {d.status === "signed" && d.signed_by_name ? `Signed by ${d.signed_by_name} on ${formatDate(d.signed_at)}` : `Status: ${d.status}`}
              </p>
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[d.status] || "bg-ink-muted/10 text-ink-muted"}`}>
            {d.status}
          </span>
        </div>
      )}
    </div>);
}

function InvoicesTab({ invoices }: { invoices: PortalPatientResponse["invoices"] }) {
  if (invoices.length === 0) {
    return <EmptyState icon={<ReceiptIcon className="h-5 w-5" />} message="No invoices to show yet." />;
  }
  return (
    <div className="space-y-3">
      {invoices.map((inv) =>
      <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600/10 text-teal-600">
              <ReceiptIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{inv.description}</p>
              <p className="text-xs text-ink-muted">Created {formatDate(inv.created_at)}{inv.due_date ? ` · Due ${formatDate(inv.due_date)}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-ink">${inv.total_amount.toFixed(2)}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[inv.status] || "bg-ink-muted/10 text-ink-muted"}`}>
              {inv.status}
            </span>
          </div>
        </div>
      )}
    </div>);
}