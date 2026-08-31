import React, { useState } from "react";
import { SendIcon } from "lucide-react";
import type { StaffMessageResponse } from "../../../api/entities";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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



}: {title: string;subtitle?: string;viewerRole: string;messages: StaffMessageResponse[];loading: boolean;onSend: (body: string) => Promise<unknown>;}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

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

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="border-b border-sand-200 px-5 py-4">
        <p className="text-sm font-bold text-ink">{title}</p>
        {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {loading ?
        <p className="text-sm text-ink-muted">Loading…</p> :
        messages.length === 0 ?
        <p className="text-sm text-ink-muted">No messages yet — say hello.</p> :

        messages.map((m) => {
          const mine = m.sender_role === viewerRole;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${mine ? "bg-teal-600 text-white" : "bg-sand-100 text-ink"}`}>
                  <p className="text-sm leading-relaxed">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-ink-muted"}`}>
                    {m.sender_name || m.sender_role} · {formatTime(m.created_at)}
                  </p>
                </div>
              </div>);

        })
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
