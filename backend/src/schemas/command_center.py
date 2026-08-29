from __future__ import annotations
from pydantic import BaseModel
from typing import Literal
from uuid import UUID
from datetime import datetime


class AskCommandCenterRequest(BaseModel):
    question: str
    # Omit to start a new session; pass an existing one to continue that
    # conversation's history (see CommandCenterService.ask).
    session_id: UUID | None = None


class CommandCenterStep(BaseModel):
    category_id: str
    category_label: str
    status: Literal["consulted", "locked"]
    summary: str


class AskCommandCenterResponse(BaseModel):
    session_id: UUID
    steps: list[CommandCenterStep]
    answer: str


class CommandCenterMessage(BaseModel):
    role: Literal["staff", "agent"]
    content: str
    steps: list[CommandCenterStep] = []
    created_at: datetime


class CommandCenterSessionSummary(BaseModel):
    id: UUID
    title: str
    updated_at: datetime


class CommandCenterSessionDetail(BaseModel):
    id: UUID
    title: str
    messages: list[CommandCenterMessage]
