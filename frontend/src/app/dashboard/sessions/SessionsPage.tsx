import React from "react";
import { PageHeader } from "../components/PageHeader";
import { SessionsView } from "./SessionsView";
import { MOCK_SESSIONS } from "../data/mockSessions";

export function SessionsPage() {
  return (
    <>
      <PageHeader title="All conversations" subtitle="Every patient session, across every agent and channel, in one inbox." />
      <SessionsView sessions={MOCK_SESSIONS} />
    </>);

}
