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
}
