import { useCallback, useEffect, useState } from "react";
import { getAgentConfig, updateAgentConfig } from "../../../api/practice";

export interface MarketingOffer {
  title: string;
  description: string;
  expires_at?: string | null; // ISO date, or omitted for no expiry
}

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

const AGENT_TYPE = "marketing_followup";

// Real backend-backed (GET/PUT /api/v1/agent-config/marketing_followup,
// see backend/src/services/agent_config/) — the first real reader/writer of
// AgentConfig.config, which marketing_followup_agent_services.py's
// send_offer() reads from directly. Unlike useAgentSettings.ts (tone/
// escalation prefs, still localStorage-only), offers are real practice data,
// not a per-viewer preference — so no local fallback here.
export function useMarketingOffers(authedFetch: AuthedFetch) {
  const [offers, setOffers] = useState<MarketingOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authedFetch) {
        setLoading(false);
        return;
      }
      try {
        const config = await getAgentConfig(authedFetch, AGENT_TYPE);
        if (!cancelled) {
          const raw = config.config?.offers;
          setOffers(Array.isArray(raw) ? (raw as MarketingOffer[]) : []);
        }
      } catch {
        if (!cancelled) setError("Couldn't load offers.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  const save = useCallback(
    async (next: MarketingOffer[]): Promise<boolean> => {
      if (!authedFetch) return false;
      setSaving(true);
      setError(null);
      try {
        await updateAgentConfig(authedFetch, AGENT_TYPE, { config: { offers: next } });
        setOffers(next);
        return true;
      } catch {
        setError("Couldn't save — try again.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [authedFetch]
  );

  const addOffer = useCallback((offer: MarketingOffer) => save([...offers, offer]), [offers, save]);
  const removeOffer = useCallback((index: number) => save(offers.filter((_, i) => i !== index)), [offers, save]);

  return { offers, loading, saving, error, addOffer, removeOffer };
}
