from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user, require_role
from src.models.user import User, UserRole
from src.schemas.staff_message import CreateStaffMessageRequest, StaffMessageResponse, StaffMessageThreadSummary
from src.controller.staff_messages.staff_message_controllers import StaffMessageController

router = APIRouter(prefix="/staff-messages", tags=["Staff Messages"])
controller = StaffMessageController()


# Must be declared before GET /{staff_user_id} — otherwise FastAPI tries to
# parse "threads" as a UUID and 422s before reaching this handler (same
# ordering gotcha as GET /patients/funnel-summary).
@router.get("/threads", response_model=list[StaffMessageThreadSummary])
async def list_threads(
    user: User = Depends(require_role(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_threads(db, user)


# Self-service alias so a Doctor/Receptionist never needs to know their own
# backend User.id — mirrors GET /doctor-applications/me's existing pattern.
# Also must come before /{staff_user_id} for the same routing-order reason.
@router.get("/me", response_model=list[StaffMessageResponse])
async def list_my_messages(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_messages(db, user, user.id)


@router.post("/me", response_model=StaffMessageResponse)
async def send_my_message(
    data: CreateStaffMessageRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.send_message(db, user, user.id, data)


@router.get("/{staff_user_id}", response_model=list[StaffMessageResponse])
async def list_messages(
    staff_user_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_messages(db, user, staff_user_id)


@router.post("/{staff_user_id}", response_model=StaffMessageResponse)
async def send_message(
    staff_user_id: UUID,
    data: CreateStaffMessageRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.send_message(db, user, staff_user_id, data)
