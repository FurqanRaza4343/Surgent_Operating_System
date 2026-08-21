import { receptionist } from "./receptionist";
import { appointmentBooking } from "./appointment_booking";
import { rescheduleCancellation } from "./reschedule_cancellation";
import { appointmentReminder } from "./appointment_reminder";
import { multilingualTranslation } from "./multilingual_translation";
import { aiConsultation } from "./ai_consultation";
import { photoAnalysis } from "./photo_analysis";
import { videoConsultation } from "./video_consultation";
import { medicalHistoryIntake } from "./medical_history_intake";
import { riskAssessment } from "./risk_assessment";
import { procedureRecommendation } from "./procedure_recommendation";
import { preSurgeryPreparation } from "./pre_surgery_preparation";
import { surgeryScheduling } from "./surgery_scheduling";
import { surgeonCalendar } from "./surgeon_calendar";
import { operatingRoomScheduler } from "./operating_room_scheduler";
import { equipmentChecklist } from "./equipment_checklist";
import { implantInventory } from "./implant_inventory";
import { surgicalDocumentation } from "./surgical_documentation";
import { recoveryFollowup } from "./recovery_followup";
import { healingMonitoring } from "./healing_monitoring";
import { emergencyTriage } from "./emergency_triage";
import { medicationReminder } from "./medication_reminder";
import { woundCareGuidance } from "./wound_care_guidance";
import { recoveryDashboard } from "./recovery_dashboard";
import { costEstimation } from "./cost_estimation";
import { paymentInvoice } from "./payment_invoice";
import { insuranceVerification } from "./insurance_verification";
import { analyticsDashboard } from "./analytics_dashboard";
import { patientFeedback } from "./patient_feedback";
import { marketingFollowup } from "./marketing_followup";
import { leadNurturing } from "./lead_nurturing";
import type { Agent, AgentCategory } from "./types";

export type { Agent, AgentCategory } from "./types";

export const AGENT_CATEGORIES: AgentCategory[] = [
  {
    id: "front-desk",
    label: "Front Desk & Intake",
    tagline: "Never miss a lead, a call, or a booking — around the clock.",
    agents: [receptionist, appointmentBooking, rescheduleCancellation, appointmentReminder, multilingualTranslation]
  },
  {
    id: "consultation",
    label: "Consultation & Screening",
    tagline: "Qualify and prepare patients before they ever walk in.",
    agents: [aiConsultation, photoAnalysis, videoConsultation, medicalHistoryIntake, riskAssessment, procedureRecommendation, preSurgeryPreparation]
  },
  {
    id: "surgery",
    label: "Surgery Management",
    tagline: "Orchestrate calendars, rooms, and inventory without friction.",
    agents: [surgeryScheduling, surgeonCalendar, operatingRoomScheduler, equipmentChecklist, implantInventory, surgicalDocumentation]
  },
  {
    id: "post-care",
    label: "Post-Surgery Care",
    tagline: "Keep patients safe, healing, and reassured after they leave.",
    agents: [recoveryFollowup, healingMonitoring, emergencyTriage, medicationReminder, woundCareGuidance, recoveryDashboard]
  },
  {
    id: "business",
    label: "Business & Operations",
    tagline: "Turn every interaction into revenue and retention.",
    agents: [costEstimation, paymentInvoice, insuranceVerification, analyticsDashboard, patientFeedback, marketingFollowup, leadNurturing]
  }
];

export const TOTAL_AGENTS = AGENT_CATEGORIES.reduce((n, c) => n + c.agents.length, 0);

export const AGENTS_BY_SLUG: Record<string, Agent> = Object.fromEntries(
  AGENT_CATEGORIES.flatMap((c) => c.agents).map((a) => [a.slug, a])
);
