import type { PlanTier } from "../../../data/planTiers";
import { tierRank, PLAN_ORDER } from "../../../data/planTiers";
import { AGENTS_BY_SLUG } from "../../../data/agents";
import { PLANS } from "../../../data/plans";
import type { FeatureKey, PlanCapabilities } from "./types";

// The single source of truth for what each plan unlocks in the DASHBOARD —
// derived line-by-line from data/plans.ts's marketing copy (see the comment
// on each entry). This is presentation-layer only (trivially bypassed via
// devtools) — safe exclusively because every gated surface currently reads
// mock data. A future backend/src/services/practice/plan_capabilities.py is
// meant to mirror this exactly for real enforcement; if you change a value
// here, change it there too once that file exists.
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

export { tierRank };
