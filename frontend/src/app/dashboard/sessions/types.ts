import type { ChannelId } from "../data/channels";

export type SessionStatus = "active" | "needs_attention" | "resolved";

export interface SessionMessage {
  id: string;
  from: "patient" | "agent" | "system";
  text: string;
  at: string; // ISO timestamp
}

export interface Session {
  id: string;
  patientId: string;
  patientName: string;
  patientInitial: string;
  channel: ChannelId;
  agentSlug: string;
  agentName: string;
  categoryId: string;
  status: SessionStatus;
  lastMessagePreview: string;
  updatedAt: string; // ISO timestamp
  messages: SessionMessage[];
}
