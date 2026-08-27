import type { PlanTier } from "../../../data/planTiers";

// Mirrors profile/usePracticeProfile.ts's localStorage pattern — the local
// override a real onboarding claim step or billing/PlanComparisonTable.tsx's dev "Switch to this plan" buttons write, read as
// source #2 in usePlanTier.ts's chain (behind a real /practice/me once it exists).
const STORAGE_KEY = "aesthetixai_dashboard_plan_tier";

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
