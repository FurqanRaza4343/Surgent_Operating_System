from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user
from src.models.user import User
from src.schemas.notification import NotificationResponse, UnreadCountResponse
from src.services.notifications.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])
service = NotificationService()


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    unread_only: bool = Query(default=False),
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_for_user(db, user.practice_id, user.id, unread_only)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    count = await service.unread_count(db, user.practice_id, user.id)
    return UnreadCountResponse(count=count)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(
    notification_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.mark_read(db, user.practice_id, user.id, notification_id)


@router.post("/read-all")
async def mark_all_read(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    count = await service.mark_all_read(db, user.practice_id, user.id)
    return {"marked_read": count}
