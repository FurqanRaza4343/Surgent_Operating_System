import React, { useEffect, useState } from "react";
import { Building2Icon, DollarSignIcon, TrendingDownIcon, PercentIcon, Loader2Icon } from "lucide-react";
import { getAdminSummary, type AdminSummaryResponse } from "../../../api/admin";
import { KpiCard } from "../../dashboard/components/KpiCard";
import { PlatformPulsePanel } from "./PlatformPulsePanel";

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function PlatformOverviewPage() {
  const [summary, setSummary] = useState<AdminSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminSummary()
    .then((s) => {
      if (!cancelled) setSummary(s);
    })
    .catch(() => {
      if (!cancelled) setError("Couldn't load platform summary.");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-500">Platform overview</p>
        <h1 className="mt-2 font-display text-[28px] font-600 tracking-tight text-ink sm:text-[32px]">
          Every clinic on Aiaceone, in one place
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
          Plans, agents enabled, and what running them costs us — updated live from the same data clinics see in
          their own dashboards.
        </p>
      </div>

      {error && <p className="mt-6 text-sm text-danger">{error}</p>}

      {!summary && !error &&
      <div className="mt-10 flex justify-center">
          <Loader2Icon className="h-6 w-6 animate-spin text-accent-500" />
        </div>
      }

      {summary &&
      <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Building2Icon} label="Total clinics" value={String(summary.total_clinics)} />
            <KpiCard icon={DollarSignIcon} label="Estimated MRR" value={money(summary.total_estimated_mrr)} color="#10B981" />
            <KpiCard icon={TrendingDownIcon} label="Estimated cost" value={money(summary.total_estimated_cost)} color="#EF4444" />
            <KpiCard icon={PercentIcon} label="Estimated margin" value={`${summary.margin_percent.toFixed(1)}%`} color="#06B6D4" />
          </div>

          <p className="mt-3 text-xs text-ink-muted">{summary.assumption_note}</p>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex-1 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-bold text-ink">Estimated margin</p>
              <p className="mt-1 text-xs text-ink-muted">Revenue minus estimated agent-running cost, across every clinic.</p>
              <div className="mt-6 flex items-end gap-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Revenue</p>
                  <p className="mt-1 font-display text-2xl font-bold text-ink">{money(summary.total_estimated_mrr)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Cost</p>
                  <p className="mt-1 font-display text-2xl font-bold text-ink">{money(summary.total_estimated_cost)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Margin</p>
                  <p className="mt-1 font-display text-2xl font-bold text-success">{money(summary.total_estimated_margin)}</p>
                </div>
              </div>
              <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-sand-100">
                <div
                className="h-full rounded-full bg-accent-500"
                style={{
                  width: `${summary.total_estimated_mrr ? Math.min(100, (summary.total_estimated_cost / summary.total_estimated_mrr) * 100) : 0}%`
                }} />

              </div>
              <p className="mt-2 text-xs text-ink-muted">Filled portion = estimated cost as a share of revenue.</p>
            </div>

            <PlatformPulsePanel planDistribution={summary.plan_distribution} />
          </div>
        </>
      }
    </>);

}
