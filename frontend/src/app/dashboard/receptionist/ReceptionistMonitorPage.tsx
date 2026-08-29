import React from "react";
import { PhoneCallIcon, CalendarCheckIcon, TimerIcon, AlertTriangleIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { KpiCard } from "../components/KpiCard";
import { VoiceEngineCard } from "./VoiceEngineCard";
import { LiveTranscriptsList } from "./LiveTranscriptsList";
import { BookingPipelineFunnel } from "./BookingPipelineFunnel";
import { OmnichannelHubCard } from "./OmnichannelHubCard";
import { SystemHealthCard } from "./SystemHealthCard";
import { MOCK_RECEPTIONIST_STATS } from "../data/mockReceptionistActivity";

// The staff-facing live-monitoring view for the AI Receptionist agent —
// distinct from the generic AgentDetailPage template that still lives at
// /dashboard/agents/front-desk/receptionist (that one's the catch-all for
// all 31 agents; this is a purpose-built page for this one). Mock data
// throughout (data/mockReceptionistActivity.ts) — the real receptionist
// backend has no live call/booking telemetry yet; wiring that is the next
// phase, not this page's job.
export function ReceptionistMonitorPage() {
  const s = MOCK_RECEPTIONIST_STATS;

  return (
    <>
      <PageHeader
        title="AI Receptionist"
        subtitle="Live view of the 24/7 front desk — calls, bookings, and channel activity as they happen." />


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={PhoneCallIcon} label="Active calls" value={String(s.activeCalls)} changePercent={s.activeCallsChangePercent} />
        <KpiCard icon={CalendarCheckIcon} label="AI bookings" value={String(s.aiBookings)} changePercent={s.conversionRate} color="#10B981" />
        <KpiCard icon={TimerIcon} label="Latency" value={`${(s.latencyMs / 1000).toFixed(1)}s`} color="#06B6D4" />
        <KpiCard icon={AlertTriangleIcon} label="Escalations" value={String(s.escalations)} color="#EF4444" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VoiceEngineCard activeCallLabel="Patient #8102 (Appointment inquiry)" />
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
    </>);

}
