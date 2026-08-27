import React, { useState } from "react";
import { InboxIcon } from "lucide-react";
import type { Session } from "./types";
import { SessionListItem } from "./SessionListItem";
import { SessionDetailPane } from "./SessionDetailPane";
import { EmptyState } from "../components/EmptyState";

export function SessionsView({ sessions }: { sessions: Session[] }) {
  const [selectedId, setSelectedId] = useState(sessions[0]?.id ?? null);
  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  if (sessions.length === 0) {
    return (
      <div className="rounded-3xl border border-sand-200 bg-white">
        <EmptyState
          icon={InboxIcon}
          title="No sessions here"
          body="Once patients start reaching out, their conversations will show up here." />

      </div>);

  }

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] lg:grid-cols-[340px_1fr]">
      <div className="overflow-y-auto border-sand-200 lg:border-r">
        {sessions.map((s) =>
        <SessionListItem
          key={s.id}
          session={s}
          active={s.id === selectedId}
          onClick={() => setSelectedId(s.id)} />

        )}
      </div>
      <div className="hidden lg:block">
        {selected ?
        <SessionDetailPane session={selected} /> :

        <EmptyState icon={InboxIcon} title="Select a conversation" body="Pick a session from the list to see the full transcript." />
        }
      </div>
    </div>);

}
