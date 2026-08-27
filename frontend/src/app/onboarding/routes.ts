// Mirrors app/dashboard/constants/routes.ts's role — single source of truth
// for every onboarding path.
export const ONBOARDING_ROUTES = {
  checkoutSuccess: "/pricing/success",
  checkoutCancel: "/pricing/cancel",
  claim: "/onboarding/claim",
  setup: "/onboarding/setup"
} as const;
