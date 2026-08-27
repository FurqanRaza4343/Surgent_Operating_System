import { useCallback, useEffect, useState } from "react";
import type { PlanTier } from "../../../data/planTiers";
import { readPlanOverride, writePlanOverride } from "./planStorage";
import { getMyPractice } from "../../../api/practice";

export type PlanSource = "api" | "local" | "default";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

// Source #1 — GET /api/v1/practice/me. Only reachable when Clerk is enabled
// and signed in (authedFetch is null otherwise — see PlanContext.tsx's
// Clerk-gated split, same pattern as profile/ProfilePage.tsx's
// AccountCard/AccountCardWithUser). A 404/401 (not claimed yet, or claim
// hasn't run) falls through to the local override (billing/PlanComparisonTable.tsx's
// dev "Switch to this plan" buttons, or onboarding's claim step) instead of erroring.
async function fetchTierFromApi(authedFetch: AuthedFetch): Promise<PlanTier | null> {
  if (!authedFetch) return null;
  try {
    const practice = await getMyPractice(authedFetch);
    return practice.plan_tier;
  } catch {
    return null;
  }
}

// Ordered source chain: real API -> local override (onboarding claim /
// the Plan & Billing page's dev switch buttons) -> "solo" default. Every dashboard component reads
// `tier`/`source` from this without knowing which source answered.
export function usePlanTier(authedFetch: AuthedFetch = null) {
  const [tier, setTier] = useState<PlanTier>(() => readPlanOverride() || "solo");
  const [source, setSource] = useState<PlanSource>(() => (readPlanOverride() ? "local" : "default"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const apiTier = await fetchTierFromApi(authedFetch);
      if (cancelled) return;
      if (apiTier) {
        setTier(apiTier);
        setSource("api");
      } else {
        const local = readPlanOverride();
        setTier(local || "solo");
        setSource(local ? "local" : "default");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  // Plan & Billing's dev switch buttons, or onboarding's claim step, call this — writes the local
  // override and updates state immediately (doesn't wait for a reload).
  const setOverride = useCallback((next: PlanTier) => {
    writePlanOverride(next);
    setTier(next);
    setSource("local");
  }, []);

  return { tier, source, loading, setOverride };
}
