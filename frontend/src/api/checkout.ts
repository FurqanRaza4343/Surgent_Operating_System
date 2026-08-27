import { apiFetch } from "./client";

export interface CheckoutSessionResponse {
  url: string;
}

export interface CheckoutSessionStatusResponse {
  paid: boolean;
  plan_tier: "solo" | "practice" | "enterprise";
  email: string;
  claimed: boolean;
}

// Matches backend/src/router/checkout/checkout_router.py's
// POST /api/v1/checkout/create-session.
export function createCheckoutSession(email: string, planTier: "solo" | "practice") {
  return apiFetch<CheckoutSessionResponse>("/api/v1/checkout/create-session", {
    method: "POST",
    body: JSON.stringify({ email, plan_tier: planTier })
  });
}

// GET /api/v1/checkout/session/{id} — used by CheckoutSuccessPage to confirm
// payment landed before showing "Payment confirmed" (the Stripe webhook can
// race the browser redirect in real, non-demo checkout).
export function getCheckoutSession(sessionId: string) {
  return apiFetch<CheckoutSessionStatusResponse>(`/api/v1/checkout/session/${encodeURIComponent(sessionId)}`);
}

// DemoPaymentPage.tsx's "Pay" button — only works while Stripe isn't
// configured yet (backend 403s once real keys are set).
export function confirmDemoPayment(sessionId: string) {
  return apiFetch<CheckoutSessionStatusResponse>(`/api/v1/checkout/session/${encodeURIComponent(sessionId)}/confirm-demo-payment`, {
    method: "POST"
  });
}
