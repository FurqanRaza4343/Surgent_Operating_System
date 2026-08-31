import React from "react";
import { Link } from "react-router-dom";
import { MessageCircleIcon, ArrowRightIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { usePlan } from "../plan/PlanContext";
import { useMessageThreads } from "./useMessageThreads";
import { useStaffMessages } from "./useStaffMessages";
import { MessageThreadView } from "./MessageThreadView";
import { DASHBOARD_ROUTES } from "../constants/routes";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Owner sees an inbox of every staff member's thread; Doctor/Receptionist
// go straight to their own single thread with the Owner.
export function MessagesPage() {
  const { role } = usePlan();
  return role === "owner" ? <OwnerInbox /> : <OwnThread />;
}

function OwnerInbox() {
  const { authedFetch } = usePlan();
  const { threads, loading } = useMessageThreads(authedFetch);

  return (
    <>
      <PageHeader title="Messages" subtitle="A direct line with each doctor and receptionist on your team." />
      {loading ?
      <p className="text-sm text-ink-muted">Loading…</p> :
      threads.length === 0 ?
      <div className="rounded-3xl border border-sand-200 bg-white">
          <EmptyState icon={MessageCircleIcon} title="No staff yet" body="Once you invite a doctor or receptionist, you'll be able to message them here." />
        </div> :

      <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <div className="divide-y divide-sand-100">
            {threads.map((t) =>
          <Link
            key={t.staff_user_id}
            to={DASHBOARD_ROUTES.messageThread(t.staff_user_id)}
            className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-sand-50">

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-200 text-sm font-bold text-ink-soft">
                  {(t.staff_name || "?")[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{t.staff_name || "Unnamed"}</p>
                    <span className="shrink-0 rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{t.staff_role}</span>
                  </div>
                  <p className="truncate text-xs text-ink-muted">{t.last_message_preview || "No messages yet"}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {t.last_message_at && <span className="text-[11px] text-ink-muted">{formatTime(t.last_message_at)}</span>}
                  {t.message_count > 0 && <span className="rounded-full bg-teal-600/8 px-2 py-0.5 text-[10px] font-semibold text-teal-600">{t.message_count}</span>}
                </div>
                <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
              </Link>
          )}
          </div>
        </div>
      }
    </>);

}

function OwnThread() {
  const { authedFetch, role } = usePlan();
  const { messages, loading, send } = useStaffMessages(authedFetch);

  return (
    <>
      <PageHeader title="Messages" subtitle="Your direct line with the practice owner." />
      <MessageThreadView title="Owner" viewerRole={role} messages={messages} loading={loading} onSend={send} />
    </>);

}
