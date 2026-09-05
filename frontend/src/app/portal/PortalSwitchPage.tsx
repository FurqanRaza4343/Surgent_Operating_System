import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  UserCircleIcon,
  StethoscopeIcon,
  LayoutDashboardIcon,
  UsersIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftRightIcon,
  PlusIcon,
  ClipboardListIcon,
  MailIcon,
  FlaskConicalIcon
} from "lucide-react";
import { Logo } from "../../components/ui";
import { writeRoleOverride, clearRoleOverride } from "../dashboard/plan/plan";
import { usePlan } from "../dashboard/plan/PlanContext";
import { usePatients } from "../dashboard/patients/usePatients";
import { useDoctors } from "../dashboard/doctors/useDoctors";
import { useStaff } from "../dashboard/staff/useStaff";
import { RECEPTIONIST_PERMISSIONS, RECOMMENDED_RECEPTIONIST_PERMISSIONS } from "../../data/receptionistPermissions";
import { DASHBOARD_ROUTES } from "../dashboard/constants/routes";

// Same shape as the dashboard hooks' own alias (PlanContext.tsx) — the plan's
// authedFetch is structurally compatible, we just need the name in scope for
// the picker prop types below.
type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

// A demo-only role switcher + site map at /portal (stands outside the
// dashboard shell so you can jump into a Doctor, Receptionist, or Patient
// view from one place). Each "switch" writes the same local role override
// that Plan & Billing's "preview as" dev switcher uses, then sends you into
// /dashboard — usePlanTier() re-reads the override on mount and the sidebar
// + router re-adapt instantly. Real Clerk-backed sessions always win over
// this override once usePlanTier re-runs against the API — see plan/plan.ts.
// The real patient-facing login lives separately at /user (PortalPage.tsx).
export function PortalSwitchPage() {
  const navigate = useNavigate();
  const { authedFetch } = usePlan();
  const [picker, setPicker] = useState<"doctor" | "receptionist" | null>(null);

  function switchTo(role: "owner" | "doctor" | "receptionist") {
    // Owner view = exit the demo preview and let the real session role take
    // over; the other views set a demo override so you can preview them.
    if (role === "owner") clearRoleOverride();
    else writeRoleOverride(role);
    navigate(
      role === "doctor"
        ? DASHBOARD_ROUTES.doctorOverview
        : role === "receptionist"
        ? DASHBOARD_ROUTES.frontDesk
        : DASHBOARD_ROUTES.overview
    );
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
          <span className="text-sm text-ink-muted">Site Map</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Site Map</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Continue as an existing doctor or receptionist — or add a new one — and see the practice from their side. Jump back to your Owner view anytime.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <RoleCard
            title="Owner view"
            body="Your practice-wide overview, staff, doctors, and everything else."
            icon={<UserCircleIcon className="h-5 w-5" />}
            accent="bg-teal-600/10 text-teal-600"
            onClick={() => switchTo("owner")}
          />
          <RoleCard
            title="Doctor view"
            body="Continue with an existing surgeon, or add a new one — then see their overview, calendar, and appointments."
            icon={<StethoscopeIcon className="h-5 w-5" />}
            accent="bg-sand-200 text-ink-soft"
            onClick={() => setPicker("doctor")}
          />
          <RoleCard
            title="Front Desk / Receptionist"
            body="Continue with an existing front-desk member, or add a new one — then step into the Front Desk and booking."
            icon={<LayoutDashboardIcon className="h-5 w-5" />}
            accent="bg-warning/10 text-warning"
            onClick={() => setPicker("receptionist")}
          />
        </div>

        {picker === "doctor" && <DoctorPicker authedFetch={authedFetch} onSwitch={switchTo} />}
        {picker === "receptionist" && <ReceptionistPicker authedFetch={authedFetch} onSwitch={switchTo} />}

        <PatientPicker authedFetch={authedFetch} />

        <div className="mt-6 rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-2.5 border-b border-sand-100 p-6">
            <ClipboardListIcon className="h-4 w-4 text-ink-muted" />
            <p className="text-sm font-bold text-ink">Doctor approvals</p>
          </div>
          <p className="border-b border-sand-100 px-6 pt-5 pb-4 text-xs text-ink-muted">
            Review doctors who signed up via your signup link and grant their access — approvals land here too.
          </p>
          <Link
            to={DASHBOARD_ROUTES.doctorRequests}
            onClick={() => clearRoleOverride()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
            <ArrowRightIcon className="h-4 w-4" /> Open doctor requests
          </Link>
        </div>
      </main>
    </div>);
}

function RoleCard({ title, body, icon, accent, onClick }: { title: string; body: string; icon: React.ReactNode; accent: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition-colors hover:border-teal-600/40">
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>{icon}</span>
      <p className="mt-3 text-base font-bold text-ink">{title}</p>
      <p className="mt-1 text-xs text-ink-muted">{body}</p>
      <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-teal-600">
        Switch <ArrowRightIcon className="h-3.5 w-3.5" />
      </span>
    </button>);
}

// Shared "resume an existing record or add a new one" panel behind the Doctor
// and Receptionist cards. `items` shape matches both useDoctors()-doctors and
// useStaff()-staff enough to render an avatar + name + detail line uniformly.
function IdentityPicker({
  title,
  icon,
  subtitle,
  items,
  loading,
  itemKeys,
  emptyTitle,
  emptyBody,
  addLinkLabel,
  addTo,
  onPick
}: {
  title: string;
  icon: React.ReactNode;
  subtitle: string;
  items: Array<{ id: string; name?: string | null; email?: string | null; phone?: string | null; role?: string | null; specialty?: string | null; initial?: string }>;
  loading: boolean;
  itemKeys: { name: string; detail: string };
  emptyTitle: string;
  emptyBody: string;
  addLinkLabel: string;
  addTo: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="mt-4 rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2.5 border-b border-sand-100 p-6">
        {icon}
        <p className="text-sm font-bold text-ink">{title}</p>
      </div>
      <p className="border-b border-sand-100 px-6 pt-5 pb-4 text-xs text-ink-muted">{subtitle}</p>

      {loading ?
        <p className="p-6 text-sm text-ink-muted">Loading…</p> :
        items.length === 0 ?
        <div className="p-6">
          <p className="text-sm font-semibold text-ink">{emptyTitle}</p>
          <p className="mt-1 text-xs text-ink-muted">{emptyBody}</p>
          <Link to={addTo} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
            <PlusIcon className="h-4 w-4" /> {addLinkLabel}
          </Link>
        </div> :
        <div className="max-h-96 space-y-2 overflow-y-auto py-5 pr-6 pl-6">
          {items.map((item) => {
            const name = item[itemKeys.name as keyof typeof item] as string | null;
            const detail = item[itemKeys.detail as keyof typeof item] as string | null;
            const fallbackName = name || "Unnamed";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-sand-200 px-4 py-3 text-left transition-colors hover:border-teal-600/40 hover:bg-sand-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 text-sm font-bold text-ink-muted">
                  {item.initial || fallbackName.trim()[0]?.toUpperCase() || "?"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{fallbackName}</span>
                  <span className="block truncate text-xs text-ink-muted">{detail || fallbackName}</span>
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-teal-600">
                  Continue <CheckIcon className="h-4 w-4 shrink-0" />
                </span>
              </button>
            );
          })}
        </div>
      }
    </div>);
}

function DoctorPicker({ authedFetch, onSwitch }: { authedFetch: AuthedFetch; onSwitch: (role: "owner" | "doctor" | "receptionist") => void }) {
  const { doctors, loading } = useDoctors(authedFetch);
  return (
    <IdentityPicker
      title="Continue as a doctor"
      icon={<StethoscopeIcon className="h-4 w-4 text-ink-muted" />}
      subtitle="Pick an existing surgeon to preview their view. If none exists yet, add a new one from scratch."
      items={doctors.filter((d) => d.isActive)}
      loading={loading}
      itemKeys={{ name: "name", detail: "specialty" }}
      emptyTitle="No doctor yet"
      emptyBody="There is no existing doctor to continue as — add a new surgeon first."
      addLinkLabel="Add a new doctor"
      addTo={DASHBOARD_ROUTES.doctorNew}
      onPick={() => onSwitch("doctor")}
    />
  );
}

function ReceptionistPicker({ authedFetch, onSwitch }: { authedFetch: AuthedFetch; onSwitch: (role: "owner" | "doctor" | "receptionist") => void }) {
  const { staff, loading, refetch, invite } = useStaff(authedFetch);
  const [adding, setAdding] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [justInvited, setJustInvited] = useState<string | null>(null);

  const active = staff.filter((s) => s.is_active);

  async function handleInvite(email: string, permissions: string[]) {
    setInviting(true);
    setInviteError(null);
    try {
      await invite(email, permissions);
      setJustInvited(email);
      setAdding(false);
      await refetch();
    } catch (err: unknown) {
      setInviteError(err instanceof Error && err.message ? err.message : "Couldn't send the invite — check the email and try again.");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="mt-4 rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between border-b border-sand-100 p-6">
        <div className="flex items-center gap-2.5">
          <LayoutDashboardIcon className="h-4 w-4 text-ink-muted" />
          <p className="text-sm font-bold text-ink">Continue as a receptionist</p>
        </div>
        <button
          type="button"
          onClick={() => { setAdding((v) => !v); setInviteError(null); }}
          className="flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700">
          <PlusIcon className="h-3.5 w-3.5" /> {adding ? "Cancel" : "Add receptionist"}
        </button>
      </div>

      <p className="border-b border-sand-100 px-6 pt-5 pb-4 text-xs text-ink-muted">
        Pick an existing front-desk member to preview their view — or add a new one. No active member yet?
        Jump straight into a sample Front Desk below.
      </p>

      {adding &&
      <AddReceptionistForm onInvite={handleInvite} busy={inviting} error={inviteError} />}

      {justInvited &&
      <div className="mx-6 mt-5 flex items-start gap-2 rounded-xl border border-teal-600/20 bg-teal-600/[0.04] px-4 py-3">
          <MailIcon className="h-4 w-4 shrink-0 text-teal-600" />
          <p className="text-sm text-ink">
            Invite sent to <span className="font-semibold">{justInvited}</span> — they&apos;ll appear as active
            once they complete the signup link we emailed them.
          </p>
        </div>
      }

      {loading ?
      <p className="p-6 text-sm text-ink-muted">Loading…</p> :
      active.length === 0 ?
      <div className="p-6">
          <p className="text-sm font-semibold text-ink">No active receptionist yet</p>
          <p className="mt-1 text-xs text-ink-muted">
            Add a member above to invite them for real, or peek at the Front Desk with a sample view.
          </p>
          <button
          type="button"
          onClick={() => onSwitch("receptionist")}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-600">
            <FlaskConicalIcon className="h-4 w-4" /> Use demo receptionist
          </button>
        </div> :
      <div className="max-h-96 space-y-2 overflow-y-auto py-5 pr-6 pl-6">
          {active.map((item) => {
          const name = item.name || "Unnamed";
          const detail = item.role || item.email || name;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSwitch("receptionist")}
              className="flex w-full items-center gap-3 rounded-xl border border-sand-200 px-4 py-3 text-left transition-colors hover:border-teal-600/40 hover:bg-sand-50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 text-sm font-bold text-ink-muted">
                {name.trim()[0]?.toUpperCase() || "?"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{name}</span>
                <span className="block truncate text-xs text-ink-muted">{detail}</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-teal-600">
                Continue <CheckIcon className="h-4 w-4 shrink-0" />
              </span>
            </button>
          );
        })}
        </div>
      }
    </div>);
}

function AddReceptionistForm({ onInvite, busy, error }: { onInvite: (email: string, permissions: string[]) => Promise<void>; busy: boolean; error: string | null }) {
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>(RECOMMENDED_RECEPTIONIST_PERMISSIONS);

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    await onInvite(email.trim(), selected);
  }

  return (
    <form onSubmit={submit} className="mx-6 mt-5 rounded-2xl border border-sand-200 bg-canvas p-5">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="receptionist@practice.com"
          className="w-full max-w-sm rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40" />
      </label>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">Access</p>
      <div className="space-y-2">
        {RECEPTIONIST_PERMISSIONS.map((perm) =>
        <label key={perm.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand-200 bg-white px-4 py-2.5 transition-colors hover:border-teal-600/40">
            <input
            type="checkbox"
            checked={selected.includes(perm.key)}
            onChange={() => toggle(perm.key)}
            className="mt-0.5 h-4 w-4 rounded border-sand-300 text-teal-600 focus:ring-teal-600" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                {perm.label} {perm.recommended && <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-teal-600">Recommended</span>}
              </p>
              <p className="text-xs text-ink-muted">{perm.description}</p>
            </div>
          </label>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}

      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? "Sending…" : "Send invite"}
        </button>
      </div>
    </form>);
}

function PatientPicker({ authedFetch }: { authedFetch: AuthedFetch }) {
  const { patients, loading } = usePatients(authedFetch);
  const navigate = useNavigate();

  return (
    <div className="mt-6 rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2.5 border-b border-sand-100 p-6">
        <UsersIcon className="h-4 w-4 text-ink-muted" />
        <p className="text-sm font-bold text-ink">Patient view — open any patient&apos;s record</p>
      </div>
      <p className="border-b border-sand-100 px-6 pt-5 pb-4 text-xs text-ink-muted">
        Provider-side view — the appointments, consents, and invoices this practice keeps for that patient, exactly as your team sees it.
      </p>

      {loading ?
      <p className="p-6 text-sm text-ink-muted">Loading patients…</p> :
      patients.length === 0 ?
      <p className="p-6 text-sm text-ink-muted">No patients to open yet — add one from the Patients page first.</p> :
      <div className="max-h-96 space-y-2 overflow-y-auto py-5 pr-6 pl-6">
        {patients.map((patient) =>
        <button
          key={patient.id}
          type="button"
          onClick={() => navigate(DASHBOARD_ROUTES.patientDetail(patient.id))}
          className="flex w-full items-center gap-3 rounded-xl border border-sand-200 px-4 py-3 text-left transition-colors hover:border-teal-600/40 hover:bg-sand-50">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 text-sm font-bold text-ink-muted">
            {patient.initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{patient.name}</span>
            <span className="block truncate text-xs text-ink-muted">{patient.email || patient.phone || patient.status}</span>
          </span>
          <CheckIcon className="h-4 w-4 shrink-0 text-teal-600" />
        </button>
        )}
      </div>
      }

      <div className="border-t border-sand-100 p-5">
        <Link to={DASHBOARD_ROUTES.overview} className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:underline">
          <ArrowLeftRightIcon className="h-3.5 w-3.5" /> Back to my dashboard
        </Link>
      </div>
    </div>);
}