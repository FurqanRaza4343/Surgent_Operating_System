import { useCallback, useEffect, useState } from "react";
import type { PlanTier } from "../../../data/planTiers";
import { tierAtLeast, PLAN_ORDER } from "../../../data/planTiers";
import type { Role } from "../../../data/roles";
import { AGENTS_BY_SLUG } from "../../../data/agents";
import type { AgentCategory } from "../../../data/agents";
import { PLANS } from "../../../data/plans";
import { getMyPractice } from "../../../api/practice";

// ============================================================================
// Types
// ============================================================================

export type SupportLevel = "email" | "priority" | "dedicated";

// A page/surface that isn't an agent category — checked with hasFeature().
export type FeatureKey = "analytics" | "billingAgents" | "ehrIntegration" | "customIntegrations" | "baa";

export interface PlanLimits {
  maxDoctors: number; // Infinity = unlimited
  maxSocialChannels: number;
  maxLocations: number;
}

export interface PlanCapabilities {
  tier: PlanTier;
  // Which of the 5 AGENT_CATEGORIES ids (front-desk/consultation/surgery/post-care/business) this tier unlocks.
  agentCategoryIds: AgentCategory["id"][];
  features: Partial<Record<FeatureKey, boolean>>;
  limits: PlanLimits;
  supportLevel: SupportLevel;
}

export type PlanSource = "api" | "local" | "default";

// ============================================================================
// Local overrides (storage) — mirrors profile/usePracticeProfile.ts's
// localStorage pattern. Fallbacks a real onboarding claim step or
// billing/PlanComparisonTable.tsx's dev "Switch to this plan" buttons write,
// read as source #2 in usePlanTier()'s chain (behind a real /practice/me).
// ============================================================================

const STORAGE_KEY = "aesthetixai_dashboard_plan_tier";
const ROLE_STORAGE_KEY = "aesthetixai_dashboard_role_preview";

export function readPlanOverride(): PlanTier | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "solo" || raw === "practice" || raw === "enterprise" ? raw : null;
  } catch {
    return null;
  }
}

export function writePlanOverride(tier: PlanTier) {
  try {
    localStorage.setItem(STORAGE_KEY, tier);
  } catch {
    // private browsing / storage disabled — the tier just won't persist across reloads
  }
}

// Dev-only "preview as" role switch — same shape as the plan-tier override
// above, so local QA can see the Doctor dashboard without a real Clerk
// invite+sign-up round trip. Only ever a fallback when the real API hasn't
// resolved a role (see usePlanTier) — a real signed-in session always wins.
export function readRoleOverride(): Role | null {
  try {
    const raw = localStorage.getItem(ROLE_STORAGE_KEY);
    return raw === "owner" || raw === "doctor" || raw === "receptionist" || raw === "staff" ? raw : null;
  } catch {
    return null;
  }
}

export function writeRoleOverride(role: Role) {
  try {
    localStorage.setItem(ROLE_STORAGE_KEY, role);
  } catch {
    // private browsing / storage disabled — the role just won't persist across reloads
  }
}

// ============================================================================
// Capabilities — the single source of truth for what each plan unlocks in the
// DASHBOARD, derived line-by-line from data/plans.ts's marketing copy (see the
// comment on each entry). This is presentation-layer only (trivially bypassed
// via devtools) — safe exclusively because every gated surface currently reads
// mock data. A future backend/src/services/practice/plan_capabilities.py is
// meant to mirror this exactly for real enforcement; if you change a value
// here, change it there too once that file exists.
// ============================================================================

export const PLAN_CAPABILITIES: Record<PlanTier, PlanCapabilities> = {
  solo: {
    tier: "solo",
    // "Front desk & intake agents" — data/plans.ts:20
    agentCategoryIds: ["front-desk"],
    features: {},
    limits: {
      // Solo's own tagline is "For single-surgeon practices" — data/plans.ts:15
      maxDoctors: 1,
      // "1 connected social channel" — data/plans.ts:22
      maxSocialChannels: 1,
      maxLocations: 1
    },
    // "Email support" — data/plans.ts:24
    supportLevel: "email"
  },
  practice: {
    tier: "practice",
    // "Full consultation & surgery agents" + "Post-surgery care & recovery suite"
    // — data/plans.ts:36-37, plus everything in Solo (data/plans.ts:35)
    agentCategoryIds: ["front-desk", "consultation", "surgery", "post-care"],
    features: {
      // "Analytics dashboard" — data/plans.ts:39. This is the dashboard's own
      // /dashboard/analytics PAGE, not the `analytics_dashboard` AGENT (that
      // agent lives in the "business" category, which stays Enterprise-only).
      analytics: true
    },
    limits: {
      maxDoctors: Infinity,
      // "All social channels connected" — data/plans.ts:38
      maxSocialChannels: Infinity,
      maxLocations: 1
    },
    // "Priority onboarding & support" — data/plans.ts:40
    supportLevel: "priority"
  },
  enterprise: {
    tier: "enterprise",
    // "All 31 agents, fully configured" — data/plans.ts:52
    agentCategoryIds: ["front-desk", "consultation", "surgery", "post-care", "business"],
    features: {
      analytics: true,
      billingAgents: true,
      // "Custom integrations & EHR" — data/plans.ts:54
      ehrIntegration: true,
      customIntegrations: true,
      // "BAA & dedicated success manager" — data/plans.ts:55
      baa: true
    },
    limits: {
      maxDoctors: Infinity,
      maxSocialChannels: Infinity,
      // "Multi-location orchestration" — data/plans.ts:53
      maxLocations: Infinity
    },
    supportLevel: "dedicated"
  }
};

