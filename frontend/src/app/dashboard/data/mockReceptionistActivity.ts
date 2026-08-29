// Placeholder data for the AI Receptionist live-monitoring page
// (app/dashboard/receptionist/). The real receptionist backend
// (backend/src/services/agents/receptionist_agent/receptionist_agent_services.py)
// has no call/transcript/booking persistence yet — confirmed via
// exploration, it calls the LLM but writes nothing to Conversation/Message.
// This page is intentionally UI-first, same convention as mockSessions.ts;
// wiring real telemetry (Twilio/WhatsApp/Instagram webhooks, real
// Conversation rows) is the next phase, not this one.
import type { ChannelId } from "../data/channels";

export const MOCK_RECEPTIONIST_STATS = {
  activeCalls: 3,
  activeCallsChangePercent: 12,
  aiBookings: 47,
  conversionRate: 84,
  latencyMs: 1200,
  escalations: 1
};

export interface Transcript {
  id: string;
  name: string;
  channel: ChannelId;
  time: string;
  snippet: string;
  sentiment: "positive" | "neutral" | "urgent";
  tag: string;
}

export const MOCK_TRANSCRIPTS: Transcript[] = [
{
  id: "t1",
  name: "James Wilson",
  channel: "phone",
  time: "2:14 PM",
  snippet: "I'd like to reschedule my Tuesday appointment to Friday if possible…",
  sentiment: "positive",
  tag: "Booking confirmed"
},
{
  id: "t2",
  name: "Unknown caller",
  channel: "web_chat",
  time: "2:10 PM",
  snippet: "Do you take BlueCross insurance for rhinoplasty consults?",
  sentiment: "neutral",
  tag: "Information request"
},
{
  id: "t3",
  name: "Sarah Jenkins",
  channel: "whatsapp",
  time: "2:05 PM",
  snippet: "My post-op swelling seems worse today and I have a slight fever…",
  sentiment: "urgent",
  tag: "Transferred to Dr. Chen"
}];


export interface PipelineStage {
  label: string;
  count: number;
}

export const MOCK_BOOKING_PIPELINE: PipelineStage[] = [
{ label: "Qualified leads", count: 2481 },
{ label: "Appointments scheduled", count: 892 },
{ label: "Auto follow-ups sent", count: 1104 }];


export interface ChannelStatus {
  channel: ChannelId;
  connected: boolean;
  detail: string;
}

export const MOCK_CHANNEL_STATUS: ChannelStatus[] = [
{ channel: "whatsapp", connected: true, detail: "14 waiting" },
{ channel: "instagram", connected: true, detail: "3 inquiries" },
{ channel: "facebook", connected: false, detail: "0 new" }];


export const MOCK_SYSTEM_HEALTH = {
  version: "Prime Agent v2.4",
  status: "Optimal performance",
  cpuLoad: 14,
  knowledgeDocs: 8200
};
