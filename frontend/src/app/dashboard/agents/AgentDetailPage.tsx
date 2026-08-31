import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon, ZapIcon, InboxIcon, UsersIcon, ScissorsIcon } from "lucide-react";
import { AGENT_CATEGORIES, AGENTS_BY_SLUG } from "../../../data/agents";
import { ComingSoon } from "../components/ComingSoon";
import { EmptyState } from "../components/EmptyState";
import { MOCK_SESSIONS } from "../data/mockSessions";
import { SessionsView } from "../sessions/SessionsView";
import { DASHBOARD_ROUTES } from "../constants/routes";
import { usePlan } from "../plan/PlanContext";
import { UpgradeRequired } from "../plan/UpgradeRequired";
import { minTierForCategory } from "../plan/plan";
import { usePatients } from "../patients/usePatients";

// receptionist, appointment_reminder, and multilingual_translation are real
// today — see backend/src/services/ai_receptionist/ (voice_chat_service.py,
// reminder_service.py, translation_service.py; the 3 previously-separate
// "agent" folders for these were merged into that one module). appointment_booking
// and reschedule_cancellation are fully covered by the real Receptionist
// staff role/AppointmentsService instead (no dedicated AI-agent endpoint any
// more). Everything else here is still structurally scaffolded but not
// implemented. Shown honestly rather than implying all 31 agents are equally live.
const LIVE_AGENT_SLUGS = new Set(["receptionist", "appointment_reminder", "multilingual_translation"]);

const AGENT_LOGOS: Record<string, string> = {
  receptionist: "/agent-logos/receptionist.png"
};

export function AgentDetailPage() {
  const { categoryId, agentSlug } = useParams<{ categoryId: string; agentSlug: string }>();
  const category = AGENT_CATEGORIES.find((c) => c.id === categoryId);
  const agent = agentSlug ? AGENTS_BY_SLUG[agentSlug] : undefined;
  const { allowsCategory, loading, authedFetch } = usePlan();
  const { patients } = usePatients(authedFetch);

  if (!category || !agent || agent.categoryId !== categoryId) {
    return <ComingSoon icon={ZapIcon} title="Agent not found" body="This agent doesn't exist in this category." phase="—" />;
  }

  if (loading) return null;

  // Defense-in-depth for a hand-typed URL to a locked agent — the category
  // page already stops the normal click-through path.
  if (!allowsCategory(category.id)) {
    return <UpgradeRequired title={category.label} tagline={category.tagline} minTier={minTierForCategory(category.id) || "enterprise"} agents={category.agents} />;
  }

  const isLive = LIVE_AGENT_SLUGS.has(agent.slug);
  const sessions = MOCK_SESSIONS.filter((s) => s.agentSlug === agent.slug);
  const routedPatients = patients.filter((p) => p.assignedAgentSlug === agent.slug);

  return (
    <>
      <Link
        to={DASHBOARD_ROUTES.agentCategory(category.id)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink">

        <ArrowLeftIcon className="h-4 w-4" /> Back to {category.label}
      </Link>

      <div className="mb-6 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600/8 text-teal-600">
              {AGENT_LOGOS[agent.slug] ? (
                <img src={AGENT_LOGOS[agent.slug]} alt="" className="h-9 w-9 object-contain" />
              ) : (
                <agent.icon className="h-7 w-7" />
              )}
            </span>
            <div>
              <p className="text-lg font-bold text-ink">{agent.name}</p>
              <p className="mt-0.5 max-w-md text-sm text-ink-muted">{agent.desc}</p>
            </div>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
            isLive ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`
            }>

            <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-success" : "bg-warning"}`} />
            {isLive ? "Live" : "Configured, not yet active"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-sand-100 px-4 py-3">
            <p className="font-mono text-2xl font-bold tabular-nums text-ink">{sessions.length}</p>
            <p className="text-xs text-ink-muted">Sessions on record</p>
          </div>
          <div className="rounded-xl bg-sand-100 px-4 py-3">
            <p className="font-mono text-2xl font-bold tabular-nums text-ink">
              {sessions.filter((s) => s.status === "needs_attention").length}
            </p>
            <p className="text-xs text-ink-muted">Escalated to staff</p>
          </div>
          <div className="rounded-xl bg-sand-100 px-4 py-3">
            <p className="font-mono text-2xl font-bold tabular-nums text-ink">
              {sessions.filter((s) => s.status === "resolved").length}
            </p>
            <p className="text-xs text-ink-muted">Resolved</p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
          <UsersIcon className="h-4 w-4 text-teal-600" /> Patients routed here
        </div>
        {routedPatients.length === 0 ?
        <p className="text-sm text-ink-muted">No patients assigned to {agent.name} yet — added patients are routed here automatically based on what they describe.</p> :

        <div className="space-y-2.5">
            {routedPatients.map((p) =>
          <Link
            key={p.id}
            to={DASHBOARD_ROUTES.patientDetail(p.id)}
            className="flex items-start gap-3 rounded-xl bg-sand-100 px-4 py-3 transition-colors hover:bg-teal-600/8">

                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-ink-soft">
                  {p.initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{p.name}</p>
                    {p.needsSurgery &&
                <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                        <ScissorsIcon className="h-2.5 w-2.5" /> Surgery
                      </span>
                }
                  </div>
                  <p className="truncate text-xs text-ink-muted">{p.chiefComplaint || "No details provided."}</p>
                </div>
              </Link>
          )}
          </div>
        }
      </div>

      <p className="mb-3 text-sm font-bold text-ink">Sessions handled by {agent.name}</p>
      {sessions.length === 0 ?
      <div className="rounded-3xl border border-sand-200 bg-white">
          <EmptyState icon={InboxIcon} title="No sessions yet" body={`Once ${agent.name} handles a conversation, it'll show up here.`} />
        </div> :

      <SessionsView sessions={sessions} />
      }
    </>);

}