export function capabilitiesFor(tier: PlanTier): PlanCapabilities {
  return PLAN_CAPABILITIES[tier];
}

export function hasFeature(tier: PlanTier, feature: FeatureKey): boolean {
  return Boolean(PLAN_CAPABILITIES[tier].features[feature]);
}

export function allowsCategory(tier: PlanTier, categoryId: string): boolean {
  return PLAN_CAPABILITIES[tier].agentCategoryIds.includes(categoryId);
}

export function allowsAgent(tier: PlanTier, agentSlug: string): boolean {
  const agent = AGENTS_BY_SLUG[agentSlug];
  if (!agent) return false;
  return allowsCategory(tier, agent.categoryId);
}

// Lowest tier that unlocks a category — drives "Included in Practice — $1,690/mo" copy.
export function minTierForCategory(categoryId: string): PlanTier | null {
  for (const tier of PLAN_ORDER) {
    if (allowsCategory(tier, categoryId)) return tier;
  }
  return null;
}

export function minTierForFeature(feature: FeatureKey): PlanTier | null {
  for (const tier of PLAN_ORDER) {
    if (hasFeature(tier, feature)) return tier;
  }
  return null;
}

// The marketing Plan record (name/price) for a tier — so upgrade copy never
// hardcodes a price that could drift from the Pricing section.
export function planFor(tier: PlanTier) {
  return PLANS.find((p) => p.id === tier)!;
}

// ============================================================================
// usePlanTier hook — ordered source chain: real API -> local override
// (onboarding claim / the Plan & Billing page's dev switch buttons) -> "solo"
// default. Every dashboard component reads `tier`/`source` from this without
// knowing which source answered. `role` follows the same chain — a real
// signed-in session (API) always wins; the local role-preview override only
// ever applies when the API hasn't resolved one.
//
// Source #1 — GET /api/v1/practice/me. Only reachable when Clerk is enabled
// and signed in (authedFetch is null otherwise — see PlanContext.tsx's
// Clerk-gated split, same pattern as profile/ProfilePage.tsx's
// AccountCard/AccountCardWithUser). A 404/401 (not claimed yet, or claim
// hasn't run) falls through to the local override instead of erroring.
// ============================================================================

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

async function fetchFromApi(authedFetch: AuthedFetch): Promise<{ tier: PlanTier; role: Role } | null> {
  if (!authedFetch) return null;
  try {
    const practice = await getMyPractice(authedFetch);
    return { tier: practice.plan_tier, role: practice.role };
  } catch {
    return null;
  }
}

export function usePlanTier(authedFetch: AuthedFetch = null) {
  const [tier, setTier] = useState<PlanTier>(() => readPlanOverride() || "solo");
  const [role, setRole] = useState<Role>(() => readRoleOverride() || "owner");
  const [source, setSource] = useState<PlanSource>(() => (readPlanOverride() ? "local" : "default"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchFromApi(authedFetch);
      if (cancelled) return;
      if (result) {
        setTier(result.tier);
        setRole(result.role);
        setSource("api");
      } else {
        const local = readPlanOverride();
        setTier(local || "solo");
        setRole(readRoleOverride() || "owner");
        setSource(local ? "local" : "default");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  // Plan & Billing's dev switch buttons, or onboarding's claim step, call
  // this — writes the local override and updates state immediately (doesn't
  // wait for a reload).
  const setOverride = useCallback((next: PlanTier) => {
    writePlanOverride(next);
    setTier(next);
    setSource("local");
  }, []);

  // Plan & Billing's "Preview as" dev switcher calls this — same immediate-
  // update shape as setOverride above. Updates local state directly, so it
  // overrides an already-resolved API role too (until the next reload/
  // authedFetch change re-runs the effect above and re-resolves from the API).
  const setRoleOverride = useCallback((next: Role) => {
    writeRoleOverride(next);
    setRole(next);
  }, []);

  return { tier, role, source, loading, setOverride, setRoleOverride };
}

export { tierAtLeast };
