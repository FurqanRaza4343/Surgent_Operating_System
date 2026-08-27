import React from "react";
import { InboxIcon, AlertCircleIcon, CheckCircle2Icon, TrendingUpIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { KpiCard } from "../components/KpiCard";
import { BarRow } from "../components/BarRow";
import { computeAnalytics } from "./computeAnalytics";

export function AnalyticsPage() {
  const { total, byStatus, byChannel, byCategory, escalationRate, resolutionRate } = computeAnalytics();
  const maxChannel = Math.max(...byChannel.map((c) => c.count), 1);
  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1);

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Computed from the same session records shown in Agent Sessions — not a separate illustrative dataset." />


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={InboxIcon} label="Total sessions" value={String(total)} />
        <KpiCard icon={AlertCircleIcon} label="Escalation rate" value={`${escalationRate}%`} changePercent={escalationRate} color="#EF4444" />
        <KpiCard icon={CheckCircle2Icon} label="Resolution rate" value={`${resolutionRate}%`} changePercent={resolutionRate} color="#10B981" />
        <KpiCard icon={TrendingUpIcon} label="Active right now" value={String(byStatus.active)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <p className="mb-4 text-sm font-bold text-ink">Sessions by channel</p>
          <div className="space-y-4">
            {byChannel.map((c) => <BarRow key={c.id} label={c.label} count={c.count} max={maxChannel} color={c.color} />)}
          </div>
        </div>

        <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <p className="mb-4 text-sm font-bold text-ink">Sessions by agent category</p>
          <div className="space-y-4">
            {byCategory.map((c) => <BarRow key={c.id} label={c.label} count={c.count} max={maxCategory} />)}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-sand-200 bg-white p-5 text-sm text-ink-muted">
        This page reads <code className="rounded bg-sand-100 px-1.5 py-0.5 text-xs">data/mockSessions.ts</code> —
        once the real <code className="rounded bg-sand-100 px-1.5 py-0.5 text-xs">conversations</code> backend API
        lands (see <code className="rounded bg-sand-100 px-1.5 py-0.5 text-xs">app/dashboard/README.md</code>),
        swapping the data source here doesn't require touching this page's layout.
      </div>
    </>);

}
