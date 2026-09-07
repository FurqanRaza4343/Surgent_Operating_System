export interface Patient {
  id: string;
  name: string;
  initial: string;
  email: string;
  phone: string;
  status: "active" | "lead" | "inactive";
  lastVisit: string | null; // ISO date
  nextAppointment: string | null; // ISO date
  procedures: string[];
  consentOnFile: boolean;
  // Mirrors backend/src/models/patient.py's AI-assignment fields
  // (chief_complaint/needs_surgery/ai_agent_assigned/agent_status).
  chiefComplaint: string;
  needsSurgery: boolean;
  assignedAgentSlug: string | null;
  assignedCategoryId: string | null;
  assignmentReasoning: string | null;
  agentStatus: "active" | "inactive";
  // CRM funnel stage — mirrors backend/src/models/patient.py's
  // PatientLifecycleStage. Separate from `status` above, which stays
  // booking-derived for backward compat.
  lifecycleStage: "inquiry" | "contacted" | "consult_scheduled" | "consult_completed" | "treatment_planned" | "patient" | "lost";
  lostReason: string | null;
  source: string | null;
  // --- AI workflows (Week 4) — see backend/src/services/leads/. Optional
  // since stored/older patient rows predate these fields — normalize() below
  // backfills both to null for any patient missing them, same pattern as
  // lifecycleStage/source above.
  qualification?: {
    interestedProcedure: string | null;
    budgetSignal: string;
    urgency: string;
    score: number;
    summary: string;
  } | null;
  intakeSummary?: string | null;
  // --- Clinical ownership + lifecycle (Patient Management redesign) ---
  // The one durable doctor-patient link (see backend/src/models/patient.py's
  // assigned_doctor_id) — distinct from ai_agent_assigned above, which is
  // the AI marketing/workflow assignment, not a human clinician.
  assignedDoctorId?: string | null;
  assignedDoctorName?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  portalId?: string | null;
  portalEnabled?: boolean;
}
