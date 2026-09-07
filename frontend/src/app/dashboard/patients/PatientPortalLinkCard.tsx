import React, { useEffect, useState } from "react";
import { KeyIcon, SendIcon, PowerIcon, CheckCircle2Icon, ShieldAlertIcon } from "lucide-react";
import { usePlan } from "../plan/PlanContext";
import {
  enablePatientPortal,
  resendPatientPortalInvite,
  disablePatientPortal,
  getPatientPortalAccess
} from "../../../api/entities";

// Owner-only — manages a patient's Patient Portal access. There's no PIN or
// password for staff to generate or hand over anymore: the patient logs in
// with their own phone number, verified live by a one-time code sent over
// WhatsApp/email (see patient_portal_auth_service.py) — staff here only
// flips access on/off and can nudge a resend if the original invite didn't
// land. Backed by backend/src/router/patient_portal/patient_portal_router.py.
export function PatientPortalLinkCard({ patientId }: { patientId: string }) {
  const { authedFetch, role } = usePlan();
  const [portalId, setPortalId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastInviteSent, setLastInviteSent] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authedFetch || role !== "owner") {
        setLoading(false);
        return;
      }
      try {
        const res = await getPatientPortalAccess(authedFetch, patientId);
        if (!cancelled) {
          setPortalId(res.portal_id);
          setEnabled(res.enabled);
        }
      } catch {
        // leave defaults — treated as "not enabled yet"
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, role, patientId]);

  if (role !== "owner") return null;

  async function handleEnable() {
    if (!authedFetch) return;
    setBusy(true);
    setError(null);
    try {
      const res = await enablePatientPortal(authedFetch, patientId);
      setPortalId(res.portal_id);
      setEnabled(true);
      setLastInviteSent(res.invite_sent);
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't enable the portal — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResendInvite() {
    if (!authedFetch) return;
    setBusy(true);
    setError(null);
    try {
      await resendPatientPortalInvite(authedFetch, patientId);
      setLastInviteSent(true);
    } catch (err: unknown) {
      setLastInviteSent(false);
      setError(err instanceof Error && err.message ? err.message : "Couldn't resend the invite — check the patient has a phone or email on file.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (!authedFetch) return;
    setBusy(true);
    setError(null);
    try {
      const res = await disablePatientPortal(authedFetch, patientId);
      setEnabled(res.enabled);
      setLastInviteSent(null);
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't disable the portal — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-3xl border border-sand-200 bg-white p-5 shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
      <div className="flex items-center gap-2 text-sm font-bold text-ink">
        <KeyIcon className="h-4 w-4 text-teal-600" /> Patient portal access
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        The patient logs in themselves at <span className="font-mono">/user</span> with their own phone number —
        we text or email them a one-time code, no password to hand over.
      </p>

      {loading ?
      <p className="mt-3 text-sm text-ink-muted">Loading…</p> :

      <div className="mt-3 space-y-3">
          {portalId &&
        <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-sand-100 px-3 py-2 text-sm font-semibold text-ink">{portalId}</code>
              <span className="text-xs text-ink-muted">reference ID — not needed to log in</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${enabled ? "bg-success/10 text-success" : "bg-ink-muted/10 text-ink-muted"}`}>
                {enabled ? "Active" : "Disabled"}
              </span>
            </div>
        }

          {lastInviteSent === true &&
        <div className="flex items-center gap-1.5 text-xs font-medium text-success">
              <CheckCircle2Icon className="h-3.5 w-3.5" /> Invite sent — the patient can log in with their phone number now.
            </div>
        }
          {lastInviteSent === false &&
        <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
              <ShieldAlertIcon className="h-3.5 w-3.5" /> Portal is on, but the invite couldn't be delivered — check the patient has a phone or email on file.
            </div>
        }

          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <div className="flex flex-wrap gap-2">
            {!enabled &&
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50">
                <KeyIcon className="h-3.5 w-3.5" /> {busy ? "…" : portalId ? "Re-enable portal" : "Enable portal"}
              </button>
          }
            {enabled &&
          <>
                <button
              type="button"
              onClick={handleResendInvite}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl border border-sand-200 px-3.5 py-2.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600 disabled:opacity-50">
                  <SendIcon className="h-3.5 w-3.5" /> {busy ? "…" : "Resend invite"}
                </button>
                <button
              type="button"
              onClick={handleDisable}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl border border-sand-200 px-3.5 py-2.5 text-xs font-semibold text-ink-soft transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50">
                  <PowerIcon className="h-3.5 w-3.5" /> {busy ? "…" : "Disable"}
                </button>
              </>
          }
          </div>
        </div>
      }
    </div>);

}
