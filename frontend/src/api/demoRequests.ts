import { apiFetch } from "./client";

export interface DemoRequestPayload {
  name: string;
  email: string;
  phone?: string;
  practice_name?: string;
  message?: string;
}

export interface DemoRequestResponse {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

// Matches backend/src/router/demo/demo_router.py's POST /api/v1/demo-requests.
export function submitDemoRequest(payload: DemoRequestPayload) {
  return apiFetch<DemoRequestResponse>("/api/v1/demo-requests", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
