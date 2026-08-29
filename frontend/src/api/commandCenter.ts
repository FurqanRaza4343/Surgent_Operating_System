export interface CommandCenterStep {
  category_id: string;
  category_label: string;
  status: "consulted" | "locked";
  summary: string;
}

export interface AskCommandCenterResponse {
  session_id: string;
  steps: CommandCenterStep[];
  answer: string;
}

export interface CommandCenterSessionSummary {
  id: string;
  title: string;
  updated_at: string;
}

export interface CommandCenterMessage {
  role: "staff" | "agent";
  content: string;
  steps: CommandCenterStep[];
  created_at: string;
}

export interface CommandCenterSessionDetail {
  id: string;
  title: string;
  messages: CommandCenterMessage[];
}

type AuthedFetch = <T>(path: string, init?: RequestInit) => Promise<T>;

// Matches backend/src/router/command_center/command_center_router.py.
export function askCommandCenter(authedFetch: AuthedFetch, question: string, sessionId?: string | null) {
  return authedFetch<AskCommandCenterResponse>("/api/v1/command-center/ask", {
    method: "POST",
    body: JSON.stringify({ question, session_id: sessionId ?? null })
  });
}

export function listCommandCenterSessions(authedFetch: AuthedFetch) {
  return authedFetch<CommandCenterSessionSummary[]>("/api/v1/command-center/sessions");
}

export function getCommandCenterSession(authedFetch: AuthedFetch, sessionId: string) {
  return authedFetch<CommandCenterSessionDetail>(`/api/v1/command-center/sessions/${sessionId}`);
}
