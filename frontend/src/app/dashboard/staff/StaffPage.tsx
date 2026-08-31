import React, { useState } from "react";
import { UsersIcon, PlusIcon, UserXIcon, UserCheckIcon, PencilIcon, CheckIcon, XIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { usePlan } from "../plan/PlanContext";
import { useStaff } from "./useStaff";
import { RECEPTIONIST_PERMISSIONS, RECOMMENDED_RECEPTIONIST_PERMISSIONS } from "../../../data/receptionistPermissions";
import type { StaffResponse } from "../../../api/entities";

export function StaffPage() {
  const { authedFetch } = usePlan();
  const { staff, loading, invite, update } = useStaff(authedFetch);
  const [inviting, setInviting] = useState(false);

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader title="Staff" subtitle="Receptionists who can access the Front Desk, Waiting Room, and booking — invite and manage their access here." />
        <button
          type="button"
          onClick={() => setInviting((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">

          <PlusIcon className="h-4 w-4" /> Invite receptionist
        </button>
      </div>

      {inviting && <InviteForm onInvite={invite} onDone={() => setInviting(false)} />}

      <div className="mt-6">
        {loading ?
        <p className="text-sm text-ink-muted">Loading…</p> :
        staff.length === 0 ?
        <div className="rounded-3xl border border-sand-200 bg-white">
            <EmptyState icon={UsersIcon} title="No receptionists yet" body="Invite your first front-desk staff member to get started." />
          </div> :

        <div className="space-y-3">
            {staff.map((s) => <StaffRow key={s.id} staff={s} onUpdate={update} />)}
          </div>
        }
      </div>
    </>);

}

function InviteForm({ onInvite, onDone }: { onInvite: (email: string, permissions: string[]) => Promise<boolean>; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>(RECOMMENDED_RECEPTIONIST_PERMISSIONS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const ok = await onInvite(email.trim(), selected);
      if (ok) onDone();
      else setError("Couldn't send the invite — check the email and try again.");
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't send the invite — check the email and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="receptionist@practice.com"
          className="w-full max-w-sm rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

      </label>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">Access</p>
      <div className="space-y-2">
        {RECEPTIONIST_PERMISSIONS.map((perm) =>
        <label key={perm.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand-200 px-4 py-3 transition-colors hover:border-teal-600/40">
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
        <button type="button" onClick={onDone} className="rounded-xl border border-sand-200 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ink-muted/40">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !email.trim()}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">

          {saving ? "Sending…" : "Send invite"}
        </button>
      </div>
    </form>);

}

function StaffRow({ staff, onUpdate }: { staff: StaffResponse; onUpdate: (id: string, patch: { permissions?: string[]; is_active?: boolean }) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(staff.permissions);
  const [saving, setSaving] = useState(false);

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function savePermissions() {
    setSaving(true);
    const ok = await onUpdate(staff.id, { permissions: selected });
    setSaving(false);
    if (ok) setEditing(false);
  }

  async function toggleActive() {
    setSaving(true);
    await onUpdate(staff.id, { is_active: !staff.is_active });
    setSaving(false);
  }

  return (
    <div className={`rounded-3xl border bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)] ${staff.is_active ? "border-sand-200" : "border-danger/25 bg-danger/[0.02]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{staff.name || staff.email}</p>
          <p className="truncate text-xs text-ink-muted">{staff.email}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!staff.is_active && <span className="rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-danger">Removed</span>}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">

            <PencilIcon className="h-3.5 w-3.5" /> Permissions
          </button>
          <button
            type="button"
            onClick={toggleActive}
            disabled={saving}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
            staff.is_active ? "border-danger/25 text-danger hover:bg-danger/5" : "border-sand-200 text-ink-soft hover:border-teal-600/40 hover:text-teal-600"}`
            }>

            {staff.is_active ? <UserXIcon className="h-3.5 w-3.5" /> : <UserCheckIcon className="h-3.5 w-3.5" />}
            {staff.is_active ? "Remove" : "Reactivate"}
          </button>
        </div>
      </div>

      {!editing &&
      <div className="mt-3 flex flex-wrap gap-1.5">
          {staff.permissions.length === 0 ?
        <span className="text-xs text-ink-muted">No permissions granted yet.</span> :

        staff.permissions.map((key) => {
          const perm = RECEPTIONIST_PERMISSIONS.find((p) => p.key === key);
          return (
            <span key={key} className="rounded-full bg-sand-100 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                  {perm?.label || key}
                </span>);

        })
        }
        </div>
      }

      {editing &&
      <div className="mt-4 space-y-2 border-t border-sand-100 pt-4">
          {RECEPTIONIST_PERMISSIONS.map((perm) =>
        <label key={perm.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand-200 px-4 py-3 transition-colors hover:border-teal-600/40">
              <input
            type="checkbox"
            checked={selected.includes(perm.key)}
            onChange={() => toggle(perm.key)}
            className="mt-0.5 h-4 w-4 rounded border-sand-300 text-teal-600 focus:ring-teal-600" />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{perm.label}</p>
                <p className="text-xs text-ink-muted">{perm.description}</p>
              </div>
            </label>
        )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setSelected(staff.permissions); setEditing(false); }} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink">
              <XIcon className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
            type="button"
            onClick={savePermissions}
            disabled={saving}
            className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">

              <CheckIcon className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      }
    </div>);

}
