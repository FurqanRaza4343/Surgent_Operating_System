from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user, require_role
from src.models.user import User, UserRole
from src.schemas.ai_receptionist import (
    ChatMessageRequest,
    ChatMessageResponse,
    HandleCallResponse,
    TranslateRequest,
    TranslateResponse,
    SendReminderResponse,
    AIReceptionistOverviewResponse,
)
from src.controller.ai_receptionist.ai_receptionist_controllers import AIReceptionistController

router = APIRouter(prefix="/ai-receptionist", tags=["AI Receptionist"])
controller = AIReceptionistController()


@router.post("/handle-call", response_model=HandleCallResponse)
async def handle_call(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.handle_call(db, user)


@router.post("/message", response_model=ChatMessageResponse)
async def process_message(
    data: ChatMessageRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.process_message(db, user, data.message)


@router.post("/translate", response_model=TranslateResponse)
async def translate(
    data: TranslateRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.translate(db, user, data.text, data.target_language)


@router.post("/appointments/{appointment_id}/reminder", response_model=SendReminderResponse)
async def send_reminder(
    appointment_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.send_reminder(db, user, appointment_id)


# Owner always sees this; Doctor sees it too if granted the existing
# "view_ai_receptionist" permission (frontend-gated) — Receptionist isn't
# in this list since monitoring the AI that partially covers their own job
# isn't something the roadmap ever asked for.
@router.get("/overview", response_model=AIReceptionistOverviewResponse)
async def get_overview(
    user: User = Depends(require_role(UserRole.OWNER, UserRole.DOCTOR)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_overview(db, user)
