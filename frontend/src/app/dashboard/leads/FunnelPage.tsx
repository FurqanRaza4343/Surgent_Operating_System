import React, { useEffect, useState } from "react";
import { TrendingUpIcon, XCircleIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { usePlan } from "../plan/PlanContext";
import { getFunnelSummary, type FunnelStageCount } from "../../../api/entities";
import { BookingPipelineFunnel } from "../receptionist/BookingPipelineFunnel";

// Ordered forward-progression stages shown as funnel bars — LOST is a
// dead-end branch, not a step forward, so it gets its own stat instead of
// distorting the bar chart's decreasing-width shape.
const FUNNEL_STAGES: { key: string; label: string }[] = [
{ key: "inquiry", label: "Inquiry" },
{ key: "contacted", label: "Contacted" },
{ key: "consult_scheduled", label: "Consult scheduled" },
{ key: "consult_completed", label: "Consult completed" },
{ key: "treatment_planned", label: "Treatment planned" },
{ key: "patient", label: "Became a patient" }];


export function FunnelPage() {
  const { authedFetch } = usePlan();
  const [summary, setSummary] = useState<FunnelStageCount[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authedFetch) {
        setLoading(false);
        return;
      }
      try {
        const data = await getFunnelSummary(authedFetch);
        if (!cancelled) setSummary(data);
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  if (loading) return null;

  const countFor = (stage: string) => summary?.find((s) => s.stage === stage)?.count ?? 0;
  const lostCount = countFor("lost");
  const totalLeads = summary?.reduce((sum, s) => sum + s.count, 0) ?? 0;

  return (
    <>
      <PageHeader title="Leads / Funnel" subtitle="Where every inquiry stands in your pipeline, from first contact to booked patient." />

      {!summary || totalLeads === 0 ?
      <div className="rounded-3xl border border-sand-200 bg-white p-10 text-center">
          <TrendingUpIcon className="mx-auto h-8 w-8 text-ink-muted" />
          <p className="mt-3 text-sm font-semibold text-ink">No patients in the funnel yet</p>
          <p className="mt-1 text-sm text-ink-muted">As you add patients, they'll show up here at their current stage.</p>
        </div> :

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <BookingPipelineFunnel
          title="Patient funnel"
          stages={FUNNEL_STAGES.map((s) => ({ label: s.label, count: countFor(s.key) }))} />


          <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <XCircleIcon className="h-4 w-4 text-danger" /> Lost
            </div>
            <p className="mt-4 font-display text-[28px] font-600 tabular-nums text-ink">{lostCount.toLocaleString()}</p>
            <p className="mt-1 text-xs text-ink-muted">Leads that didn't convert — set from a patient's own detail page.</p>
          </div>
        </div>
      }
    </>);

}
