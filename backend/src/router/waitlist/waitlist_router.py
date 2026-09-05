from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user
from src.models.user import User
from src.schemas.waitlist import WaitlistEntryResponse, CreateWaitlistEntryRequest
from src.controller.waitlist.waitlist_controllers import WaitlistController

router = APIRouter(prefix="/waitlist", tags=["Waitlist"])
controller = WaitlistController()


@router.get("", response_model=list[WaitlistEntryResponse])
async def list_active(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_active(db, user)


@router.post("", response_model=WaitlistEntryResponse)
async def add(
    data: CreateWaitlistEntryRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.add(db, user, data)


@router.patch("/{entry_id}/fulfill", response_model=WaitlistEntryResponse)
async def fulfill(
    entry_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.fulfill(db, user, entry_id)


@router.patch("/{entry_id}/cancel", response_model=WaitlistEntryResponse)
async def cancel(
    entry_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.cancel(db, user, entry_id)
