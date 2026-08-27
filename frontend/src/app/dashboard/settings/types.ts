export type AgentTone = "professional" | "warm" | "concise";
export type EscalationSensitivity = "low" | "medium" | "high";

// Mirrors what the real `AgentConfig` DB model (backend/src/models/agent_config.py)
// is for — per-practice, per-agent configuration. This stays in localStorage
// until a real settings API exists; same shape either way.
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
