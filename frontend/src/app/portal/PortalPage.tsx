import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  CheckCircle2Icon,
  StethoscopeIcon,
  ClipboardListIcon,
  KeyIcon,
  LogOutIcon,
  HeartPulseIcon
} from "lucide-react";
import { Logo } from "../../components/ui";
import {
  portalLogin,
  getMyPortalData,
  portalBookAppointment,
  portalSubmitIntake,
  type PortalPatientResponse,
  type PatientIntakeRequest
} from "../../api/entities";

type Tab = "book" | "appointments" | "doctor" | "treatment" | "intake" | "photos" | "consent" | "invoices";

const SESSION_KEY = "aiaceone_portal_token";

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
  overdue: "bg-danger/10 text-danger",
  proposed: "bg-warning/10 text-warning",
  accepted: "bg-teal-600/10 text-teal-600",
  planned: "bg-sand-100 text-ink-soft"
};

export function PortalPage() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });
  const [data, setData] = useState<PortalPatientResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("appointments");

  const load = async (tok: string) => {
    try {
      const json = await getMyPortalData(tok);
      setData(json);
      setError(null);
    } catch (e) {
      // Expired/invalid session — drop it and fall back to the login screen
      // rather than showing a dead-end error with no way forward.
      setToken(null);
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // private browsing / storage disabled — nothing to clear
      }
      setError(e instanceof Error ? e.message : "Your session expired — please log in again.");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      await load(token);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleLoggedIn(newToken: string) {
    try {
      sessionStorage.setItem(SESSION_KEY, newToken);
    } catch {
      // private browsing / storage disabled — session just won't survive a refresh
    }
    setLoading(true);
    setToken(newToken);
  }

  function handleLogout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setToken(null);
    setData(null);
  }

  function handleBooked(newData: PortalPatientResponse) {
    // Refresh the data (so Appointments already shows the new request) but
    // stay on the Book tab so BookTab's own "Request sent" confirmation is
    // actually visible — switching away immediately would unmount it before
    // the patient ever saw it.
    setData(newData);
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
          <div className="flex items-center gap-3">
            {data && <span className="text-sm text-ink-muted">Patient Portal</span>}
            {data &&
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-danger/40 hover:text-danger">
                <LogOutIcon className="h-3.5 w-3.5" /> Log out
              </button>
            }
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {loading &&
        <div className="flex items-center gap-3 text-sm text-ink-muted">
            <LoaderIcon className="h-5 w-5 animate-spin text-teal-600" /> Loading your portal…
          </div>
        }

        {!loading && !token && <LoginForm error={error} onLoggedIn={handleLoggedIn} />}

        {!loading && token && !data && error &&
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-sand-200 bg-white p-10 text-center shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
              <ShieldAlertIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Couldn&apos;t load your portal</p>
              <p className="mt-1 text-sm text-ink-muted">{error}</p>
            </div>
          </div>
        }

        {!loading && data &&
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
              <TabButton active={tab === "doctor"} onClick={() => setTab("doctor")} icon={<StethoscopeIcon className="h-3.5 w-3.5" />} label="My doctor" />
              <TabButton active={tab === "treatment"} onClick={() => setTab("treatment")} icon={<ClipboardListIcon className="h-3.5 w-3.5" />} label={`Treatment plan (${data.treatment_plans.length})`} />
              <TabButton active={tab === "intake"} onClick={() => setTab("intake")} icon={<HeartPulseIcon className="h-3.5 w-3.5" />} label={data.intake_completed ? "Health intake" : "Health intake (needed)"} />
              <TabButton active={tab === "photos"} onClick={() => setTab("photos")} icon={<CameraIcon className="h-3.5 w-3.5" />} label={`Photos (${data.photos.length})`} />
              <TabButton active={tab === "consent"} onClick={() => setTab("consent")} icon={<FileTextIcon className="h-3.5 w-3.5" />} label={`Consent (${data.consent_documents.length})`} />
              <TabButton active={tab === "invoices"} onClick={() => setTab("invoices")} icon={<ReceiptIcon className="h-3.5 w-3.5" />} label={`Invoices (${data.invoices.length})`} />
            </div>

            {tab === "book" && token && (
            <BookTab
              token={token}
              onBooked={handleBooked}
              onViewAppointments={() => setTab("appointments")}
              patientName={`${data.first_name} ${data.last_name}`}
            />
            )}
            {tab === "appointments" && <AppointmentsTab appointments={data.appointments} />}
            {tab === "doctor" && <DoctorTab doctor={data.doctor} />}
            {tab === "treatment" && <TreatmentTab plans={data.treatment_plans} />}
            {tab === "intake" && token && (
            <IntakeTab
              token={token}
              intakeCompleted={data.intake_completed}
              intakeSummary={data.intake_summary}
              onSubmitted={(fresh) => setData(fresh)}
            />
            )}
            {tab === "photos" && <PhotosTab photos={data.photos} />}
            {tab === "consent" && <ConsentTab documents={data.consent_documents} />}
            {tab === "invoices" && <InvoicesTab invoices={data.invoices} />}
          </>
        }
      </main>
    </div>);
}

