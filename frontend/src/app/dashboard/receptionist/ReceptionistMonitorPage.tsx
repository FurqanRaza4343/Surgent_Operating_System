import React, { useEffect, useState } from "react";
import { PhoneCallIcon, BellRingIcon, LanguagesIcon, DollarSignIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { KpiCard } from "../components/KpiCard";
import { VoiceEngineCard } from "./VoiceEngineCard";
import { LiveTranscriptsList } from "./LiveTranscriptsList";
import { BookingPipelineFunnel } from "./BookingPipelineFunnel";
import { OmnichannelHubCard } from "./OmnichannelHubCard";
import { SystemHealthCard } from "./SystemHealthCard";
import { usePlan } from "../plan/PlanContext";
import { getAIReceptionistOverview, type AIReceptionistOverviewResponse } from "../../../api/entities";

export function ReceptionistMonitorPage() {
  const { authedFetch } = usePlan();
  const [overview, setOverview] = useState<AIReceptionistOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authedFetch) {
        setLoading(false);
        return;
      }
      try {
        const data = await getAIReceptionistOverview(authedFetch);
        if (!cancelled) setOverview(data);
      } catch {
        if (!cancelled) setOverview(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  return (
    <>
      <PageHeader
        title="AI Receptionist"
        subtitle="Real usage across calls, reminders, and translation — plus what it's costing you." />

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : !overview ? (
        <p className="text-sm text-ink-muted">Couldn't load AI Receptionist data.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={PhoneCallIcon} label="Calls & messages handled" value={overview.calls_handled.toLocaleString()} />
          <KpiCard icon={BellRingIcon} label="Reminders sent" value={overview.reminders_sent.toLocaleString()} color="#10B981" />
          <KpiCard icon={LanguagesIcon} label="Translations done" value={overview.translations_done.toLocaleString()} color="#06B6D4" />
          <KpiCard
            icon={DollarSignIcon}
            label="Est. cost (last 30 days)"
            value={`$${overview.estimated_cost_last_30_days.toFixed(2)}`}
            color="#EF4444" />
        </div>
      )}
      {overview && (
        <p className="mt-2 text-xs text-ink-muted">${overview.estimated_cost_total.toFixed(2)} total spent since the AI Receptionist started, based on real per-session rates.</p>
      )}

      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wide text-ink-muted">WhatsApp Channel — Live</p>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VoiceEngineCard activeCallLabel="WhatsApp — Listening for incoming messages" />
        </div>
        <BookingPipelineFunnel />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LiveTranscriptsList />
        </div>
        <div className="flex flex-col gap-6">
          <OmnichannelHubCard />
          <SystemHealthCard />
        </div>
      </div>
    </>
  );
}
