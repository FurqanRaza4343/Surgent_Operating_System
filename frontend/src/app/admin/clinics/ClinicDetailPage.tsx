import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeftIcon, Loader2Icon, MailIcon, PhoneIcon, MapPinIcon, CheckIcon, ChevronDownIcon } from "lucide-react";
import { getAdminPracticeDetail, updatePracticeSubscription, type AdminPracticeDetailResponse } from "../../../api/admin";
import { ADMIN_ROUTES } from "../constants/routes";

const TIER_LABEL: Record<string, string> = { solo: "Solo", practice: "Practice", enterprise: "Enterprise", custom: "Custom" };
const TIER_ORDER = ["solo", "practice", "enterprise"] as const;

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function ClinicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminPracticeDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planSaved, setPlanSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getAdminPracticeDetail(id)
    .then((d) => {
      if (!cancelled) setDetail(d);
    })
    .catch(() => {
      if (!cancelled) setError("Couldn't load this clinic.");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function changePlan(tier: string) {
    if (!id || !detail || tier === detail.plan_tier) {
      setPlanMenuOpen(false);
      return;
    }
    setSavingPlan(true);
    setPlanError(null);
    setPlanSaved(false);
    try {
      const updated = await updatePracticeSubscription(id, tier);
      setDetail(updated);
      setPlanMenuOpen(false);
      setPlanSaved(true);
      setTimeout(() => setPlanSaved(false), 3000);
    } catch {
      setPlanError("Couldn't change the plan. Please try again.");
    } finally {
      setSavingPlan(false);
    }
  }

  return (
    <>
      <Link to={ADMIN_ROUTES.clinics} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeftIcon className="h-4 w-4" /> All clinics
      </Link>

      {error && <p className="mt-6 text-sm text-danger">{error}</p>}
      {!detail && !error &&
      <div className="mt-10 flex justify-center">
          <Loader2Icon className="h-6 w-6 animate-spin text-accent-500" />
        </div>
      }

      {detail &&
      <>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-[26px] font-600 tracking-tight text-ink">{detail.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                <span className="flex items-center gap-1.5"><MailIcon className="h-3.5 w-3.5" /> {detail.email}</span>
                {detail.phone && <span className="flex items-center gap-1.5"><PhoneIcon className="h-3.5 w-3.5" /> {detail.phone}</span>}
                {detail.address && <span className="flex items-center gap-1.5"><MapPinIcon className="h-3.5 w-3.5" /> {detail.address}</span>}
              </div>
            </div>

            <div className="relative flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-accent-500/10 px-3 py-1.5 text-sm font-semibold text-accent-700">
                  {TIER_LABEL[detail.plan_tier] ?? detail.plan_tier} plan
                </span>
                <span className="inline-flex items-center rounded-full bg-sand-100 px-3 py-1.5 text-sm font-semibold text-ink-muted">
                  {detail.subscription_status}
                </span>
              </div>

              <div className="relative">
                <button
                  onClick={() => setPlanMenuOpen((o) => !o)}
                  disabled={savingPlan}
                  className="flex items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-accent-500/50 hover:text-accent-700 disabled:opacity-50">
                  {savingPlan ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <ChevronDownIcon className="h-3 w-3" />}
                  Change plan
                </button>

                {planMenuOpen &&
                <div className="absolute right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-xl border border-sand-200 bg-white shadow-[0_12px_40px_-12px_rgba(11,29,38,0.25)]">
                    {TIER_ORDER.map((t) =>
                  <button
                    key={t}
                    disabled={t === detail.plan_tier}
                    onClick={() => changePlan(t)}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                    t === detail.plan_tier ? "cursor-default bg-accent-500/5 text-ink" : "text-ink hover:bg-sand-50"}`
                    }>

                        {TIER_LABEL[t]}
                        {t === detail.plan_tier &&
                  <CheckIcon className="h-3.5 w-3.5 text-accent-500" />
                  }
                      </button>
                  )}
                  </div>
                }
              </div>

              {planError && <p className="text-xs text-danger">{planError}</p>}
              {planSaved && <p className="text-xs font-medium text-success">Plan updated.</p>}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-sand-200 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Est. revenue / mo</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">{money(detail.estimated_monthly_revenue)}</p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Est. cost / mo</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">{money(detail.estimated_monthly_cost)}</p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Est. margin / mo</p>
              <p className="mt-1 font-display text-2xl font-bold text-success">
                {money(detail.estimated_monthly_revenue - detail.estimated_monthly_cost)}
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
            <div className="border-b border-sand-200 px-5 py-4">
              <p className="text-sm font-bold text-ink">Agent cost breakdown</p>
              <p className="text-xs text-ink-muted">{detail.agent_breakdown.length} agents configured</p>
            </div>
            {detail.agent_breakdown.length === 0 ?
          <p className="p-6 text-sm text-ink-muted">No agents configured for this clinic yet.</p> :

          <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-sand-200 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      <th className="px-5 py-3">Agent</th>
                      <th className="px-5 py-3">Enabled</th>
                      <th className="px-5 py-3">Cost / session</th>
                      <th className="px-5 py-3">Est. cost / mo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.agent_breakdown.map((a) =>
                <tr key={a.agent_slug} className="border-b border-sand-100 last:border-0">
                        <td className="px-5 py-3 font-medium text-ink">{a.agent_slug.replace(/_/g, " ")}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.enabled ? "bg-success/10 text-success" : "bg-ink-muted/10 text-ink-muted"}`}>
                            {a.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-ink-soft">{money(a.cost_per_session)}</td>
                        <td className="px-5 py-3 text-ink-soft">{money(a.estimated_monthly_cost)}</td>
                      </tr>
                )}
                  </tbody>
                </table>
              </div>
          }
          </div>
        </>
      }
    </>);

}
