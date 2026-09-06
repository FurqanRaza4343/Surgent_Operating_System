export type AgentTone = "professional" | "warm" | "concise";
export type EscalationSensitivity = "low" | "medium" | "high";

// Mirrors what the real `AgentConfig` DB model (backend/src/models/agent_config.py)
// is for — per-practice, per-agent configuration. `useAgentSettings` reads and
// writes these through GET/PUT /api/v1/agent-config now (no localStorage).
export interface AgentSetting {
  enabled: boolean;
  tone: AgentTone;
  escalationSensitivity: EscalationSensitivity;
}

export type AgentSettingsMap = Record<string, AgentSetting>;

export const DEFAULT_AGENT_SETTING: AgentSetting = {
  enabled: true,
  tone: "professional",
  escalationSensitivity: "medium"
};
