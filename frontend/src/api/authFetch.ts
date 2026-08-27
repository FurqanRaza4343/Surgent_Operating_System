import { useAuth } from "@clerk/clerk-react";
import { apiFetch, ApiError } from "./client";

// Closes the gap app/auth/README.md documents — apiFetch() never attached a
// Clerk session token, so every backend route expecting Depends(get_current_user)
// was unreachable from the frontend. useAuthedFetch() binds Clerk's
// getToken() into apiFetch's Authorization header.
export function useAuthedFetch() {
  const { getToken, isSignedIn } = useAuth();

  async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
    if (!isSignedIn) throw new ApiError(401, "Not signed in");
    const token = await getToken();
    return apiFetch<T>(path, {
      ...init,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers }
    });
  }

  return { authedFetch, isSignedIn };
}
