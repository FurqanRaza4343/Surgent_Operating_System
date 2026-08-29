import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SparklesIcon, SendIcon, LockIcon, Loader2Icon, PlusIcon, MessageSquareIcon, ChevronLeftIcon } from "lucide-react";
import { DASHBOARD_ROUTES } from "../constants/routes";
import { usePlan } from "../plan/PlanContext";
import {
  askCommandCenter,
  listCommandCenterSessions,
  getCommandCenterSession,
  type CommandCenterStep,
  type CommandCenterSessionSummary
} from "../../../api/commandCenter";
import { AGENT_CATEGORIES } from "../../../data/agents";
import { minTierForCategory, planFor } from "../plan/plan";

// The AIInsightsPanel's embedded chat — same dark box, same width, no
// separate page/modal. Deliberately NOT ../command-center/CommandCenterChat.tsx
// (that one's a side-by-side sessions-rail + chat layout built for the
// full-width /dashboard/command-center page — it doesn't fit a 340px-wide
// panel). This is a narrower, single-column, session-list <-> thread
// component that reuses the same api/commandCenter.ts calls.

const CATEGORY_ICON: Record<string, (typeof AGENT_CATEGORIES)[number]["agents"][number]["icon"]> = Object.fromEntries(
  AGENT_CATEGORIES.map((c) => [c.id, c.agents[0].icon])
);

const REVEAL_DELAY_MS = 550;

interface Turn {
  id: string;
  question: string;
  allSteps: CommandCenterStep[];
  revealedCount: number;
  answer: string | null;
  error: string | null;
}

