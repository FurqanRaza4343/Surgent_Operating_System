from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.staff_message import StaffMessage
from src.models.user import User, UserRole
from src.schemas.staff_message import StaffMessageThreadSummary
from src.server.exceptions import NotFoundException, ForbiddenException


class StaffMessageService:
    """A simple two-way message thread per (practice, staff member) — Owner
    on one side, that Doctor or Receptionist on the other. Every method is
    practice-scoped; `_authorize` is the single access-control chokepoint:
    Owner can reach any staff member's thread, a staff member can only reach
    their own."""

    def _authorize(self, user: User, staff_user_id: UUID) -> None:
        if user.role == UserRole.OWNER:
            return
        if user.id != staff_user_id:
            raise ForbiddenException("You can only view your own conversation with the Owner.")

    async def _resolve_staff_member(self, db: AsyncSession, practice_id: UUID, staff_user_id: UUID) -> User:
        result = await db.execute(
            select(User).where(
                User.id == staff_user_id, User.practice_id == practice_id, User.role != UserRole.OWNER
            )
        )
        staff = result.scalar_one_or_none()
        if staff is None:
            raise NotFoundException("Staff member not found")
        return staff

    async def list_messages(self, db: AsyncSession, practice_id: UUID, user: User, staff_user_id: UUID) -> list[StaffMessage]:
        self._authorize(user, staff_user_id)
        await self._resolve_staff_member(db, practice_id, staff_user_id)

        query = (
            select(StaffMessage)
            .options(selectinload(StaffMessage.sender))
            .where(StaffMessage.practice_id == practice_id, StaffMessage.staff_user_id == staff_user_id)
            .order_by(StaffMessage.created_at.asc())
        )
        result = await db.execute(query)
        messages = list(result.scalars().all())
        for m in messages:
            m.sender_name = m.sender.name
            m.sender_role = m.sender.role.value
        return messages

    async def send_message(
        self, db: AsyncSession, practice_id: UUID, user: User, staff_user_id: UUID, body: str
    ) -> StaffMessage:
        self._authorize(user, staff_user_id)
        await self._resolve_staff_member(db, practice_id, staff_user_id)

        message = StaffMessage(practice_id=practice_id, staff_user_id=staff_user_id, sender_id=user.id, body=body)
        db.add(message)
        await db.flush()
        await db.refresh(message)
        message.sender_name = user.name
        message.sender_role = user.role.value
        return message

    async def list_threads(self, db: AsyncSession, practice_id: UUID) -> list[StaffMessageThreadSummary]:
        # Owner-only — one row per active Doctor/Receptionist, with their
        # latest message (if any) so the Owner can see who's waiting on a
        # reply without opening every thread.
        staff_result = await db.execute(
            select(User).where(User.practice_id == practice_id, User.role != UserRole.OWNER, User.is_active == True)  # noqa: E712
        )
        staff_members = list(staff_result.scalars().all())
        if not staff_members:
            return []

        staff_ids = [s.id for s in staff_members]
        counts_result = await db.execute(
            select(StaffMessage.staff_user_id, func.count())
            .where(StaffMessage.practice_id == practice_id, StaffMessage.staff_user_id.in_(staff_ids))
            .group_by(StaffMessage.staff_user_id)
        )
        counts = dict(counts_result.all())

        last_message_result = await db.execute(
            select(StaffMessage)
            .where(StaffMessage.practice_id == practice_id, StaffMessage.staff_user_id.in_(staff_ids))
            .order_by(StaffMessage.staff_user_id, StaffMessage.created_at.desc())
        )
        last_by_staff: dict[UUID, StaffMessage] = {}
        for m in last_message_result.scalars().all():
            if m.staff_user_id not in last_by_staff:
                last_by_staff[m.staff_user_id] = m

        summaries = []
        for staff in staff_members:
            last = last_by_staff.get(staff.id)
            summaries.append(
                StaffMessageThreadSummary(
                    staff_user_id=staff.id,
                    staff_name=staff.name,
                    staff_role=staff.role.value,
                    last_message_preview=(last.body[:120] if last else None),
                    last_message_at=(last.created_at if last else None),
                    message_count=counts.get(staff.id, 0),
                )
            )
        # Most recently active thread first; staff with no messages yet sort
        # last (sorting directly on `last_message_at or staff_name` would mix
        # datetime and str keys and raise on comparison).
        summaries.sort(
            key=lambda s: (s.last_message_at is not None, s.last_message_at or datetime.min.replace(tzinfo=timezone.utc)),
            reverse=True,
        )
        return summaries
