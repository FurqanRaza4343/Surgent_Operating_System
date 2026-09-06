from __future__ import annotations
from pydantic import BaseModel


class HandleCallResponse(BaseModel):
    response: str
    twiml: str


class ChatMessageRequest(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    response: str


class TranslateRequest(BaseModel):
    text: str
    target_language: str


class TranslateResponse(BaseModel):
    translated_text: str


class SendReminderResponse(BaseModel):
    appointment_id: str
    message_id: str
    sent: bool


class ReceptionistPipeline(BaseModel):
    # Real funnel numbers for the monitor page's booking-pipeline widget —
    # computed from Patient lifecycle stages, live Appointment rows, and the
    # AgentLog/Message records of the auto-follow-up agents.
    qualified_leads: int
    appointments_scheduled: int
    auto_followups_sent: int


class ReceptionistChannelStatus(BaseModel):
    # Mirrors the frontend's data/channels.ts ChannelId values.
    channel: str
    connected: bool
    detail: str


class ReceptionistHealth(BaseModel):
    # No infra telemetry (CPU/memory/docs) exists yet — these are the honest
    # numbers a practice can actually measure today: has the AI done anything,
    # and how much in the last 24h.
    status: str
    last_activity_at: str | None
    sessions_24h: int
    interactions_24h: int


class ReceptionistActivityEntry(BaseModel):
    id: str
    label: str
    channel: str | None
    summary: str | None
    created_at: str


class SystemPromptResponse(BaseModel):
    # The effective prompt actually sent to the LLM on each inbound WhatsApp
    # message (base template + this practice's custom instructions).
    system_prompt: str
    custom_instructions: str
    updated_at: str | None
    updated_by: str | None


class UpdateSystemPromptRequest(BaseModel):
    # Practice-authored instructions appended to the base receptionist prompt.
    # Visible to Owner/Doctor/Receptionist, editable by the Owner only. Send
    # an empty string to clear custom instructions and revert to the base.
    custom_instructions: str


class AIReceptionistOverviewResponse(BaseModel):
    calls_handled: int
    reminders_sent: int
    translations_done: int
    total_interactions: int
    # Real spend computed from AgentLog counts x AgentCosting's real
    # per-session rates — not a fabricated number. $0 with zero activity is
    # a true value, same reasoning as FinanceOverviewResponse.
    estimated_cost_total: float
    estimated_cost_last_30_days: float
    # Monitor-page widgets, real data — replaces the old mock-only
    # BookingPipelineFunnel / SystemHealthCard / OmnichannelHubCard inputs.
    pipeline: ReceptionistPipeline
    channels: list[ReceptionistChannelStatus]
    health: ReceptionistHealth
    recent_activity: list[ReceptionistActivityEntry]
