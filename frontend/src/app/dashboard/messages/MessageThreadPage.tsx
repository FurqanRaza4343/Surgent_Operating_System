import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "lucide-react";
import { usePlan } from "../plan/PlanContext";
import { useMessageThreads } from "./useMessageThreads";
import { useStaffMessages } from "./useStaffMessages";
import { MessageThreadView } from "./MessageThreadView";
import { DASHBOARD_ROUTES } from "../constants/routes";

export function MessageThreadPage() {
  const { staffUserId } = useParams<{ staffUserId: string }>();
  const { authedFetch, role } = usePlan();
  const { threads } = useMessageThreads(authedFetch);
  const { messages, loading, send } = useStaffMessages(authedFetch, staffUserId);

  const thread = threads.find((t) => t.staff_user_id === staffUserId);

  return (
    <>
      <Link
        to={DASHBOARD_ROUTES.messages}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink">

        <ArrowLeftIcon className="h-4 w-4" /> Back to messages
      </Link>
      <MessageThreadView
        title={thread?.staff_name || "Staff member"}
        subtitle={thread?.staff_role}
        viewerRole={role}
        messages={messages}
        loading={loading}
        onSend={send} />

    </>);

}
