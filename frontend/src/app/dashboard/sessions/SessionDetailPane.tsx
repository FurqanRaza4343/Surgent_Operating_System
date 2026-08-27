import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2Icon } from "lucide-react";
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

export function SessionDetailPane({ session }: { session: Session }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-sand-200 px-6 py-4">
        <Link to={DASHBOARD_ROUTES.patientDetail(session.patientId)} className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sand-200 text-sm font-bold text-ink-soft">
            {session.patientInitial}
          </span>
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
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[session.status]}`}>
          {STATUS_LABEL[session.status]}
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {session.messages.map((m) =>
        m.from === "system" ?
        <div key={m.id} className="flex items-center justify-center gap-2 text-xs font-medium text-ink-muted">
              <CheckCircle2Icon className="h-3.5 w-3.5" />
              {m.text}
            </div> :

        <div key={m.id} className={`flex ${m.from === "agent" ? "justify-end" : "justify-start"}`}>
              <div
            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            m.from === "agent" ? "bg-teal-600 text-white" : "bg-sand-100 text-ink"}`
            }>

                {m.text}
              </div>
            </div>

        )}
      </div>

      {session.status === "needs_attention" &&
      <div className="border-t border-sand-200 px-6 py-4">
          <button className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
            Mark as resolved
          </button>
        </div>
      }
    </div>);

}
