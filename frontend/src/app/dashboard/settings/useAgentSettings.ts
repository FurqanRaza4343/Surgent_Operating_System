import { useCallback, useEffect, useState } from "react";
import { AGENTS_BY_SLUG } from "../../../data/agents";
import { usePlan } from "../plan/PlanContext";
import { listAgentConfigs, updateAgentConfig } from "../../../api/entities";
import { DEFAULT_AGENT_SETTING } from "./types";
import type { AgentSetting, AgentSettingsMap } from "./types";

const TONES = ["professional", "warm", "concise"] as const;
const SENSITIVITIES = ["low", "medium", "high"] as const;

function toSetting(enabled: boolean | undefined, config: Record<string, unknown> | undefined): AgentSetting {
  const tone = TONES.includes(config?.tone as (typeof TONES)[number]) ? (config?.tone as AgentSetting["tone"]) : DEFAULT_AGENT_SETTING.tone;
  const escalationSensitivity = SENSITIVITIES.includes(config?.escalation_sensitivity as (typeof SENSITIVITIES)[number])
    ? (config?.escalation_sensitivity as AgentSetting["escalationSensitivity"])
    : DEFAULT_AGENT_SETTING.escalationSensitivity;
  return {
    enabled: enabled ?? DEFAULT_AGENT_SETTING.enabled,
    tone,
    escalationSensitivity
  };
}

// Real per-practice settings for every agent, backed by the AgentConfig model
// (GET/PUT /api/v1/agent-config). Every known agent slug always resolves to a
// setting (falling back to DEFAULT_AGENT_SETTING when the practice has no row
// yet) so callers never have to null-check. Writes are optimistic and owned by
// the Owner (the backend enforces the role); a failed write reverts silently.
export function useAgentSettings() {
  const { authedFetch } = usePlan();
  const [settings, setSettings] = useState<AgentSettingsMap>({});

  useEffect(() => {
    if (!authedFetch) return;
    let cancelled = false;
    listAgentConfigs(authedFetch)
      .then((rows) => {
        if (cancelled) return;
        const map: AgentSettingsMap = {};
        for (const row of rows) map[row.agent_type] = toSetting(row.enabled, row.config);
        setSettings(map);
      })
      .catch(() => {
        if (!cancelled) setSettings({});
      });
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  const getSetting = useCallback((slug: string): AgentSetting => settings[slug] || DEFAULT_AGENT_SETTING, [settings]);

  const updateSetting = useCallback(
    (slug: string, patch: Partial<AgentSetting>) => {
      const snapshot = settings[slug] || DEFAULT_AGENT_SETTING;
      const optimistic: AgentSetting = { ...snapshot, ...patch };
      setSettings((prev) => ({ ...prev, [slug]: optimistic }));
      if (!authedFetch) return;
      void updateAgentConfig(authedFetch, slug, {
        enabled: optimistic.enabled,
        config: { tone: optimistic.tone, escalation_sensitivity: optimistic.escalationSensitivity }
      }).catch(() => {
        setSettings((cur) => {
          const curVal = cur[slug];
          const same =
            curVal &&
            curVal.tone === optimistic.tone &&
            curVal.enabled === optimistic.enabled &&
            curVal.escalationSensitivity === optimistic.escalationSensitivity;
          return same ? { ...cur, [slug]: snapshot } : cur;
        });
      });
    },
    [authedFetch, settings]
  );

  const knownSlugs = Object.keys(AGENTS_BY_SLUG);

  return { getSetting, updateSetting, knownSlugs };
}