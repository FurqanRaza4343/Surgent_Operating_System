import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageCircleIcon, PlusIcon } from "lucide-react";
import { usePlan } from "../plan/PlanContext";
import { useMessageThreads } from "./useMessageThreads";
import { useStaffMessages } from "./useStaffMessages";
import { MessageThreadView } from "./MessageThreadView";
import { EmptyState } from "../components/EmptyState";
import {
  listStaffContacts,
  startStaffConversation,
  type StaffContactResponse
} from "../../../api/entities";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function initials(name: string | null) {
  return (name || "?")[0]?.toUpperCase() || "?";
}

// Two-pane team chat: conversations on the left, the active thread on the
// right. Every practice user (owner, doctor, receptionist) reaches the same
// conversation list; the active conversation lives in the URL (?thread=) so
// it can be deep-linked from the bell and finance receipts.
export function MessagesPage() {
  const [params, setParams] = useSearchParams();
  const { authedFetch } = usePlan();
  const { threads, loading, refetch: refetchThreads } = useMessageThreads(authedFetch);
  const [contacts, setContacts] = useState<StaffContactResponse[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [starting, setStarting] = useState(false);

  const activeId = params.get("thread") || null;
  const active = threads.find((t) => t.conversation_id === activeId) || null;

  useEffect(() => {
    if (!authedFetch) return;
    listStaffContacts(authedFetch).then(setContacts).catch(() => setContacts([]));
  }, [authedFetch]);

  // Default to the most recent conversation when none is open yet.
  useEffect(() => {
    if (!loading && !activeId && threads.length > 0) {
      setParams({ thread: threads[0].conversation_id }, { replace: true });
    }
  }, [loading, activeId, threads, setParams]);

  function select(id: string) {
    setParams({ thread: id });
  }

  async function openConversationWith(user: StaffContactResponse) {
    if (!authedFetch || starting) return;
    setStarting(true);
    try {
      const summary = await startStaffConversation(authedFetch, { recipient_user_id: user.id });
      await refetchThreads();
      setParams({ thread: summary.conversation_id });
    } finally {
      setStarting(false);
      setShowNew(false);
    }
  }

  const { messages, loading: messagesLoading, send } = useStaffMessages(authedFetch, active?.conversation_id);

  return (
    <div className="h-[calc(100vh-190px)] overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="grid h-full grid-cols-[340px_1fr]">
        {/* --- Left: conversation list --- */}
        <aside className="flex flex-col overflow-hidden border-r border-sand-200">
          <div className="flex items-center justify-between border-b border-sand-200 px-4 py-3.5">
            <p className="text-sm font-bold text-ink">Messages</p>
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-teal-600 transition-colors hover:bg-teal-600/10">
              <PlusIcon className="h-3.5 w-3.5" /> New message
            </button>
          </div>

          {showNew && (
            <div className="border-b border-sand-200 bg-sand-50/40 px-3 py-3">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Start a conversation</p>
              {contacts.length === 0 ?
              <p className="px-1 text-xs text-ink-muted">No other team members yet — invite a doctor or receptionist first.</p> :
              <div className="max-h-44 space-y-1 overflow-y-auto">
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={starting}
                    onClick={() => openConversationWith(c)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white disabled:opacity-50">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand-200 text-xs font-bold text-ink-soft">
                      {initials(c.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{c.name || "Unnamed"}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-sand-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-muted">{c.role}</span>
                  </button>
                ))}
              </div>
              }
            </div>
          )}

          <div className="flex-1 divide-y divide-sand-100 overflow-y-auto">
            {loading ?
            <p className="px-4 py-6 text-center text-sm text-ink-muted">Loading…</p> :
            threads.length === 0 ?
            <div className="flex h-full items-center justify-center p-4">
              <EmptyState icon={MessageCircleIcon} title="No conversations yet" body="Use New message to message a doctor, receptionist or your owner." />
            </div> :
            threads.map((t) => {
              const isActive = t.conversation_id === activeId;
              return (
                <button
                  key={t.conversation_id}
                  type="button"
                  onClick={() => select(t.conversation_id)}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${isActive ? "bg-teal-600/[0.06]" : "hover:bg-sand-50"}`}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isActive ? "bg-teal-600/15 text-teal-600" : "bg-sand-200 text-ink-soft"}`}>
                    {initials(t.recipient_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{t.recipient_name || "Unnamed"}</span>
                      <span className="shrink-0 rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{t.recipient_role}</span>
                    </span>
                    <span className="block truncate text-xs text-ink-muted">{t.last_message_preview || "No messages yet"}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {t.last_message_at && <span className="text-[11px] text-ink-muted">{formatTime(t.last_message_at)}</span>}
                    {t.message_count > 0 &&
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isActive ? "bg-teal-600/10 text-teal-600" : "bg-sand-200/60 text-ink-muted"}`}>{t.message_count}</span>}
                  </span>
                </button>);
            })}
          </div>
        </aside>

        {/* --- Right: active conversation --- */}
        <main className="flex min-w-0 flex-col overflow-hidden">
          {active ?
          <MessageThreadView
            title={active.recipient_name || "Team member"}
            subtitle={active.recipient_role}
            messages={messages}
            loading={messagesLoading}
            onSend={send} /> :
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-sm text-center">
              <EmptyState
                icon={MessageCircleIcon}
                title={threads.length > 0 ? "Pick a conversation" : "Your team chat"}
                body={threads.length > 0 ? "Select a thread on the left, or start a new one." : "Message any doctor, receptionist or the owner — everyone on your team shows up here."} />
              {contacts.length > 0 && (
                <div className="mt-5 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Message someone</p>
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={starting}
                      onClick={() => openConversationWith(c)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 text-left transition-colors hover:border-teal-600/40 disabled:opacity-50">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand-200 text-xs font-bold text-ink-soft">{initials(c.name)}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{c.name || "Unnamed"}</span>
                      <span className="shrink-0 rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{c.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          }
        </main>
      </div>
    </div>
  );
}