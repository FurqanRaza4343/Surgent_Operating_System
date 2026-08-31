import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { PhoneCallIcon, AlertCircleIcon, CalendarCheckIcon, DollarSignIcon, ArrowRightIcon, CalendarIcon, PlusIcon } from "lucide-react";
import { KpiCard } from "../components/KpiCard";
import { SessionListItem } from "../sessions/SessionListItem";
import { EmptyState } from "../components/EmptyState";
import { MOCK_SESSIONS, MOCK_OVERVIEW_STATS } from "../data/mockSessions";
import { DASHBOARD_ROUTES } from "../constants/routes";
import { SetupChecklist } from "./SetupChecklist";
import { AIInsightsPanel } from "./AIInsightsPanel";
import { PatientSpotlight } from "./PatientSpotlight";
import { PatientVolumeChart } from "./PatientVolumeChart";

export function OverviewPage() {
  const navigate = useNavigate();
  const needsAttention = MOCK_SESSIONS.filter((s) => s.status === "needs_attention");
  const recent = [...MOCK_SESSIONS].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return (
    <>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-500">Operational overview</p>
          <h1 className="mt-2 font-display text-[28px] font-600 tracking-tight text-ink sm:text-[32px]">
            Good morning, Dr. Sarah Chen
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
            The AI Receptionist is currently managing 12 incoming inquiries. Your surgical schedule is optimized
            with 4 procedures confirmed for the morning block.
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button className="flex items-center gap-2 rounded-xl border border-sand-200 bg-white px-5 py-3 text-sm font-semibold text-ink shadow-[0_1px_2px_rgba(11,29,38,0.04)] transition-colors hover:border-accent-500/30">
            <CalendarIcon className="h-4 w-4 text-accent-500" /> View schedule
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.5)] transition-colors hover:bg-accent-600">
            <PlusIcon className="h-4 w-4" /> New consultation
          </button>
        </div>
      </div>

      <div className="mt-6">
        <SetupChecklist />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={PhoneCallIcon} label="Sessions today" value={String(MOCK_OVERVIEW_STATS.sessionsToday)} changePercent={72} />
        <KpiCard icon={AlertCircleIcon} label="Needs attention" value={String(MOCK_OVERVIEW_STATS.needsAttention)} changePercent={30} color="#EF4444" />
        <KpiCard icon={CalendarCheckIcon} label="Bookings created" value={String(MOCK_OVERVIEW_STATS.bookingsCreated)} changePercent={60} color="#10B981" />
        <KpiCard icon={DollarSignIcon} label="Revenue attributed" value={`$${MOCK_OVERVIEW_STATS.revenueAttributed.toLocaleString()}`} changePercent={45} color="#06B6D4" />
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col gap-6">
          <div className="rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between border-b border-sand-200 px-5 py-4">
              <p className="text-sm font-bold text-ink">Needs attention</p>
              <Link to={DASHBOARD_ROUTES.sessionsNeedsAttention} className="flex items-center gap-1 text-xs font-semibold text-accent-500 hover:underline">
                View all <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </div>
            {needsAttention.length === 0 ?
            <EmptyState icon={AlertCircleIcon} title="All clear" body="No sessions currently need staff review." /> :

            <div>
                {needsAttention.map((s) =>
              <SessionListItem key={s.id} session={s} active={false} onClick={() => navigate(DASHBOARD_ROUTES.sessionsNeedsAttention)} />
              )}
              </div>
            }
          </div>

          <div className="rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between border-b border-sand-200 px-5 py-4">
              <p className="text-sm font-bold text-ink">Recent activity</p>
              <Link to={DASHBOARD_ROUTES.sessionsAll} className="flex items-center gap-1 text-xs font-semibold text-accent-500 hover:underline">
                View all <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </div>
            <div>
              {recent.slice(0, 6).map((s) =>
              <SessionListItem key={s.id} session={s} active={false} onClick={() => navigate(DASHBOARD_ROUTES.sessionsAll)} />
              )}
            </div>
          </div>
        </div>

        <AIInsightsPanel />
      </div>

      <div className="mt-8">
        <PatientVolumeChart />
      </div>

      <div className="mt-8">
        <PatientSpotlight />
      </div>
    </>);

}
