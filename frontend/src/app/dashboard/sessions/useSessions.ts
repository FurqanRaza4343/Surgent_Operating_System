import { useState, useEffect, useCallback } from "react";
import { listConversations, resolveConversation, type ConversationListItem } from "../../../api/entities";
import type { Session } from "./types";

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  receptionist: "AI Receptionist",
  appointment_booking: "Appointment Booking",
  reschedule_cancellation: "Reschedule & Cancellation",
  appointment_reminder: "Appointment Reminder",
  multilingual_translation: "Multilingual Translation",
  ai_consultation: "AI Consultation",
  photo_analysis: "Photo Analysis",
  video_consultation: "Video Consultation",
  medical_history_intake: "Medical History Intake",
  risk_assessment: "Risk Assessment",
  procedure_recommendation: "Procedure Recommendation",
  pre_surgery_preparation: "Pre-Surgery Prep",
  surgery_scheduling: "Surgery Scheduling",
  surgeon_calendar: "Surgeon Calendar",
  operating_room_scheduler: "OR Scheduler",
  equipment_checklist: "Equipment Checklist",
  implant_inventory: "Implant Inventory",
  surgical_documentation: "Surgical Documentation",
  recovery_followup: "Recovery Follow-up",
  healing_monitoring: "Healing Monitoring",
  emergency_triage: "Emergency Triage",
  medication_reminder: "Medication Reminder",
  wound_care_guidance: "Wound Care Guidance",
  recovery_dashboard: "Recovery Dashboard",
  cost_estimation: "Cost Estimation",
  payment_invoice: "Payment & Invoice",
  insurance_verification: "Insurance Verification",
  analytics_dashboard: "Analytics Dashboard",
  patient_feedback: "Patient Feedback",
  marketing_followup: "Marketing Follow-up",
  lead_nurturing: "Lead Nurturing",
};

const CATEGORY_MAP: Record<string, string> = {
  receptionist: "front-desk",
  appointment_booking: "front-desk",
  reschedule_cancellation: "front-desk",
  appointment_reminder: "front-desk",
  multilingual_translation: "front-desk",
  ai_consultation: "consultation",
  photo_analysis: "consultation",
  video_consultation: "consultation",
  medical_history_intake: "consultation",
  risk_assessment: "consultation",
  procedure_recommendation: "consultation",
  pre_surgery_preparation: "consultation",
  surgery_scheduling: "surgery",
  surgeon_calendar: "surgery",
  operating_room_scheduler: "surgery",
  equipment_checklist: "surgery",
  implant_inventory: "surgery",
  surgical_documentation: "surgery",
  recovery_followup: "post-care",
  healing_monitoring: "post-care",
  emergency_triage: "post-care",
  medication_reminder: "post-care",
  wound_care_guidance: "post-care",
  recovery_dashboard: "post-care",
  cost_estimation: "business",
  payment_invoice: "business",
  insurance_verification: "business",
  analytics_dashboard: "business",
  patient_feedback: "business",
  marketing_followup: "business",
  lead_nurturing: "business",
};

function mapConversationToSession(c: ConversationListItem): Session {
  const name = c.patient_name || "Unknown Patient";
  return {
    id: c.id,
    patientId: c.patient_id || "",
    patientName: name,
    patientInitial: name.charAt(0).toUpperCase(),
    channel: c.channel as Session["channel"],
    agentSlug: c.agent_type,
    agentName: AGENT_DISPLAY_NAMES[c.agent_type] || c.agent_type,
    categoryId: CATEGORY_MAP[c.agent_type] || "business",
    status: c.status as Session["status"],
    lastMessagePreview: c.last_message_preview,
    updatedAt: c.updated_at,
    messages: [],
  };
}

export function useSessions(statusFilter?: string) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listConversations({ status: statusFilter, limit: 100 });
      setSessions(data.map(mapConversationToSession));
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load sessions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const resolve = useCallback(async (id: string) => {
    await resolveConversation(id);
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "resolved" as const } : s))
    );
  }, []);

  return { sessions, loading, error, refetch: fetchSessions, resolve };
}
