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
