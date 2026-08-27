import type { PlanTier } from "../../../data/planTiers";
import type { AgentCategory } from "../../../data/agents";

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
