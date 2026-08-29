import { useEffect, useState } from "react";
import { getAgentCosting } from "../../../api/practice";
import { DEFAULT_AGENT_COSTS } from "./agentCosting";

// Real cost-per-session from the backend, falling back to the mirrored
// DEFAULT_AGENT_COSTS if the API call fails (backend not running, offline
// dev) — same graceful-degradation pattern used throughout this dashboard.
export function useAgentCosting() {
  const [costs, setCosts] = useState<Record<string, number>>(DEFAULT_AGENT_COSTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getAgentCosting();
        if (!cancelled) {
          const map: Record<string, number> = {};
          for (const row of rows) map[row.agent_slug] = row.cost_per_session;
          setCosts(map);
        }
      } catch {
        // keep the default fallback already in state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const costFor = (agentSlug: string) => costs[agentSlug] ?? DEFAULT_AGENT_COSTS[agentSlug] ?? 0;

  return { costs, costFor, loading };
}
