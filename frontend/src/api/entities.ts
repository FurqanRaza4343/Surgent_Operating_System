import { apiFetch } from "./client";

// ============================================================================
// Entities — the practice-domain resource records (patients, doctors,
// appointments, conversations). Patients / doctors / appointments are authed
// (take authedFetch); conversations are currently read via the public
// apiFetch chain.
// ============================================================================

type AuthedFetch = <T>(path: string, init?: RequestInit) => Promise<T>;

// --- patients ---------------------------------------------------------------
export interface PatientResponse {
  id: string;
  practice_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  chief_complaint: string | null;
  needs_surgery: boolean;
  consent_status: boolean;
  ai_agent_assigned: string | null;
  agent_status: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePatientRequest {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  chief_complaint?: string | null;
  needs_surgery?: boolean;
  ai_agent_assigned?: string | null;
}

// Matches backend/src/router/patients/patients_router.py — a plain function
// that takes authedFetch rather than being a hook.
export function createPatient(authedFetch: AuthedFetch, data: CreatePatientRequest) {
  return authedFetch<PatientResponse>("/api/v1/patients", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function listPatients(authedFetch: AuthedFetch) {
  return authedFetch<PatientResponse[]>("/api/v1/patients");
}

// --- doctors ----------------------------------------------------------------
export interface DoctorResponse {
  id: string;
  practice_id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  license_number: string | null;
  bio: string | null;
  photo_url: string | null;
  capabilities: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDoctorRequest {
  name: string;
  email: string;
  phone?: string | null;
  specialty?: string | null;
  license_number?: string | null;
  bio?: string | null;
  capabilities?: string[];
}

export interface UpdateDoctorRequest {
  name?: string;
  email?: string;
  phone?: string | null;
  specialty?: string | null;
  license_number?: string | null;
  bio?: string | null;
  capabilities?: string[];
  is_active?: boolean;
}

export function createDoctor(authedFetch: AuthedFetch, data: CreateDoctorRequest) {
  return authedFetch<DoctorResponse>("/api/v1/doctors", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function listDoctors(authedFetch: AuthedFetch) {
  return authedFetch<DoctorResponse[]>("/api/v1/doctors");
}

export function getDoctor(authedFetch: AuthedFetch, id: string) {
  return authedFetch<DoctorResponse>(`/api/v1/doctors/${id}`);
}

export function getMyDoctor(authedFetch: AuthedFetch) {
  return authedFetch<DoctorResponse>("/api/v1/doctors/me");
}

export function updateDoctor(authedFetch: AuthedFetch, id: string, data: UpdateDoctorRequest) {
  return authedFetch<DoctorResponse>(`/api/v1/doctors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export function inviteDoctor(authedFetch: AuthedFetch, id: string) {
  return authedFetch<DoctorResponse>(`/api/v1/doctors/${id}/invite`, {
    method: "POST"
  });
}

// --- appointments -----------------------------------------------------------
export interface AppointmentResponse {
  id: string;
  practice_id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_type: string;
  status: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Matches backend/src/router/appointments/appointments_router.py — read-only
// for now (real booking/rescheduling is a later phase). "me" resolves
// server-side to the caller's own linked Doctor row.
export function listMyAppointments(authedFetch: AuthedFetch) {
  return authedFetch<AppointmentResponse[]>("/api/v1/appointments?doctor_id=me");
}

// --- conversations ----------------------------------------------------------
export interface ConversationListItem {
  id: string;
  patient_id: string | null;
  patient_name: string;
  agent_type: string;
  channel: string;
  status: string;
  last_message_preview: string;
  updated_at: string;
}

export interface MessageResponse {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  content_type: string;
  created_at: string;
}

export interface ConversationDetail extends ConversationListItem {
  messages: MessageResponse[];
}

export async function listConversations(params?: {
  status?: string;
  channel?: string;
  agent_type?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ConversationListItem[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.channel) query.set("channel", params.channel);
  if (params?.agent_type) params.agent_type.forEach((t) => query.append("agent_type", t));
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  const qs = query.toString();
  return apiFetch<ConversationListItem[]>(`/api/v1/conversations${qs ? `?${qs}` : ""}`);
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  return apiFetch<ConversationDetail>(`/api/v1/conversations/${id}`);
}

export async function resolveConversation(id: string): Promise<ConversationDetail> {
  return apiFetch<ConversationDetail>(`/api/v1/conversations/${id}/resolve`, {
    method: "POST",
  });
}
