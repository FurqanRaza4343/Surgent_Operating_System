import { useCallback, useEffect, useState } from "react";
import { AGENTS_BY_SLUG } from "../../../data/agents";
import { DEFAULT_AGENT_SETTING, type AgentSetting, type AgentSettingsMap } from "./types";

const STORAGE_KEY = "aesthetixai_dashboard_agent_settings";

function loadAll(): AgentSettingsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(map: AgentSettingsMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // private browsing / storage disabled — settings just won't persist
  }
}

// Per-viewer settings (localStorage, not a real backend yet — see
// app/dashboard/settings/types.ts). Every known agent slug always resolves
// to a setting (falling back to DEFAULT_AGENT_SETTING) so callers never have
// to null-check.
export function useAgentSettings() {
  const [settings, setSettings] = useState<AgentSettingsMap>(() => loadAll());

  useEffect(() => {
    saveAll(settings);
  }, [settings]);

  const getSetting = useCallback(
    (slug: string): AgentSetting => settings[slug] || DEFAULT_AGENT_SETTING,
    [settings]
  );

  const updateSetting = useCallback((slug: string, patch: Partial<AgentSetting>) => {
    setSettings((prev) => ({
      ...prev,
      [slug]: { ...(prev[slug] || DEFAULT_AGENT_SETTING), ...patch }
    }));
  }, []);

  const knownSlugs = Object.keys(AGENTS_BY_SLUG);

  return { getSetting, updateSetting, knownSlugs };
}
