import type { Session } from "../sessions/types";

// Placeholder data standing in for the real `conversations` backend API (not
// built yet — see app/dashboard/README.md, Phase 1). Shaped exactly like the
// real `Conversation`/`Message` models so swapping this for a real fetch
// later is a data-source change, not a UI rewrite.
// avatarUrl/aiPaused are filled in by the .map() below so this file doesn't
// need every entry touched whenever Session gains a new required field —
// still typed against Session (minus those two) so the literal unions
// (channel/status/message.from) stay checked.
const RAW_SESSIONS: Omit<Session, "avatarUrl" | "aiPaused">[] = [
{
  id: "s1",
  patientId: "p1",
  patientName: "Maya Reyes",
  patientInitial: "M",
  channel: "instagram",
  agentSlug: "lead_nurturing",
  agentName: "Lead Nurturing",
  categoryId: "business",
  status: "resolved",
  lastMessagePreview: "Booked ✅ Thursday 2:30 PM with Dr. Reyes.",
  updatedAt: "2026-08-24T09:12:00Z",
  messages: [
  { id: "m1", from: "patient", text: "Hi! How much is a rhinoplasty and do you have anything next week?", at: "2026-08-24T09:08:00Z" },
  { id: "m2", from: "agent", text: "Hi Maya! Rhinoplasty consultations start at $150. I have Tuesday 11:00 AM or Thursday 2:30 PM open — want me to hold one?", at: "2026-08-24T09:09:00Z" },
  { id: "m3", from: "patient", text: "Thursday works!", at: "2026-08-24T09:11:00Z" },
  { id: "m4", from: "agent", text: "Booked ✅ Thursday 2:30 PM with Dr. Reyes. Confirmation + intake link texted to you.", at: "2026-08-24T09:12:00Z" }]

},
{
  id: "s2",
  patientId: "p2",
  patientName: "Daniel Ortiz",
  patientInitial: "D",
  channel: "phone",
  agentSlug: "receptionist",
  agentName: "AI Receptionist",
  categoryId: "front-desk",
  status: "active",
  lastMessagePreview: "Let me check Dr. Vance's calendar for you.",
  updatedAt: "2026-08-24T08:47:00Z",
  messages: [
  { id: "m1", from: "patient", text: "Hi, I need to reschedule my consult next week.", at: "2026-08-24T08:45:00Z" },
  { id: "m2", from: "agent", text: "Of course — let me check Dr. Vance's calendar for you.", at: "2026-08-24T08:47:00Z" }]

},
{
  id: "s3",
  patientId: "p3",
  patientName: "Priya Nair",
  patientInitial: "P",
  channel: "whatsapp",
  agentSlug: "emergency_triage",
  agentName: "Emergency Triage",
  categoryId: "post-care",
  status: "needs_attention",
  lastMessagePreview: "Patient reports increased swelling and mild fever — flagged for review.",
  updatedAt: "2026-08-24T07:58:00Z",
  messages: [
  { id: "m1", from: "patient", text: "Hi, day 4 post-op and the swelling seems worse today, and I feel a bit feverish.", at: "2026-08-24T07:55:00Z" },
  { id: "m2", from: "agent", text: "Thanks for the update, Priya. I'm flagging this for a nurse to call you within the hour — please monitor your temperature in the meantime.", at: "2026-08-24T07:57:00Z" },
  { id: "m3", from: "system", text: "Escalated to on-call staff — needs review.", at: "2026-08-24T07:58:00Z" }]

},
{
  id: "s4",
  patientId: "p4",
  patientName: "Grace Kim",
  patientInitial: "G",
  channel: "web_chat",
  agentSlug: "cost_estimation",
  agentName: "Cost Estimation",
  categoryId: "business",
  status: "resolved",
  lastMessagePreview: "Sent you the full breakdown — let me know if you'd like to book a consult!",
  updatedAt: "2026-08-23T19:20:00Z",
  messages: [
  { id: "m1", from: "patient", text: "How much would a facelift cost roughly?", at: "2026-08-23T19:17:00Z" },
  { id: "m2", from: "agent", text: "It varies by scope, but our facelift procedures typically range $8,500–$14,000. Sent you the full breakdown — let me know if you'd like to book a consult!", at: "2026-08-23T19:20:00Z" }]

},
{
  id: "s5",
  patientId: "p5",
  patientName: "Omar Haddad",
  patientInitial: "O",
  channel: "instagram",
  agentSlug: "photo_analysis",
  agentName: "Photo Analysis",
  categoryId: "consultation",
  status: "needs_attention",
  lastMessagePreview: "Screening flagged a risk factor — routed to Dr. Reyes for review.",
  updatedAt: "2026-08-23T16:03:00Z",
  messages: [
  { id: "m1", from: "patient", text: "[sent 2 photos]", at: "2026-08-23T16:00:00Z" },
  { id: "m2", from: "agent", text: "Thanks for sending those. I've noted a factor worth a closer look — this is screening only, not a diagnosis.", at: "2026-08-23T16:02:00Z" },
  { id: "m3", from: "system", text: "Screening flagged a risk factor — routed to Dr. Reyes for review.", at: "2026-08-23T16:03:00Z" }]

},
{
  id: "s6",
  patientId: "p6",
  patientName: "Linda Park",
  patientInitial: "L",
  channel: "phone",
  agentSlug: "appointment_reminder",
  agentName: "Appointment Reminder",
  categoryId: "front-desk",
  status: "resolved",
  lastMessagePreview: "Confirmed for tomorrow at 10:00 AM.",
  updatedAt: "2026-08-23T14:30:00Z",
  messages: [
  { id: "m1", from: "agent", text: "Hi Linda, just confirming your consult tomorrow at 10:00 AM with Dr. Vance — reply YES to confirm.", at: "2026-08-23T14:28:00Z" },
  { id: "m2", from: "patient", text: "Yes", at: "2026-08-23T14:30:00Z" },
  { id: "m3", from: "system", text: "Confirmed for tomorrow at 10:00 AM.", at: "2026-08-23T14:30:00Z" }]

}];

export const MOCK_SESSIONS: Session[] = RAW_SESSIONS.map((s) => ({ ...s, avatarUrl: null, aiPaused: false }));

export const MOCK_OVERVIEW_STATS = {
  sessionsToday: 24,
  needsAttention: MOCK_SESSIONS.filter((s) => s.status === "needs_attention").length,
  bookingsCreated: 9,
  revenueAttributed: 18400
};
