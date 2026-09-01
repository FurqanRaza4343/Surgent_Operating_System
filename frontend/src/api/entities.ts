// ============================================================================
// Entities — the practice-domain resource records (patients, doctors,
// appointments, conversations). All of these are authed (take authedFetch) —
// backend/src/router/conversations/conversations_router.py requires
// get_current_practice_user like every other domain here.
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
  has_upcoming_appointment: boolean;
  has_completed_appointment: boolean;
  lifecycle_stage: string;
  lost_reason: string | null;
  source: string | null;
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
  source?: string | null;
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

export interface UpdatePatientRequest {
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  chief_complaint?: string | null;
  needs_surgery?: boolean;
  source?: string | null;
}

export function updatePatient(authedFetch: AuthedFetch, id: string, data: UpdatePatientRequest) {
  return authedFetch<PatientResponse>(`/api/v1/patients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

// --- leads / CRM funnel -------------------------------------------------------
// Matches the funnel-stage additions to backend/src/router/patients/patients_router.py.
export interface FunnelStageCount {
  stage: string;
  count: number;
}

export function updatePatientStage(authedFetch: AuthedFetch, id: string, stage: string, lostReason?: string | null) {
  return authedFetch<PatientResponse>(`/api/v1/patients/${id}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ stage, lost_reason: lostReason ?? null })
  });
}

export function getFunnelSummary(authedFetch: AuthedFetch) {
  return authedFetch<FunnelStageCount[]>("/api/v1/patients/funnel-summary");
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
  checked_in_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient_name: string | null;
}

export interface CreateAppointmentRequest {
  patient_id: string;
  doctor_id?: string | null;
  appointment_type: string;
  start_time: string;
  end_time: string;
  notes?: string | null;
}

// Matches backend/src/router/appointments/appointments_router.py. "me"
// resolves server-side to the caller's own linked Doctor row.
export function listMyAppointments(authedFetch: AuthedFetch) {
  return authedFetch<AppointmentResponse[]>("/api/v1/appointments?doctor_id=me");
}

// scope=practice — every doctor's appointments (Owner/Receptionist front-desk
// view), as opposed to listMyAppointments' own-schedule-only scope.
export function listPracticeAppointments(authedFetch: AuthedFetch) {
  return authedFetch<AppointmentResponse[]>("/api/v1/appointments?scope=practice");
}

