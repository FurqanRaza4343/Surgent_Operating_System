import { apiFetch } from "./client";

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
}

// Matches backend/src/main.py's `/health` route exactly (status/app/version).
export function getHealth() {
  return apiFetch<HealthResponse>("/health");
}
