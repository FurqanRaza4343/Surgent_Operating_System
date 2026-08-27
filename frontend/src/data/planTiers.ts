// Single shared vocabulary for "which plan" — imported by both the
// marketing site (data/plans.ts) and the dashboard's gating layer
// (app/dashboard/plan/) so the two can never drift on what "practice" means.
export type PlanTier = "solo" | "practice" | "enterprise";

export const PLAN_ORDER: PlanTier[] = ["solo", "practice", "enterprise"];

export function tierRank(tier: PlanTier): number {
  return PLAN_ORDER.indexOf(tier);
}

// True if `tier` is at least as high as `min` (e.g. tierAtLeast("practice", "solo") === true).
export function tierAtLeast(tier: PlanTier, min: PlanTier): boolean {
  return tierRank(tier) >= tierRank(min);
}