export function createAppointment(authedFetch: AuthedFetch, data: CreateAppointmentRequest) {
  return authedFetch<AppointmentResponse>("/api/v1/appointments", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function checkInAppointment(authedFetch: AuthedFetch, id: string) {
  return authedFetch<AppointmentResponse>(`/api/v1/appointments/${id}/check-in`, {
    method: "PATCH"
  });
}

// --- doctor applications ------------------------------------------------------
export interface DocumentEntry {
  name: string;
  url: string;
  uploaded_at: string;
}

export interface SubmitDoctorApplicationRequest {
  name: string;
  email: string;
  phone?: string | null;
  specialty?: string | null;
  license_number?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  documents?: DocumentEntry[];
}

export interface DoctorApplicationResponse {
  id: string;
  practice_id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  license_number: string | null;
  bio: string | null;
  photo_url: string | null;
  documents: DocumentEntry[];
  status: "pending" | "approved" | "rejected";
  rejected_reason: string | null;
  doctor_id: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface ApplicationUploadResponse {
  url: string;
  name: string;
}

// Matches backend/src/router/doctor_applications/doctor_applications_router.py.
// Self-service endpoints (me/*) work while the applicant's account is still
// inactive (pending Owner review) — they're gated by get_current_user_record,
// not the stricter get_current_practice_user every other authed call uses.
export function uploadApplicationFile(authedFetch: AuthedFetch, file: File) {
  const form = new FormData();
  form.append("file", file);
  return authedFetch<ApplicationUploadResponse>("/api/v1/doctor-applications/me/upload", {
    method: "POST",
    body: form
  });
}

export function submitMyApplication(authedFetch: AuthedFetch, data: SubmitDoctorApplicationRequest) {
  return authedFetch<DoctorApplicationResponse>("/api/v1/doctor-applications/me", {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function getMyApplication(authedFetch: AuthedFetch) {
  return authedFetch<DoctorApplicationResponse>("/api/v1/doctor-applications/me");
}

// Owner-only below (require_role(OWNER) server-side).
export function listApplications(authedFetch: AuthedFetch, status?: string) {
  const qs = status ? `?status=${status}` : "";
  return authedFetch<DoctorApplicationResponse[]>(`/api/v1/doctor-applications${qs}`);
}

export function getApplication(authedFetch: AuthedFetch, id: string) {
  return authedFetch<DoctorApplicationResponse>(`/api/v1/doctor-applications/${id}`);
}

export function approveApplication(authedFetch: AuthedFetch, id: string, permissions: string[]) {
  return authedFetch<DoctorResponse>(`/api/v1/doctor-applications/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ permissions })
  });
}

export function rejectApplication(authedFetch: AuthedFetch, id: string, reason?: string) {
  return authedFetch<DoctorApplicationResponse>(`/api/v1/doctor-applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

// --- attendance ---------------------------------------------------------------
export interface AttendanceRecordResponse {
  id: string;
  practice_id: string;
  doctor_id: string;
  check_in_at: string;
  check_out_at: string | null;
}

// Matches backend/src/router/attendance/attendance_router.py.
export function checkIn(authedFetch: AuthedFetch) {
  return authedFetch<AttendanceRecordResponse>("/api/v1/attendance/check-in", { method: "POST" });
}

export function checkOut(authedFetch: AuthedFetch) {
  return authedFetch<AttendanceRecordResponse>("/api/v1/attendance/check-out", { method: "POST" });
}

export function listMyAttendance(authedFetch: AuthedFetch) {
  return authedFetch<AttendanceRecordResponse[]>("/api/v1/attendance/me");
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

export async function listConversations(
  authedFetch: AuthedFetch,
  params?: {
    status?: string;
    channel?: string;
    agent_type?: string[];
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ConversationListItem[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.channel) query.set("channel", params.channel);
  if (params?.agent_type) params.agent_type.forEach((t) => query.append("agent_type", t));
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  const qs = query.toString();
  return authedFetch<ConversationListItem[]>(`/api/v1/conversations${qs ? `?${qs}` : ""}`);
}

export async function getConversation(authedFetch: AuthedFetch, id: string): Promise<ConversationDetail> {
  return authedFetch<ConversationDetail>(`/api/v1/conversations/${id}`);
}

export async function resolveConversation(authedFetch: AuthedFetch, id: string): Promise<ConversationDetail> {
  return authedFetch<ConversationDetail>(`/api/v1/conversations/${id}/resolve`, {
    method: "POST",
  });
}

// --- analytics ----------------------------------------------------------------
export interface OverviewSummaryResponse {
  sessions_today: number;
  needs_attention: number;
  bookings_this_week: number;
}

export interface ChannelCount {
  channel: string;
  count: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface SessionAnalyticsResponse {
  total_conversations: number;
  active_count: number;
  needs_attention_count: number;
  resolved_count: number;
  by_channel: ChannelCount[];
  by_category: CategoryCount[];
}

// Matches backend/src/router/analytics/analytics_router.py — real aggregates
// over Conversation/Appointment, replacing MOCK_SESSIONS-derived numbers.
export function getOverviewSummary(authedFetch: AuthedFetch) {
  return authedFetch<OverviewSummaryResponse>("/api/v1/analytics/overview");
}

export function getSessionAnalytics(authedFetch: AuthedFetch) {
  return authedFetch<SessionAnalyticsResponse>("/api/v1/analytics/sessions");
}

// --- staff (receptionists) ---------------------------------------------------
// Matches backend/src/router/staff/staff_router.py. Owner-only — permissions
// live directly on the User row (data/receptionist_permissions.py), not a
// separate roster entity like Doctor.
export interface StaffResponse {
  id: string;
  practice_id: string;
  email: string;
  name: string | null;
  role: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InviteStaffRequest {
  email: string;
  permissions?: string[];
}

export interface InviteStaffResponse {
  email: string;
  permissions: string[];
}

export interface UpdateStaffRequest {
  permissions?: string[];
  is_active?: boolean;
}

export function inviteStaff(authedFetch: AuthedFetch, data: InviteStaffRequest) {
  return authedFetch<InviteStaffResponse>("/api/v1/staff", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function listStaff(authedFetch: AuthedFetch) {
  return authedFetch<StaffResponse[]>("/api/v1/staff");
}

export function updateStaff(authedFetch: AuthedFetch, id: string, data: UpdateStaffRequest) {
  return authedFetch<StaffResponse>(`/api/v1/staff/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

// --- procedures ---------------------------------------------------------------
// Matches backend/src/router/procedures/procedures_router.py — the practice's
// own procedure/pricing catalog. No seeded data; the Owner enters their own.
export interface ProcedureResponse {
  id: string;
  practice_id: string;
  name: string;
  category: string | null;
  description: string | null;
  base_price: number | null;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProcedureRequest {
  name: string;
  category?: string | null;
  description?: string | null;
  base_price?: number | null;
  duration_minutes?: number | null;
}

export interface UpdateProcedureRequest {
  name?: string;
  category?: string | null;
  description?: string | null;
  base_price?: number | null;
  duration_minutes?: number | null;
  is_active?: boolean;
}

export function createProcedure(authedFetch: AuthedFetch, data: CreateProcedureRequest) {
  return authedFetch<ProcedureResponse>("/api/v1/procedures", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function listProcedures(authedFetch: AuthedFetch, activeOnly = false) {
  return authedFetch<ProcedureResponse[]>(`/api/v1/procedures${activeOnly ? "?active_only=true" : ""}`);
}

export function updateProcedure(authedFetch: AuthedFetch, id: string, data: UpdateProcedureRequest) {
  return authedFetch<ProcedureResponse>(`/api/v1/procedures/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

// --- clinical (consultation notes + treatment plans) --------------------------
// Matches backend/src/router/clinical/clinical_router.py. Owner/Doctor only —
// deliberately excludes Receptionist (see the router's own comment).
export interface ConsultationNoteResponse {
  id: string;
  practice_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  chief_complaint: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  status: "draft" | "final";
  created_at: string;
  updated_at: string;
}

export interface CreateConsultationNoteRequest {
  patient_id: string;
  appointment_id?: string | null;
  chief_complaint?: string | null;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  status?: "draft" | "final";
}

export interface UpdateConsultationNoteRequest {
  chief_complaint?: string | null;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  status?: "draft" | "final";
}

export function createConsultationNote(authedFetch: AuthedFetch, data: CreateConsultationNoteRequest) {
  return authedFetch<ConsultationNoteResponse>("/api/v1/clinical/notes", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function listConsultationNotes(authedFetch: AuthedFetch, patientId: string) {
  return authedFetch<ConsultationNoteResponse[]>(`/api/v1/clinical/notes?patient_id=${patientId}`);
}

export function updateConsultationNote(authedFetch: AuthedFetch, id: string, data: UpdateConsultationNoteRequest) {
  return authedFetch<ConsultationNoteResponse>(`/api/v1/clinical/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export interface TreatmentPlanItemResponse {
  id: string;
  treatment_plan_id: string;
  procedure_id: string;
  phase_order: number;
  estimated_price: number | null;
  status: "planned" | "scheduled" | "completed" | "cancelled";
  scheduled_appointment_id: string | null;
  performed_at: string | null;
  actual_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreatmentPlanResponse {
  id: string;
  practice_id: string;
  patient_id: string;
  doctor_id: string;
  consultation_note_id: string | null;
  title: string;
  status: "draft" | "proposed" | "accepted" | "completed" | "cancelled";
  items: TreatmentPlanItemResponse[];
  created_at: string;
  updated_at: string;
}

export interface CreateTreatmentPlanItemRequest {
  procedure_id: string;
  phase_order?: number;
  estimated_price?: number | null;
  notes?: string | null;
}

export interface CreateTreatmentPlanRequest {
  patient_id: string;
  consultation_note_id?: string | null;
  title: string;
  items?: CreateTreatmentPlanItemRequest[];
}

export interface UpdateTreatmentPlanRequest {
  title?: string;
  status?: TreatmentPlanResponse["status"];
}

export interface UpdateTreatmentPlanItemRequest {
  status?: TreatmentPlanItemResponse["status"];
  estimated_price?: number | null;
  actual_price?: number | null;
  scheduled_appointment_id?: string | null;
  notes?: string | null;
}

export function createTreatmentPlan(authedFetch: AuthedFetch, data: CreateTreatmentPlanRequest) {
  return authedFetch<TreatmentPlanResponse>("/api/v1/clinical/treatment-plans", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function listTreatmentPlans(authedFetch: AuthedFetch, patientId: string) {
  return authedFetch<TreatmentPlanResponse[]>(`/api/v1/clinical/treatment-plans?patient_id=${patientId}`);
}

export function getTreatmentPlan(authedFetch: AuthedFetch, id: string) {
  return authedFetch<TreatmentPlanResponse>(`/api/v1/clinical/treatment-plans/${id}`);
}

export function updateTreatmentPlan(authedFetch: AuthedFetch, id: string, data: UpdateTreatmentPlanRequest) {
  return authedFetch<TreatmentPlanResponse>(`/api/v1/clinical/treatment-plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export function updateTreatmentPlanItem(authedFetch: AuthedFetch, id: string, data: UpdateTreatmentPlanItemRequest) {
  return authedFetch<TreatmentPlanItemResponse>(`/api/v1/clinical/treatment-plan-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

// --- patient photos -----------------------------------------------------------
// Matches backend/src/router/patient_photos/patient_photos_router.py.
// Owner/Doctor only (clinical photography), like clinical notes.
export interface PatientPhotoResponse {
  id: string;
  patient_id: string;
  cloudinary_url: string;
  photo_type: string | null;
  notes: string | null;
  created_at: string;
}

export function uploadPatientPhoto(authedFetch: AuthedFetch, patientId: string, file: File, photoType?: string, notes?: string) {
  const form = new FormData();
  form.append("file", file);
  if (photoType) form.append("photo_type", photoType);
  if (notes) form.append("notes", notes);
  return authedFetch<PatientPhotoResponse>(`/api/v1/patients/${patientId}/photos`, {
    method: "POST",
    body: form
  });
}

export function listPatientPhotos(authedFetch: AuthedFetch, patientId: string) {
  return authedFetch<PatientPhotoResponse[]>(`/api/v1/patients/${patientId}/photos`);
}

export function deletePatientPhoto(authedFetch: AuthedFetch, photoId: string) {
  return authedFetch<void>(`/api/v1/patient-photos/${photoId}`, {
    method: "DELETE"
  });
}

// --- consent documents ---------------------------------------------------------
// Matches backend/src/router/consent/consent_router.py. Open to any active
// practice role (Owner/Doctor/Receptionist) — administrative/legal, not
// clinical judgment, unlike notes/photos.
export interface ConsentDocumentResponse {
  id: string;
  practice_id: string;
  patient_id: string;
  document_type: string;
  content: string | null;
  version: number;
  status: "draft" | "sent" | "signed" | "void";
  signed_at: string | null;
  signed_by_name: string | null;
  witnessed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateConsentDocumentRequest {
  document_type: string;
  content?: string | null;
}

export function createConsentDocument(authedFetch: AuthedFetch, patientId: string, data: CreateConsentDocumentRequest) {
  return authedFetch<ConsentDocumentResponse>(`/api/v1/patients/${patientId}/consent-documents`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function listConsentDocuments(authedFetch: AuthedFetch, patientId: string) {
  return authedFetch<ConsentDocumentResponse[]>(`/api/v1/patients/${patientId}/consent-documents`);
}

export function signConsentDocument(authedFetch: AuthedFetch, id: string, signedByName: string) {
  return authedFetch<ConsentDocumentResponse>(`/api/v1/consent-documents/${id}/sign`, {
    method: "POST",
    body: JSON.stringify({ signed_by_name: signedByName })
  });
}

export function voidConsentDocument(authedFetch: AuthedFetch, id: string) {
  return authedFetch<ConsentDocumentResponse>(`/api/v1/consent-documents/${id}/void`, {
    method: "POST"
  });
}

// --- invoices (billing) --------------------------------------------------------
// Matches backend/src/router/billing/billing_router.py. Viewing is open to
// Owner/Doctor/Receptionist; creating/editing (incl. mark-paid) is
// Owner/Receptionist only — same split as consent documents' manage roles.
export interface InvoiceLineItemResponse {
  id: string;
  invoice_id: string;
  treatment_plan_item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceResponse {
  id: string;
  practice_id: string;
  patient_id: string;
  appointment_id: string | null;
  treatment_plan_id: string | null;
  subtotal_amount: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: "pending" | "paid" | "overdue" | "cancelled" | "refunded";
  due_date: string | null;
  paid_at: string | null;
  line_items: InvoiceLineItemResponse[];
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceLineItemRequest {
  treatment_plan_item_id?: string | null;
  description: string;
  quantity?: number;
  unit_price: number;
}

export interface CreateInvoiceRequest {
  patient_id: string;
  appointment_id?: string | null;
  treatment_plan_id?: string | null;
  line_items?: CreateInvoiceLineItemRequest[];
  tax_amount?: number;
  discount_amount?: number;
  due_date?: string | null;
}

export interface UpdateInvoiceRequest {
  status?: InvoiceResponse["status"];
  due_date?: string | null;
  tax_amount?: number;
  discount_amount?: number;
}

export function createInvoice(authedFetch: AuthedFetch, data: CreateInvoiceRequest) {
  return authedFetch<InvoiceResponse>("/api/v1/invoices", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function listInvoicesForPatient(authedFetch: AuthedFetch, patientId: string) {
  return authedFetch<InvoiceResponse[]>(`/api/v1/invoices?patient_id=${patientId}`);
}

export function listInvoicesForPractice(authedFetch: AuthedFetch, status?: InvoiceResponse["status"]) {
  return authedFetch<InvoiceResponse[]>(`/api/v1/invoices${status ? `?status=${status}` : ""}`);
}

export function getInvoice(authedFetch: AuthedFetch, id: string) {
  return authedFetch<InvoiceResponse>(`/api/v1/invoices/${id}`);
}

export function updateInvoice(authedFetch: AuthedFetch, id: string, data: UpdateInvoiceRequest) {
  return authedFetch<InvoiceResponse>(`/api/v1/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

// --- finance: expenses + overview -----------------------------------------------
// Matches backend/src/router/finance/finance_router.py. Recording/viewing
// expenses is Owner+Receptionist; the aggregate overview is Owner-only.
export interface ExpenseResponse {
  id: string;
  practice_id: string;
  expense_type: string;
  status: string;
  category: string;
  amount: number;
  vendor: string | null;
  payee_name: string | null;
  expense_date: string;
  notes: string | null;
  paid_at: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseRequest {
  expense_type?: string;
  status?: string;
  category: string;
  amount: number;
  vendor?: string | null;
  payee_name?: string | null;
  expense_date: string;
  notes?: string | null;
}

export interface UpdateExpenseRequest {
  expense_type?: string;
  status?: string;
  category?: string;
  amount?: number;
  vendor?: string | null;
  payee_name?: string | null;
  expense_date?: string;
  notes?: string | null;
  paid_at?: string | null;
}

export interface FinanceOverviewResponse {
  total_revenue: number;
  total_expenses: number;
  net: number;
  invoice_count: number;
  expense_count: number;
}

export function createExpense(authedFetch: AuthedFetch, data: CreateExpenseRequest) {
  return authedFetch<ExpenseResponse>("/api/v1/finance/expenses", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function listExpenses(authedFetch: AuthedFetch) {
  return authedFetch<ExpenseResponse[]>("/api/v1/finance/expenses");
}

export function updateExpense(authedFetch: AuthedFetch, id: string, data: UpdateExpenseRequest) {
  return authedFetch<ExpenseResponse>(`/api/v1/finance/expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export function deleteExpense(authedFetch: AuthedFetch, id: string) {
  return authedFetch<void>(`/api/v1/finance/expenses/${id}`, {
    method: "DELETE"
  });
}

export function getFinanceOverview(authedFetch: AuthedFetch) {
  return authedFetch<FinanceOverviewResponse>("/api/v1/finance/overview");
}

// --- inventory ------------------------------------------------------------------
// Matches backend/src/router/inventory/inventory_router.py. Owner+Receptionist
// only, same split as Expenses.
export interface InventoryItemResponse {
  id: string;
  practice_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string | null;
  reorder_threshold: number | null;
  is_active: boolean;
  on_hand_quantity: number;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryItemRequest {
  name: string;
  sku?: string | null;
  category?: string | null;
  unit?: string | null;
  reorder_threshold?: number | null;
}

export interface UpdateInventoryItemRequest {
  name?: string;
  sku?: string | null;
  category?: string | null;
  unit?: string | null;
  reorder_threshold?: number | null;
  is_active?: boolean;
}

export interface InventoryBatchResponse {
  id: string;
  inventory_item_id: string;
  lot_number: string | null;
  quantity: number;
  expiry_date: string | null;
  received_at: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiveBatchRequest {
  lot_number?: string | null;
  quantity: number;
  expiry_date?: string | null;
  received_at?: string | null;
}

export function createInventoryItem(authedFetch: AuthedFetch, data: CreateInventoryItemRequest) {
  return authedFetch<InventoryItemResponse>("/api/v1/inventory/items", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function listInventoryItems(authedFetch: AuthedFetch) {
  return authedFetch<InventoryItemResponse[]>("/api/v1/inventory/items");
}

export function getInventoryItem(authedFetch: AuthedFetch, id: string) {
  return authedFetch<InventoryItemResponse>(`/api/v1/inventory/items/${id}`);
}

export function updateInventoryItem(authedFetch: AuthedFetch, id: string, data: UpdateInventoryItemRequest) {
  return authedFetch<InventoryItemResponse>(`/api/v1/inventory/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export function receiveInventoryBatch(authedFetch: AuthedFetch, itemId: string, data: ReceiveBatchRequest) {
  return authedFetch<InventoryBatchResponse>(`/api/v1/inventory/items/${itemId}/batches`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function listInventoryBatches(authedFetch: AuthedFetch, itemId: string) {
  return authedFetch<InventoryBatchResponse[]>(`/api/v1/inventory/items/${itemId}/batches`);
}

export function consumeInventoryStock(authedFetch: AuthedFetch, itemId: string, quantity: number) {
  return authedFetch<InventoryItemResponse>(`/api/v1/inventory/items/${itemId}/consume`, {
    method: "POST",
    body: JSON.stringify({ quantity })
  });
}

// --- AI Receptionist -------------------------------------------------------------
// Matches backend/src/router/ai_receptionist/ai_receptionist_router.py — the
// merged voice/chat + reminders + translation module (previously 3 separate
// "agent" folders: receptionist_agent, appointment_reminder_agent,
// multilingual_translation_agent). Owner always sees /overview; Doctor sees
// it too if granted the "view_ai_receptionist" permission.
export interface AIReceptionistOverviewResponse {
  calls_handled: number;
  reminders_sent: number;
  translations_done: number;
  total_interactions: number;
  estimated_cost_total: number;
  estimated_cost_last_30_days: number;
}

export function getAIReceptionistOverview(authedFetch: AuthedFetch) {
  return authedFetch<AIReceptionistOverviewResponse>("/api/v1/ai-receptionist/overview");
}

export function translateText(authedFetch: AuthedFetch, text: string, targetLanguage: string) {
  return authedFetch<{ translated_text: string }>("/api/v1/ai-receptionist/translate", {
    method: "POST",
    body: JSON.stringify({ text, target_language: targetLanguage })
  });
}

export function sendAppointmentReminder(authedFetch: AuthedFetch, appointmentId: string) {
  return authedFetch<{ appointment_id: string; message_id: string; sent: boolean }>(
    `/api/v1/ai-receptionist/appointments/${appointmentId}/reminder`,
    { method: "POST" }
  );
}

// --- staff messages ---------------------------------------------------------------
// Matches backend/src/router/staff_messages/staff_message_router.py — a
// simple two-way thread per (Owner, staff member). Doctor/Receptionist use
// the /me aliases (their own thread, no need to know their own User.id);
// Owner uses /threads (inbox) + /{staff_user_id} for a specific thread.
export interface StaffMessageResponse {
  id: string;
  practice_id: string;
  staff_user_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_role: string;
  body: string;
  created_at: string;
}

export interface StaffMessageThreadSummary {
  staff_user_id: string;
  staff_name: string | null;
  staff_role: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  message_count: number;
}

export function listMyMessages(authedFetch: AuthedFetch) {
  return authedFetch<StaffMessageResponse[]>("/api/v1/staff-messages/me");
}

export function sendMyMessage(authedFetch: AuthedFetch, body: string) {
  return authedFetch<StaffMessageResponse>("/api/v1/staff-messages/me", {
    method: "POST",
    body: JSON.stringify({ body })
  });
}

export function listMessagesWith(authedFetch: AuthedFetch, staffUserId: string) {
  return authedFetch<StaffMessageResponse[]>(`/api/v1/staff-messages/${staffUserId}`);
}

export function sendMessageTo(authedFetch: AuthedFetch, staffUserId: string, body: string) {
  return authedFetch<StaffMessageResponse>(`/api/v1/staff-messages/${staffUserId}`, {
    method: "POST",
    body: JSON.stringify({ body })
  });
}

export function listMessageThreads(authedFetch: AuthedFetch) {
  return authedFetch<StaffMessageThreadSummary[]>("/api/v1/staff-messages/threads");
}

// --- patient portal ----------------------------------------------------------
// Link-based demo portal — Owner generates / revokes a shareable /portal/:token
// URL for a patient (backend/src/router/patient_portal/patient_portal_router.py),
// and the patient opens that URL to read their own appointments/consents/invoices.
export interface PortalLinkResponse {
  portal_url: string | null;
  enabled: boolean;
}

export interface PortalAppointment {
  id: string;
  appointment_type: string;
  status: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

export interface PortalConsentDocument {
  id: string;
  document_type: string;
  status: string;
  signed_at: string | null;
  signed_by_name: string | null;
}

export interface PortalInvoice {
  id: string;
  description: string;
  total_amount: number;
  status: string;
  due_date: string | null;
  created_at: string;
}

export interface PortalPhoto {
  id: string;
  photo_type: string | null;
  notes: string | null;
  url: string;
  taken_at: string;
}

export interface PortalPatientResponse {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  chief_complaint: string | null;
  consent_status: boolean;
  appointments: PortalAppointment[];
  consent_documents: PortalConsentDocument[];
  invoices: PortalInvoice[];
  photos: PortalPhoto[];
  invoice_total_pending: number;
}

export interface PortalBookingRequest {
  appointment_type: string;
  start_time: string;
  end_time: string;
  notes?: string | null;
}

export function generatePortalLink(authedFetch: AuthedFetch, patientId: string) {
  return authedFetch<PortalLinkResponse>(`/api/v1/patient-portal/patients/${patientId}/link`, {
    method: "POST"
  });
}

export function revokePortalLink(authedFetch: AuthedFetch, patientId: string) {
  return authedFetch<PortalLinkResponse>(`/api/v1/patient-portal/patients/${patientId}/link`, {
    method: "DELETE"
  });
}

export function getPortalLink(authedFetch: AuthedFetch, patientId: string) {
  return authedFetch<PortalLinkResponse>(`/api/v1/patient-portal/patients/${patientId}/link`);
}

// Public self-serve booking — no authedFetch: the portal token IS the
// credential, so this plain-fetches against the same origin as the page.
export async function portalBookAppointment(token: string, data: PortalBookingRequest): Promise<PortalPatientResponse> {
  const res = await fetch(`/api/v1/patient-portal/${encodeURIComponent(token)}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body?.detail === "string" ? body.detail : "Couldn't book your appointment. Please try again.");
  }
  return res.json();
}

export interface ConsultationRequestPayload {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  chief_complaint: string;
  needs_surgery?: boolean;
}

export interface ConsultationRequestResponse {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  chief_complaint: string | null;
  needs_surgery: boolean;
  ai_agent_assigned: string | null;
  source: string | null;
  lifecycle_stage: string;
  created_at: string;
  updated_at: string;
}

// Public website "Book a consultation" lead — no authedFetch, same reason as
// portalBookAppointment: the form is the funnel entry, no auth required.
export async function submitConsultationRequest(data: ConsultationRequestPayload): Promise<ConsultationRequestResponse> {
  const res = await fetch(`/api/v1/public/consultation-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body?.detail === "string" ? body.detail : "Couldn't send your request. Please try again.");
  }
  return res.json();
}
