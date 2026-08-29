import React from "react";
import { AlertCircleIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { AnalyticsHero } from "./AnalyticsHero";
import { RevenueProjectionsChart } from "./RevenueProjectionsChart";
import { SurgicalVolumeDonut } from "./SurgicalVolumeDonut";
import { computeAnalytics } from "./computeAnalytics";

export function AnalyticsPage() {
  const { total, byChannel, byCategory, escalationRate, resolutionRate } = computeAnalytics();

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Computed from the same session records shown in Agent Sessions — not a separate illustrative dataset." />


      <AnalyticsHero total={total} resolutionRate={resolutionRate} />

      <div className="mt-6 flex items-center gap-2 text-sm text-ink-muted">
        <AlertCircleIcon className="h-4 w-4 text-danger" />
        Escalation rate: <span className="font-semibold text-ink">{escalationRate}%</span>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <RevenueProjectionsChart byChannel={byChannel} />
        <SurgicalVolumeDonut byCategory={byCategory} />
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-sand-200 bg-white p-5 text-sm text-ink-muted">
        This page reads <code className="rounded bg-sand-100 px-1.5 py-0.5 text-xs">data/mockSessions.ts</code> —
        once the real <code className="rounded bg-sand-100 px-1.5 py-0.5 text-xs">conversations</code> backend API
        lands (see <code className="rounded bg-sand-100 px-1.5 py-0.5 text-xs">app/dashboard/README.md</code>),
        swapping the data source here doesn't require touching this page's layout.
      </div>
    </>);

}