function turnsFromSession(messages: { role: "staff" | "agent"; content: string; steps: CommandCenterStep[] }[]): Turn[] {
  const turns: Turn[] = [];
  let pending: Turn | null = null;
  messages.forEach((m, i) => {
    if (m.role === "staff") {
      pending = { id: `h${i}`, question: m.content, allSteps: [], revealedCount: 0, answer: null, error: null };
      turns.push(pending);
    } else if (pending) {
      pending.allSteps = m.steps;
      pending.revealedCount = m.steps.length;
      pending.answer = m.content;
    }
  });
  return turns;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

type View = "sessions" | "thread";

export function AICommandCenterCompact() {
  const { authedFetch } = usePlan();
  const [view, setView] = useState<View>("sessions");
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sessions, setSessions] = useState<CommandCenterSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);

  const refreshSessions = useCallback(async () => {
    if (!authedFetch) return;
    try {
      setSessions(await listCommandCenterSessions(authedFetch));
    } catch {
      // Session list is a convenience — a failed fetch just leaves it empty.
    }
  }, [authedFetch]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  async function openSession(id: string) {
    if (!authedFetch) return;
    setActiveSessionId(id);
    setView("thread");
    setLoadingSession(true);
    try {
      const detail = await getCommandCenterSession(authedFetch, id);
      setTurns(turnsFromSession(detail.messages));
    } catch {
      setTurns([]);
    } finally {
      setLoadingSession(false);
    }
  }

  function startNewChat() {
    setActiveSessionId(null);
    setTurns([]);
    setView("thread");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || sending || !authedFetch) return;

    const id = `t${Date.now()}`;
    setTurns((prev) => [...prev, { id, question: q, allSteps: [], revealedCount: 0, answer: null, error: null }]);
    setQuestion("");
    setSending(true);

    try {
      const response = await askCommandCenter(authedFetch, q, activeSessionId);
      if (!activeSessionId) setActiveSessionId(response.session_id);
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, allSteps: response.steps } : t)));
      for (let i = 0; i < response.steps.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, REVEAL_DELAY_MS));
        setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, revealedCount: i + 1 } : t)));
      }
      if (response.steps.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, REVEAL_DELAY_MS));
      }
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, answer: response.answer } : t)));
      refreshSessions();
    } catch {
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, error: "Couldn't reach the Command Center." } : t))
      );
    } finally {
      setSending(false);
    }
  }

  const lastTurnId = turns.length > 0 ? turns[turns.length - 1].id : null;

  return (
    <div className="flex h-[460px] flex-col">
      {/* Sub-nav: sessions <-> thread, always inside the same box */}
      <div className="mb-3 flex items-center justify-between">
        {view === "thread" ?
        <button
          onClick={() => setView("sessions")}
          className="flex items-center gap-1 text-xs font-semibold text-white/60 transition-colors hover:text-white">

            <ChevronLeftIcon className="h-3.5 w-3.5" /> Sessions
          </button> :

        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/40">Recent sessions</span>
        }
        <button
          onClick={startNewChat}
          className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20">

          <PlusIcon className="h-3 w-3" /> New
        </button>
      </div>

      {view === "sessions" &&
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {sessions.length === 0 &&
        <p className="px-1 py-4 text-center text-xs text-white/40">
              No past sessions yet — start a new chat below.
            </p>
        }
          {sessions.map((s) =>
        <button
          key={s.id}
          onClick={() => openSession(s.id)}
          className="flex w-full items-start gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.12]">

              <MessageSquareIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white">{s.title}</span>
                <span className="block text-[10px] text-white/40">{timeAgo(s.updated_at)}</span>
              </span>
            </button>
        )}
        </div>
      }

      {view === "thread" &&
      <>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {loadingSession && <p className="text-xs text-white/40">Loading session…</p>}
            {!loadingSession && turns.length === 0 &&
          <p className="text-xs leading-relaxed text-white/40">
                Ask something like "which patients need surgery?" — the Main Agent will consult the right agent(s).
              </p>
          }

            {!loadingSession && turns.map((t) =>
          <div key={t.id} className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl bg-accent-500 px-3 py-2 text-xs leading-relaxed text-white">
                    {t.question}
                  </div>
                </div>

                {t.allSteps.slice(0, t.revealedCount).map((step) => {
              const Icon = CATEGORY_ICON[step.category_id] ?? SparklesIcon;
              return (
                <div key={step.category_id} className="flex justify-start">
                    <div className="flex max-w-[90%] items-start gap-2 rounded-xl bg-white/[0.08] px-3 py-2 text-xs text-white/70">
                      <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    step.status === "locked" ? "bg-warning/20 text-warning" : "bg-accent-500/20 text-accent-400"}`
                    }>

                        {step.status === "locked" ? <LockIcon className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                      </span>
                      <div>
                        <p className="font-semibold text-white">Asked {step.category_label}</p>
                        <p className="mt-0.5 text-white/50">{step.summary}</p>
                        {step.status === "locked" &&
                    <Link
                      to={DASHBOARD_ROUTES.settingsBilling}
                      className="mt-1 inline-block text-[11px] font-semibold text-accent-400 hover:underline">

                            Included in {planFor(minTierForCategory(step.category_id) || "enterprise").name} — upgrade
                          </Link>
                    }
                      </div>
                    </div>
                  </div>);

            })}

                {sending && t.id === lastTurnId && t.answer === null && !t.error &&
            <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                    <Loader2Icon className="h-3 w-3 animate-spin" /> Consulting…
                  </div>
            }

                {t.error && <p className="text-xs text-danger">{t.error}</p>}

                {t.answer !== null &&
            <div className="flex justify-start">
                    <div className="flex max-w-[90%] items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs leading-relaxed text-white/90">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white">
                        <SparklesIcon className="h-3 w-3" />
                      </span>
                      {t.answer}
                    </div>
                  </div>
            }
              </div>
          )}
          </div>

          <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
            <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={1}
            placeholder={authedFetch ? "Ask the Main Agent…" : "Sign in to chat"}
            disabled={!authedFetch || sending}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-accent-500/50 disabled:cursor-not-allowed disabled:opacity-60" />


            <button
            type="submit"
            disabled={!authedFetch || sending || !question.trim()}
            className="flex shrink-0 items-center justify-center rounded-xl bg-accent-500 p-2.5 text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-40">

              {sending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
            </button>
          </form>
        </>
      }
    </div>);

}
