import { useState, useEffect, useCallback } from "react";
import {
  listConversations,
  getConversation,
  resolveConversation,
  sendConversationMessage,
  toggleConversationAi,
  type ConversationListItem,
  type ConversationDetail
} from "../../../api/entities";
import { usePlan } from "../plan/PlanContext";
import type { Session, SessionMessage } from "./types";

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

export function mapConversationToSession(c: ConversationListItem): Session {
  const name = c.patient_name || "Unknown Patient";
  return {
    id: c.id,
    patientId: c.patient_id || "",
    patientName: name,
    patientInitial: name.charAt(0).toUpperCase(),
    avatarUrl: c.avatar_url,
    channel: c.channel as Session["channel"],
    agentSlug: c.agent_type,
    agentName: AGENT_DISPLAY_NAMES[c.agent_type] || c.agent_type,
    categoryId: CATEGORY_MAP[c.agent_type] || "business",
    status: c.status as Session["status"],
    lastMessagePreview: c.last_message_preview,
    updatedAt: c.updated_at,
    aiPaused: c.ai_paused,
    messages: [],
  };
}

function mapRole(role: string): SessionMessage["from"] {
  if (role === "agent") return "agent";
  if (role === "patient") return "patient";
  if (role === "staff") return "staff";
  return "system";
}

function mapDetailMessages(detail: ConversationDetail): SessionMessage[] {
  return detail.messages.map((m) => ({
    id: m.id,
    from: mapRole(m.role),
    text: m.content,
    at: m.created_at,
  }));
}

// How often to quietly re-check for new messages/status changes — a real
// WhatsApp reply from a patient, or the AI's own reply, previously only
// ever showed up after a manual navigate-away-and-back. Short enough to
// feel "live," long enough not to hammer the API for what's still a
// polling-based (not websocket) inbox.
const POLL_INTERVAL_MS = 4000;

export function useSessions(statusFilter?: string, patientId?: string) {
  const { authedFetch } = usePlan();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchSessions = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!authedFetch) {
        setLoading(false);
        return;
      }
      try {
        if (!opts?.silent) setLoading(true);
        const data = await listConversations(authedFetch, { status: statusFilter, patient_id: patientId, limit: 100 });
        setSessions((prev) => {
          const next = data.map(mapConversationToSession);
          // A background poll re-applies the server-side status filter, so
          // a conversation whose status just changed (e.g. AI resumed and
          // the patient's message got handled, no longer "needs attention")
          // can legitimately drop out of a filtered list. If it's the one
          // currently open, keep showing it — and keep whatever messages
          // are already loaded for it — rather than yanking the reply box
          // out from under whoever's mid-conversation with it.
          if (selectedId && !next.some((s) => s.id === selectedId)) {
            const stillOpen = prev.find((s) => s.id === selectedId);
            if (stillOpen) return [...next, stillOpen];
          }
          // Preserve already-loaded messages for sessions that were open
          // before this poll — the list endpoint doesn't return message
          // bodies, only a preview.
          return next.map((s) => {
            const existing = prev.find((p) => p.id === s.id);
            return existing && existing.messages.length > 0 ? { ...s, messages: existing.messages } : s;
          });
        });
        setError(null);
      } catch (e: unknown) {
        if (!opts?.silent) {
          const msg = e instanceof Error ? e.message : "Failed to load sessions";
          setError(msg);
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [authedFetch, statusFilter, patientId, selectedId]
  );

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const loadMessages = useCallback(async (sessionId: string) => {
    setSelectedId(sessionId);
    if (!authedFetch) return;
    try {
      const detail = await getConversation(authedFetch, sessionId);
      const messages = mapDetailMessages(detail);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...mapConversationToSession(detail), messages } : s))
      );
    } catch {
      // Silently fail — messages stay empty
    }
  }, [authedFetch]);

  // Quiet background refresh: re-fetches the list (so previews/status/new
  // conversations show up) and, if a conversation is open, its messages —
  // all without the loading spinner a manual fetchSessions() would show.
  useEffect(() => {
    if (!authedFetch) return;
    const interval = setInterval(() => {
      fetchSessions({ silent: true });
      if (selectedId) {
        getConversation(authedFetch, selectedId)
          .then((detail) => {
            const messages = mapDetailMessages(detail);
            setSessions((prev) =>
              prev.map((s) => (s.id === selectedId ? { ...mapConversationToSession(detail), messages } : s))
            );
          })
          .catch(() => {
            // Transient poll failure — next tick tries again.
          });
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authedFetch, selectedId, fetchSessions]);

  const resolve = useCallback(async (id: string) => {
    if (!authedFetch) return;
    await resolveConversation(authedFetch, id);
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "resolved" as const } : s))
    );
  }, [authedFetch]);

  const applyDetail = useCallback((id: string, detail: ConversationDetail) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...mapConversationToSession(detail), messages: mapDetailMessages(detail) }
          : s
      )
    );
  }, []);

  const sendMessage = useCallback(
    async (id: string, body: string) => {
      if (!authedFetch) return;
      const detail = await sendConversationMessage(authedFetch, id, body);
      applyDetail(id, detail);
    },
    [authedFetch, applyDetail]
  );

  const toggleAi = useCallback(
    async (id: string, paused: boolean) => {
      if (!authedFetch) return;
      const detail = await toggleConversationAi(authedFetch, id, paused);
      applyDetail(id, detail);
    },
    [authedFetch, applyDetail]
  );

  return { sessions, loading, error, refetch: fetchSessions, resolve, loadMessages, sendMessage, toggleAi };
}
