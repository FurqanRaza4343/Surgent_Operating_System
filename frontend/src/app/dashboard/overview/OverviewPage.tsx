import React from "react";
import { Link } from "react-router-dom";
import { PhoneCallIcon, AlertCircleIcon, CalendarCheckIcon, DollarSignIcon, ArrowRightIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { KpiCard } from "../components/KpiCard";
import { SessionListItem } from "../sessions/SessionListItem";
import { EmptyState } from "../components/EmptyState";
import { MOCK_SESSIONS, MOCK_OVERVIEW_STATS } from "../data/mockSessions";
import { DASHBOARD_ROUTES } from "../constants/routes";
import { SetupChecklist } from "./SetupChecklist";

export function OverviewPage() {
  const needsAttention = MOCK_SESSIONS.filter((s) => s.status === "needs_attention");
  const recent = [...MOCK_SESSIONS].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return (
    <>
      <PageHeader title="Overview" subtitle="What your agents handled today, across every channel." />

      <SetupChecklist />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={PhoneCallIcon} label="Sessions today" value={String(MOCK_OVERVIEW_STATS.sessionsToday)} changePercent={72} />
        <KpiCard icon={AlertCircleIcon} label="Needs attention" value={String(MOCK_OVERVIEW_STATS.needsAttention)} changePercent={30} color="#EF4444" />
        <KpiCard icon={CalendarCheckIcon} label="Bookings created" value={String(MOCK_OVERVIEW_STATS.bookingsCreated)} changePercent={60} color="#10B981" />
        <KpiCard icon={DollarSignIcon} label="Revenue attributed" value={`$${MOCK_OVERVIEW_STATS.revenueAttributed.toLocaleString()}`} changePercent={45} color="#C9A24B" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between border-b border-sand-200 px-5 py-4">
            <p className="text-sm font-bold text-ink">Needs attention</p>
            <Link to={DASHBOARD_ROUTES.sessionsNeedsAttention} className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline">
              View all <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          {needsAttention.length === 0 ?
          <EmptyState icon={AlertCircleIcon} title="All clear" body="No sessions currently need staff review." /> :

          <div>
              {needsAttention.map((s) =>
            <SessionListItem key={s.id} session={s} active={false} onClick={() => {}} />
            )}
            </div>
          }
        </div>

        <div className="rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between border-b border-sand-200 px-5 py-4">
            <p className="text-sm font-bold text-ink">Recent activity</p>
            <Link to={DASHBOARD_ROUTES.sessionsAll} className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline">
              View all <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          <div>
            {recent.slice(0, 6).map((s) =>
            <SessionListItem key={s.id} session={s} active={false} onClick={() => {}} />
            )}
          </div>
        </div>
      </div>
    </>);

}
