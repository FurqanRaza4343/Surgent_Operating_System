import React from "react";
import type { Session } from "./types";
import { ChannelIcon } from "./ChannelIcon";

const STATUS_DOT: Record<Session["status"], string> = {
  active: "bg-teal-600",
  needs_attention: "bg-danger",
  resolved: "bg-success"
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function SessionListItem({
  session,
  active,
  onClick



}: {session: Session;active: boolean;onClick: () => void;}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 border-b border-sand-200/70 px-4 py-3.5 text-left transition-colors ${
      active ? "bg-teal-600/6" : "hover:bg-sand-100"}`
      }>

      <span className="relative mt-0.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sand-200 text-sm font-bold text-ink-soft">
          {session.patientInitial}
        </span>
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${STATUS_DOT[session.status]}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-ink">{session.patientName}</span>
          <span className="shrink-0 text-xs text-ink-muted">{timeAgo(session.updatedAt)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <ChannelIcon channel={session.channel} size={10} />
          <span className="text-xs text-ink-muted">{session.agentName}</span>
        </span>
        <span className="mt-1 block truncate text-xs text-ink-muted">{session.lastMessagePreview}</span>
      </span>
    </button>);

}
