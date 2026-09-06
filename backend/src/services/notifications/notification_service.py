from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, desc, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notification import Notification
from src.server.exceptions import NotFoundException


class NotificationService:
    """Unified event-driven notification interface. The existing outbound
    channels — SMS/WhatsApp (MessagingService) and Email (EmailService) —
    already work and stay exactly as they are; this adds the in-app layer
    those two don't cover, and gives every trigger point one place to call
    instead of hand-rolling notification logic per feature.

    Real trigger points (each a small addition at its existing call site,
    not new business logic): invoice mark-paid (InvoiceService.update_invoice),
    consent document created (ConsentService.create_document). More can be
    added the same way — appointment reminders already have their own real
    path via ai_receptionist/reminder_service.py and aren't duplicated here.
    """

    async def notify(
        self,
        db: AsyncSession,
        practice_id: UUID,
        event_type: str,
        title: str,
        body: str | None = None,
        user_id: UUID | None = None,
        resource_type: str | None = None,
        resource_id: UUID | None = None,
    ) -> Notification:
        notification = Notification(
            practice_id=practice_id,
            user_id=user_id,
            event_type=event_type,
            title=title,
            body=body,
            resource_type=resource_type,
            resource_id=resource_id,
        )
        db.add(notification)
        await db.flush()
        return notification

    async def list_for_user(
        self, db: AsyncSession, practice_id: UUID, user_id: UUID, unread_only: bool = False, limit: int = 50
    ) -> list[Notification]:
        # Practice-wide (user_id IS NULL) + anything targeted at this user
        # specifically, newest first.
        query = select(Notification).where(
            Notification.practice_id == practice_id,
            or_(Notification.user_id.is_(None), Notification.user_id == user_id),
        )
        if unread_only:
            query = query.where(Notification.read_at.is_(None))
        query = query.order_by(desc(Notification.created_at)).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def unread_count(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> int:
        result = await db.execute(
            select(func.count(Notification.id)).where(
                Notification.practice_id == practice_id,
                or_(Notification.user_id.is_(None), Notification.user_id == user_id),
                Notification.read_at.is_(None),
            )
        )
        return result.scalar_one()

    async def mark_read(self, db: AsyncSession, practice_id: UUID, user_id: UUID, notification_id: UUID) -> Notification:
        result = await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.practice_id == practice_id,
                or_(Notification.user_id.is_(None), Notification.user_id == user_id),
            )
        )
        notification = result.scalar_one_or_none()
        if notification is None:
            raise NotFoundException("Notification not found")
        if notification.read_at is None:
            notification.read_at = datetime.now(timezone.utc)
            await db.flush()
        return notification

    async def mark_all_read(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> int:
        unread = await self.list_for_user(db, practice_id, user_id, unread_only=True, limit=1000)
        now = datetime.now(timezone.utc)
        for n in unread:
            n.read_at = now
        await db.flush()
        return len(unread)
