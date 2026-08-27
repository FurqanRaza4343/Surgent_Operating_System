import { apiFetch } from "./client";

export interface AgentCostingResponse {
  agent_slug: string;
  cost_per_session: number;
  is_active: boolean;
  total_sessions: number;
  total_earned: number;
}

// GET /api/v1/agent-costing — backend/src/router/agent_costing/. No auth:
// per-session cost is platform pricing, not practice-sensitive.
export function getAgentCosting() {
  return apiFetch<AgentCostingResponse[]>("/api/v1/agent-costing");
}
