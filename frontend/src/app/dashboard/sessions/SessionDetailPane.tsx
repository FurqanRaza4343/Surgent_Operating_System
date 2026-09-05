import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2Icon, RefreshCwIcon, SendIcon, SparklesIcon, PauseIcon, PlayIcon } from "lucide-react";
import type { Session } from "./types";
import { ChannelIcon } from "./ChannelIcon";
import { CHANNELS } from "../data/channels";
import { DASHBOARD_ROUTES } from "../constants/routes";

const STATUS_LABEL: Record<Session["status"], string> = {
  active: "Active",
  needs_attention: "Needs attention",
  resolved: "Resolved"
};

const STATUS_CLASS: Record<Session["status"], string> = {
  active: "bg-teal-600/10 text-teal-600",
  needs_attention: "bg-danger/10 text-danger",
  resolved: "bg-success/10 text-success"
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

interface SessionDetailPaneProps {
  session: Session;
  onResolve?: (sessionId: string) => void;
  onSendMessage?: (sessionId: string, body: string) => Promise<void>;
  onToggleAi?: (sessionId: string, paused: boolean) => Promise<void>;
}

export function SessionDetailPane({ session, onResolve, onSendMessage, onToggleAi }: SessionDetailPaneProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);
  const canReply = session.channel === "whatsapp" && !!onSendMessage;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !onSendMessage) return;
    setSending(true);
    try {
      await onSendMessage(session.id, draft.trim());
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  async function handleToggleAi() {
    if (!onToggleAi) return;
    setTogglingAi(true);
    try {
      await onToggleAi(session.id, !session.aiPaused);
    } finally {
      setTogglingAi(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-sand-200 px-6 py-4">
        <Link to={DASHBOARD_ROUTES.patientDetail(session.patientId)} className="group flex items-center gap-3">
          {session.avatarUrl ?
          <img src={session.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> :

          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sand-200 text-sm font-bold text-ink-soft">
              {session.patientInitial}
            </span>
          }
          <div>
            <p className="text-sm font-bold text-ink group-hover:text-teal-600">{session.patientName}</p>
            <div className="flex items-center gap-1.5">
              <ChannelIcon channel={session.channel} size={10} />
              <p className="text-xs text-ink-muted">
                {CHANNELS[session.channel].label} · handled by {session.agentName}
              </p>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {canReply && onToggleAi &&
          <button
            type="button"
            onClick={handleToggleAi}
            disabled={togglingAi}
            title={session.aiPaused ? "Resume AI auto-reply" : "Pause AI and take over"}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
            session.aiPaused ? "bg-warning/10 text-warning hover:bg-warning/15" : "bg-teal-600/10 text-teal-600 hover:bg-teal-600/15"}`
            }>
              {session.aiPaused ? <PlayIcon className="h-3 w-3" /> : <PauseIcon className="h-3 w-3" />}
              {session.aiPaused ? "AI paused" : "AI replying"}
            </button>
          }
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[session.status]}`}>
            {STATUS_LABEL[session.status]}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {session.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <RefreshCwIcon className="h-5 w-5 text-ink-muted mb-2 animate-spin" />
            <p className="text-sm text-ink-muted">Loading messages...</p>
          </div>
        ) : (
          session.messages.map((m) =>
            m.from === "system" ? (
              <div key={m.id} className="flex items-center justify-center gap-2 text-xs font-medium text-ink-muted">
                <CheckCircle2Icon className="h-3.5 w-3.5" />
                {m.text}
              </div>
            ) : (
              <div key={m.id} className={`flex flex-col ${m.from === "patient" ? "items-start" : "items-end"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.from === "agent" ? "bg-teal-600 text-white" :
                  m.from === "staff" ? "bg-accent-500 text-white" :
                  "bg-sand-100 text-ink"}`
                  }>

                  {m.text}
                </div>
                <div className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-ink-muted">
                  {m.from === "agent" && <SparklesIcon className="h-2.5 w-2.5" />}
                  {m.from === "agent" ? "AI Receptionist" : m.from === "staff" ? "You" : session.patientName}
                  {" · "}{formatTime(m.at)}
                </div>
              </div>
            )
          )
        )}
      </div>

      {canReply &&
      <form onSubmit={handleSend} className="flex items-center gap-2.5 border-t border-sand-200 px-4 py-3.5">
          <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Reply over WhatsApp…"
          className="flex-1 rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />

          <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">

            <SendIcon className="h-4 w-4" />
          </button>
        </form>
      }

      {session.status === "needs_attention" && onResolve && (
        <div className="border-t border-sand-200 px-6 py-4">
          <button
            onClick={() => onResolve(session.id)}
            className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
            Mark as resolved
          </button>
        </div>
      )}
    </div>
  );
}
