from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import require_role
from src.models.user import User, UserRole
from src.schemas.staff import InviteStaffRequest, InviteStaffResponse, UpdateStaffRequest, StaffResponse
from src.controller.staff.staff_controllers import StaffController

router = APIRouter(prefix="/staff", tags=["Staff"])
controller = StaffController()


@router.post("", response_model=InviteStaffResponse)
async def invite_staff(
    data: InviteStaffRequest,
    user: User = Depends(require_role(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.invite_staff(db, user, data)


@router.get("", response_model=list[StaffResponse])
async def list_staff(
    user: User = Depends(require_role(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_staff(db, user)


@router.patch("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: UUID,
    data: UpdateStaffRequest,
    user: User = Depends(require_role(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db),
):
    return await controller.update_staff(db, user, staff_id, data)
