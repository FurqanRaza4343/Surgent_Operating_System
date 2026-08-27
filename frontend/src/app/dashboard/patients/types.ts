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
}
