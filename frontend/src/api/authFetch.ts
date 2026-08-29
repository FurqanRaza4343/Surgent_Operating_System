import { useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { apiFetch, ApiError } from "./client";

// Closes the gap app/auth/README.md documents — apiFetch() never attached a
// Clerk session token, so every backend route expecting Depends(get_current_user)
// was unreachable from the frontend. useAuthedFetch() binds Clerk's
// getToken() into apiFetch's Authorization header.
//
// useCallback matters here, not just style: usePlanTier.ts's tier-fetching
// effect depends on this function's identity ([authedFetch]). Without
// memoizing, every render produced a brand-new function, and PlanContext.tsx's
// setOverride() (the dashboard's "Switch to this plan" button) itself causes
// exactly such a render — so clicking it re-triggered the effect, which
// re-fetched the REAL plan from the backend and immediately overwrote the
// switch, making it look like the change "redirected" back to the old plan.
export function useAuthedFetch() {
  const { getToken, isSignedIn } = useAuth();

  const authedFetch = useCallback(
    async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
      if (!isSignedIn) throw new ApiError(401, "Not signed in");
      const token = await getToken();
      return apiFetch<T>(path, {
        ...init,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers }
      });
    },
    [getToken, isSignedIn]
  );

  return { authedFetch, isSignedIn };
}
