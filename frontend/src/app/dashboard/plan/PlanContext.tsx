import React, { createContext, useContext, useMemo } from "react";
import type { PlanTier } from "../../../data/planTiers";
import { tierAtLeast } from "../../../data/planTiers";
import { usePlanTier, type PlanSource } from "./usePlanTier";
import { capabilitiesFor, hasFeature, allowsCategory, allowsAgent } from "./planCapabilities";
import type { FeatureKey, PlanCapabilities } from "./types";
import { useAuthedFetch } from "../../../api/authFetch";

interface PlanContextValue {
  tier: PlanTier;
  source: PlanSource;
  loading: boolean;
  capabilities: PlanCapabilities;
  can: (feature: FeatureKey) => boolean;
  allowsCategory: (categoryId: string) => boolean;
  allowsAgent: (agentSlug: string) => boolean;
  atLeast: (min: PlanTier) => boolean;
  setOverride: (tier: PlanTier) => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);
const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function useContextValue(tier: PlanTier, source: PlanSource, loading: boolean, setOverride: (t: PlanTier) => void): PlanContextValue {
  return useMemo<PlanContextValue>(
    () => ({
      tier,
      source,
      loading,
      capabilities: capabilitiesFor(tier),
      can: (feature: FeatureKey) => hasFeature(tier, feature),
      allowsCategory: (categoryId: string) => allowsCategory(tier, categoryId),
      allowsAgent: (agentSlug: string) => allowsAgent(tier, agentSlug),
      atLeast: (min: PlanTier) => tierAtLeast(tier, min),
      setOverride
    }),
    [tier, source, loading, setOverride]
  );
}

// useAuthedFetch() calls Clerk's useAuth(), which throws without a mounted
// <ClerkProvider> — index.tsx only mounts one when Clerk is configured. This
// component is only ever rendered when clerkEnabled is true (a build-time
// constant, never toggles mid-session), same split as
// profile/ProfilePage.tsx's AccountCard/AccountCardWithUser.
function PlanProviderWithClerk({ children }: { children: React.ReactNode }) {
  const { authedFetch } = useAuthedFetch();
  const { tier, source, loading, setOverride } = usePlanTier(authedFetch);
  const value = useContextValue(tier, source, loading, setOverride);
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

function PlanProviderWithoutClerk({ children }: { children: React.ReactNode }) {
  const { tier, source, loading, setOverride } = usePlanTier(null);
  const value = useContextValue(tier, source, loading, setOverride);
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

// Wraps DashboardLayout once — every page/component below it calls usePlan()
// instead of usePlanTier() directly, so the whole dashboard shares one
// resolution instead of each page mounting its own instance and potentially
// disagreeing (the same class of bug useDoctors.ts's comments already flag
// for per-page hook instances).
export function PlanProvider({ children }: { children: React.ReactNode }) {
  return clerkEnabled ?
  <PlanProviderWithClerk>{children}</PlanProviderWithClerk> :
  <PlanProviderWithoutClerk>{children}</PlanProviderWithoutClerk>;
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan() must be called inside <PlanProvider>");
  return ctx;
}
