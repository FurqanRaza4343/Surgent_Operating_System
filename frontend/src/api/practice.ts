export interface PracticeMeResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  plan_tier: "solo" | "practice" | "enterprise";
  subscription_status: string;
}

export interface ClaimPlanResponse {
  practice_id: string;
  plan_tier: "solo" | "practice" | "enterprise";
}

type AuthedFetch = <T>(path: string, init?: RequestInit) => Promise<T>;

// Matches backend/src/router/practice/practice_router.py. Takes the
// authedFetch function from useAuthedFetch() (api/authFetch.ts) rather than
// being a hook itself, so it stays a plain importable function.
export function getMyPractice(authedFetch: AuthedFetch) {
  return authedFetch<PracticeMeResponse>("/api/v1/practice/me");
}

export function claimPlan(authedFetch: AuthedFetch, sessionId: string) {
  return authedFetch<ClaimPlanResponse>("/api/v1/practice/claim", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId })
  });
}