function LoginForm({ error, onLoggedIn }: { error: string | null; onLoggedIn: (token: string) => void }) {
  const [portalId, setPortalId] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!portalId.trim() || !pin.trim()) return;
    setBusy(true);
    setLoginError(null);
    try {
      const res = await portalLogin(portalId.trim().toUpperCase(), pin.trim());
      onLoggedIn(res.access_token);
    } catch (err: unknown) {
      setLoginError(err instanceof Error && err.message ? err.message : "Couldn't log in — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-sand-200 bg-white p-8 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600/10 text-teal-600">
        <KeyIcon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-lg font-bold text-ink">Patient login</p>
      <p className="mt-1 text-sm text-ink-muted">
        Enter the portal ID and PIN your clinic gave you.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Portal ID</span>
          <input
            required
            autoFocus
            value={portalId}
            onChange={(e) => setPortalId(e.target.value)}
            placeholder="AP-2026-00042"
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">PIN</span>
          <input
            required
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••"
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />
        </label>

        {(loginError || error) && <p className="text-sm font-medium text-danger">{loginError || error}</p>}

        <button
          type="submit"
          disabled={busy || !portalId.trim() || !pin.trim()}
          className="w-full rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
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

function BookTab({
  token,
  onBooked,
  onViewAppointments,
  patientName
}: {
  token: string;
  onBooked: (d: PortalPatientResponse) => void;
  onViewAppointments: () => void;
  patientName: string;
}) {
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
          Your appointment request for {appointmentType} is in — the clinic&apos;s front desk will confirm it.
        </p>
        <button
          type="button"
          onClick={onViewAppointments}
          className="mt-2 flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
          <CalendarIcon className="h-4 w-4" /> View my appointments
        </button>
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

function DoctorTab({ doctor }: { doctor: PortalPatientResponse["doctor"] }) {
  if (!doctor) {
    return <EmptyState icon={<StethoscopeIcon className="h-5 w-5" />} message="No doctor assigned yet — once you're booked with one, they'll show up here." />;
  }
  return (
    <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-4">
        {doctor.photo_url ?
        <img src={doctor.photo_url} alt={doctor.name} className="h-16 w-16 shrink-0 rounded-full object-cover" /> :
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-600/10 text-xl font-bold text-teal-600">
            {doctor.name[0]?.toUpperCase() || "?"}
          </span>
        }
        <div>
          <p className="text-lg font-bold text-ink">{doctor.name}</p>
          <p className="text-sm text-ink-muted">{doctor.specialty || "Your care provider"}</p>
        </div>
      </div>
      {doctor.bio && <p className="mt-4 text-sm leading-relaxed text-ink-soft">{doctor.bio}</p>}
    </div>);
}

function TreatmentTab({ plans }: { plans: PortalPatientResponse["treatment_plans"] }) {
  if (plans.length === 0) {
    return <EmptyState icon={<ClipboardListIcon className="h-5 w-5" />} message="No treatment plan yet — your doctor will build one with you after a consultation." />;
  }
  return (
    <div className="space-y-4">
      {plans.map((plan) =>
      <div key={plan.id} className="rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3 border-b border-sand-100 px-5 py-4">
            <p className="text-sm font-bold text-ink">{plan.title}</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[plan.status] || "bg-ink-muted/10 text-ink-muted"}`}>
              {plan.status}
            </span>
          </div>
          <div className="divide-y divide-sand-100">
            {plan.items.map((item) =>
          <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-ink">{item.procedure_name}</p>
                  <p className="text-xs text-ink-muted capitalize">{item.status}</p>
                </div>
                {(item.actual_price ?? item.estimated_price) != null &&
            <p className="text-sm font-semibold text-ink">${(item.actual_price ?? item.estimated_price)?.toFixed(2)}</p>
            }
              </div>
          )}
          </div>
        </div>
      )}
    </div>);
}

const SMOKING_OPTIONS = ["Never smoked", "Former smoker", "Current smoker", "Prefer not to say"];

function splitToNamed(value: string, key: "name" | "procedure"): Array<Record<string, string>> {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => ({ [key]: v }));
}

function IntakeTab({
  token,
  intakeCompleted,
  intakeSummary,
  onSubmitted
}: {
  token: string;
  intakeCompleted: boolean;
  intakeSummary: string | null;
  onSubmitted: (data: PortalPatientResponse) => void;
}) {
  const [editing, setEditing] = useState(!intakeCompleted);
  const [allergies, setAllergies] = useState("");
  const [surgicalHistory, setSurgicalHistory] = useState("");
  const [medications, setMedications] = useState("");
  const [smokingStatus, setSmokingStatus] = useState(SMOKING_OPTIONS[0]);
  const [previousProcedures, setPreviousProcedures] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload: PatientIntakeRequest = {
        allergies: splitToNamed(allergies, "name"),
        surgical_history: splitToNamed(surgicalHistory, "procedure"),
        current_medications: splitToNamed(medications, "name"),
        smoking_status: smokingStatus,
        previous_cosmetic_procedures: splitToNamed(previousProcedures, "procedure"),
        additional_notes: notes.trim() || null
      };
      const fresh = await portalSubmitIntake(token, payload);
      onSubmitted(fresh);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your intake — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2">
          <CheckCircle2Icon className="h-4 w-4 text-success" />
          <p className="text-sm font-bold text-ink">Health intake on file</p>
        </div>
        {intakeSummary && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{intakeSummary}</p>}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-4 rounded-xl border border-sand-200 px-4 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">
          Update my answers
        </button>
      </div>);
  }

  return (
    <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-bold text-ink">Pre-consultation health intake</p>
      <p className="mt-1 text-xs text-ink-muted">
        Help your doctor prepare — separate multiple entries with commas. This goes straight into your record.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="Allergies" value={allergies} onChange={setAllergies} placeholder="e.g. Penicillin, Latex" />
        <Field label="Past surgeries" value={surgicalHistory} onChange={setSurgicalHistory} placeholder="e.g. Appendectomy 2019" />
        <Field label="Current medications" value={medications} onChange={setMedications} placeholder="e.g. Aspirin, Metformin" />
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Smoking status</span>
          <select
            value={smokingStatus}
            onChange={(e) => setSmokingStatus(e.target.value)}
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white">
            {SMOKING_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <Field label="Previous cosmetic procedures" value={previousProcedures} onChange={setPreviousProcedures} placeholder="e.g. Botox 2022" />
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Anything else your doctor should know? (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />
        </label>

        {error && <p className="text-sm font-medium text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">
          <HeartPulseIcon className="h-4 w-4" /> {busy ? "Saving…" : "Submit intake"}
        </button>
      </form>
    </div>);
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />
    </label>);
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
