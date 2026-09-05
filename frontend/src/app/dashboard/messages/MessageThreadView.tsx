import React, { useEffect, useRef, useState } from "react";
import { SendIcon, MessageCircleIcon } from "lucide-react";
import type { StaffMessageResponse } from "../../../api/entities";
import { EmptyState } from "../components/EmptyState";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDay(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Shared chat UI for both sides of a thread — a message is "mine" when its
// sender_role matches the viewer's own role. A thread only ever has two
// parties (Owner + one specific staff member), so this always correctly
// tells the two apart regardless of which side is viewing.
export function MessageThreadView({
  title,
  subtitle,
  viewerRole,
  messages,
  loading,
  onSend
}: { title: string; subtitle?: string; viewerRole: string; messages: StaffMessageResponse[]; loading: boolean; onSend: (body: string) => Promise<unknown> }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    try {
      await onSend(draft.trim());
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  let lastDay: string | null = null;

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3 border-b border-sand-200 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600/10 text-sm font-bold text-teal-600">
          {title[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{title}</p>
          {subtitle && <p className="truncate text-xs text-ink-muted">{subtitle}</p>}
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto bg-sand-50/40 px-5 py-4">
        {loading ?
        <p className="text-sm text-ink-muted">Loading…</p> :
        messages.length === 0 ?
        <div className="flex h-full items-center justify-center">
            <EmptyState icon={MessageCircleIcon} title="No messages yet" body={`Say hello to ${title} to start the conversation.`} />
          </div> :

        <>
            {messages.map((m, i) => {
              const mine = m.sender_role === viewerRole;
              const day = formatDay(m.created_at);
              const showDaySeparator = day !== lastDay;
              lastDay = day;
              const prevMine = i > 0 ? messages[i - 1].sender_role === viewerRole : null;
              const grouped = !showDaySeparator && prevMine === mine;

              return (
                <React.Fragment key={m.id}>
                  {showDaySeparator &&
                <div className="flex items-center justify-center py-2">
                      <span className="rounded-full bg-sand-200/70 px-3 py-1 text-[11px] font-semibold text-ink-muted">{day}</span>
                    </div>
                }
                  <div className={`flex ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-2.5"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${mine ? "bg-teal-600 text-white" : "border border-sand-200 bg-white text-ink"}`}>
                      <p className="text-sm leading-relaxed">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-ink-muted"}`}>
                        {formatTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                </React.Fragment>);

            })}
            <div ref={bottomRef} />
          </>
        }
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2.5 border-t border-sand-200 px-4 py-3.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />

        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">

          <SendIcon className="h-4 w-4" />
        </button>
      </form>
    </div>);

}
