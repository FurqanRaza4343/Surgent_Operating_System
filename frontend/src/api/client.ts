// Thin fetch wrapper for calling the backend (see ../../backend). Foundation
// only for now — most backend agent endpoints are still stubs with nothing
// real to fetch, so this isn't wired into any page yet. `getHealth()` in
// `./health.ts` is the one real, working call, used to prove the wiring end
// to end.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  if (!res.ok) {
    throw new ApiError(res.status, `${init?.method || "GET"} ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}
