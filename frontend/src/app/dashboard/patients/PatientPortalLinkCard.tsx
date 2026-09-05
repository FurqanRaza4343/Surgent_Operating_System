import React, { useEffect, useState } from "react";
import { KeyIcon, CopyIcon, CheckIcon, RefreshCwIcon, PowerIcon } from "lucide-react";
import { usePlan } from "../plan/PlanContext";
import {
  enablePatientPortal,
  resetPatientPortalPin,
  disablePatientPortal,
  getPatientPortalAccess,
  type PortalPinIssuedResponse
} from "../../../api/entities";

// Owner-only — manages a patient's real Patient Portal login: a
// human-readable portal_id (e.g. AP-2026-00042) + a PIN the patient
// remembers, replacing the earlier plaintext-link-token scheme. A freshly
// generated PIN is shown exactly once (never stored or retrievable again),
// same trust model as any "here's your temporary password" flow.
// Backed by backend/src/router/patient_portal/patient_portal_router.py.
export function PatientPortalLinkCard({ patientId }: { patientId: string }) {
  const { authedFetch, role } = usePlan();
  const [portalId, setPortalId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [issuedPin, setIssuedPin] = useState<PortalPinIssuedResponse | null>(null);
  const [copied, setCopied] = useState(false);
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
      setIssuedPin(res);
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't enable the portal — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPin() {
    if (!authedFetch) return;
    setBusy(true);
    setError(null);
    try {
      const res = await resetPatientPortalPin(authedFetch, patientId);
      setIssuedPin(res);
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't reset the PIN — try again.");
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
      setIssuedPin(null);
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't disable the portal — try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleCopy() {
    if (!issuedPin) return;
    navigator.clipboard?.writeText(`Portal ID: ${issuedPin.portal_id}\nPIN: ${issuedPin.pin}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mb-6 rounded-3xl border border-sand-200 bg-white p-5 shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
      <div className="flex items-center gap-2 text-sm font-bold text-ink">
        <KeyIcon className="h-4 w-4 text-teal-600" /> Patient portal access
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Give this patient a real login — a portal ID and PIN they use at{" "}
        <span className="font-mono">/user</span> to see their own doctor, treatment plan, photos, consent, and invoices, and to request appointments.
      </p>

      {loading ?
      <p className="mt-3 text-sm text-ink-muted">Loading…</p> :

      <div className="mt-3 space-y-3">
          {issuedPin &&
        <div className="rounded-xl border border-warning/25 bg-warning/[0.05] p-4">
              <p className="text-xs font-semibold text-warning">Shown once — hand this to the patient now. It can't be shown again (only reset).</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ink">{issuedPin.portal_id}</code>
                <code className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ink">PIN: {issuedPin.pin}</code>
                <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">
                  {copied ? <CheckIcon className="h-3.5 w-3.5 text-teal-600" /> : <CopyIcon className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy both"}
                </button>
              </div>
            </div>
        }

          {!issuedPin && portalId &&
        <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-sand-100 px-3 py-2 text-sm font-semibold text-ink">{portalId}</code>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${enabled ? "bg-success/10 text-success" : "bg-ink-muted/10 text-ink-muted"}`}>
                {enabled ? "Active" : "Disabled"}
              </span>
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
              onClick={handleResetPin}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl border border-sand-200 px-3.5 py-2.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600 disabled:opacity-50">
                  <RefreshCwIcon className="h-3.5 w-3.5" /> {busy ? "…" : "Reset PIN"}
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
