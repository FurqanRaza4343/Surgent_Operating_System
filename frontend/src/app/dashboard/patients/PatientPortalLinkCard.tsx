import React, { useEffect, useState } from "react";
import { Link2Icon, CopyIcon, CheckIcon, Trash2Icon, ExternalLinkIcon } from "lucide-react";
import { usePlan } from "../plan/PlanContext";
import { generatePortalLink, revokePortalLink, getPortalLink } from "../../../api/entities";

// Owner-only — generates (or shows) the patient's shareable portal link
// (/portal/:token). The patient opens the link in an incognito window and
// sees their own read-only appointments/consents/invoices — no login needed.
// Backed by backend/src/router/patient_portal/patient_portal_router.py.
export function PatientPortalLinkCard({ patientId }: { patientId: string }) {
  const { authedFetch, role } = usePlan();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authedFetch || role !== "owner") {
        setLoading(false);
        return;
      }
      try {
        const res = await getPortalLink(authedFetch, patientId);
        if (!cancelled) setUrl(res.portal_url);
      } catch {
        if (!cancelled) setUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, role, patientId]);

  if (role !== "owner") return null;

  async function handleGenerate() {
    if (!authedFetch) return;
    setBusy(true);
    try {
      const res = await generatePortalLink(authedFetch, patientId);
      setUrl(res.portal_url);
    } catch {
      // leave any existing link showing
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    if (!authedFetch) return;
    setBusy(true);
    try {
      await revokePortalLink(authedFetch, patientId);
      setUrl(null);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  function handleCopy() {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mb-6 rounded-3xl border border-sand-200 bg-white p-5 shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
      <div className="flex items-center gap-2 text-sm font-bold text-ink">
        <Link2Icon className="h-4 w-4 text-teal-600" /> Patient portal link
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Generate a shareable link so this patient can view their own appointments, consent documents, and invoices — no login needed.
      </p>

      {loading ?
      <p className="mt-3 text-sm text-ink-muted">Loading…</p> :
      url ?
      <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-sand-100 px-3.5 py-2.5 text-xs text-ink-soft">{url}</code>
          <button
          type="button"
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-sand-200 px-3.5 py-2.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">
            {copied ? <CheckIcon className="h-3.5 w-3.5 text-teal-600" /> : <CopyIcon className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-sand-200 px-3.5 py-2.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">
            <ExternalLinkIcon className="h-3.5 w-3.5" /> Open
          </a>
          <button
          type="button"
          onClick={handleRevoke}
          disabled={busy}
          title="Revoke — invalidates the current link"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-sand-200 px-3.5 py-2.5 text-xs font-semibold text-ink-soft transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50">
            <Trash2Icon className="h-3.5 w-3.5" /> {busy ? "…" : "Revoke"}
          </button>
        </div> :
      <div className="mt-3">
          <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50">
            <Link2Icon className="h-3.5 w-3.5" /> {busy ? "Generating…" : "Generate portal link"}
          </button>
        </div>
      }
    </div>);

}
