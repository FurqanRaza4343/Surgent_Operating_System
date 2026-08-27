import React from "react";
import { PageHeader } from "../components/PageHeader";
import { SessionsView } from "./SessionsView";
import { MOCK_SESSIONS } from "../data/mockSessions";

export function NeedsAttentionPage() {
  const needsAttention = MOCK_SESSIONS.filter((s) => s.status === "needs_attention");
  return (
    <>
      <PageHeader title="Needs attention" subtitle="Sessions an agent escalated to your team — sorted most recent first." />
      <SessionsView sessions={needsAttention} />
    </>);

}
