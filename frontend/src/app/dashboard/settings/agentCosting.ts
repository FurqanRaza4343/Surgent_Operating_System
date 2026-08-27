// Mirrors backend/src/services/agent_costing/agent_costing_services.py's
// DEFAULT_COSTS — same values, kept as a separate constant on purpose (see
// that file's own comment: different languages/deploys, update both
// deliberately). Used as the fallback when the real
// GET /api/v1/agent-costing call fails (backend not running, offline dev) —
// same graceful-degradation pattern used everywhere else in this dashboard.
export const DEFAULT_AGENT_COSTS: Record<string, number> = {
  receptionist: 0.12,
  appointment_booking: 0.1,
  reschedule_cancellation: 0.1,
  appointment_reminder: 0.06,
  multilingual_translation: 0.15,
  ai_consultation: 0.85,
  photo_analysis: 1.2,
  video_consultation: 2.5,
  medical_history_intake: 0.25,
  risk_assessment: 0.35,
  procedure_recommendation: 0.4,
  pre_surgery_preparation: 0.3,
  surgery_scheduling: 0.28,
  surgeon_calendar: 0.18,
  operating_room_scheduler: 0.32,
  equipment_checklist: 0.2,
  implant_inventory: 0.22,
  surgical_documentation: 0.45,
  recovery_followup: 0.25,
  healing_monitoring: 0.3,
  emergency_triage: 0.55,
  medication_reminder: 0.08,
  wound_care_guidance: 0.35,
  recovery_dashboard: 0.28,
  cost_estimation: 0.3,
  payment_invoice: 0.2,
  insurance_verification: 0.35,
  analytics_dashboard: 0.65,
  patient_feedback: 0.15,
  marketing_followup: 0.18,
  lead_nurturing: 0.2
};
