import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SearchIcon, Loader2Icon, ArrowRightIcon } from "lucide-react";
import { listAdminPractices, type AdminPracticeListItem } from "../../../api/admin";
import { ADMIN_ROUTES } from "../constants/routes";

const TIER_LABEL: Record<string, string> = { solo: "Solo", practice: "Practice", enterprise: "Enterprise", custom: "Custom" };
const TIERS = ["all", "solo", "practice", "enterprise"] as const;

const STATUS_CLASS: Record<string, string> = {
  active: "bg-success/10 text-success",
  trial: "bg-accent-500/10 text-accent-700",
  past_due: "bg-warning/10 text-warning",
  cancelled: "bg-danger/10 text-danger",
  expired: "bg-danger/10 text-danger",
  none: "bg-ink-muted/10 text-ink-muted"
};

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function ClinicsListPage() {
  const [rows, setRows] = useState<AdminPracticeListItem[] | null>(null);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number]>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    listAdminPractices({ q: q || undefined, plan_tier: tier === "all" ? undefined : tier })
    .then((r) => {
      if (!cancelled) setRows(r);
    })
    .catch(() => {
      if (!cancelled) setError("Couldn't load clinics.");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tier]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-500">Clinics</p>
        <h1 className="font-display text-[28px] font-600 tracking-tight text-ink sm:text-[32px]">Every clinic on the platform</h1>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 sm:w-80">
          <SearchIcon className="h-4 w-4 text-ink-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clinics…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted" />

        </div>
        <div className="flex gap-1.5 rounded-full bg-sand-100 p-1">
          {TIERS.map((t) =>
          <button
            key={t}
            onClick={() => setTier(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            tier === t ? "bg-white text-ink shadow-[0_1px_2px_rgba(11,29,38,0.08)]" : "text-ink-muted hover:text-ink"}`
            }>

              {t === "all" ? "All plans" : TIER_LABEL[t]}
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        {error && <p className="p-6 text-sm text-danger">{error}</p>}
        {!rows && !error &&
        <div className="flex justify-center py-16">
            <Loader2Icon className="h-6 w-6 animate-spin text-accent-500" />
          </div>
        }
        {rows && rows.length === 0 &&
        <p className="p-6 text-center text-sm text-ink-muted">No clinics match.</p>
        }
        {rows && rows.length > 0 &&
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3.5">Clinic</th>
                  <th className="px-5 py-3.5">Plan</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Agents enabled</th>
                  <th className="px-5 py-3.5">Est. cost / mo</th>
                  <th className="px-5 py-3.5">Est. revenue / mo</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) =>
              <tr key={r.id} className="border-b border-sand-100 last:border-0 hover:bg-sand-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{r.name}</p>
                      <p className="text-xs text-ink-muted">{r.email}</p>
                    </td>
                    <td className="px-5 py-4 text-ink-soft">{TIER_LABEL[r.plan_tier] ?? r.plan_tier}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASS[r.subscription_status] ?? STATUS_CLASS.none}`}>
                        {r.subscription_status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ink-soft">{r.agents_enabled_count}</td>
                    <td className="px-5 py-4 text-ink-soft">{money(r.estimated_monthly_cost)}</td>
                    <td className="px-5 py-4 text-ink-soft">{money(r.estimated_monthly_revenue)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link to={ADMIN_ROUTES.clinicDetail(r.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-accent-500 hover:underline">
                        View <ArrowRightIcon className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        }
      </div>
    </>);

}
