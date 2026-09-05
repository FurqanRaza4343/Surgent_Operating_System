from __future__ import annotations
from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.waitlist_entry import WaitlistEntry, WaitlistEntryStatus
from src.server.exceptions import NotFoundException


class WaitlistService:
    """The front desk's own "call them back" list — separate from the Leads/
    Funnel CRM pipeline (see models/waitlist_entry.py's own docstring)."""

    async def list_active(self, db: AsyncSession, practice_id: UUID) -> list[WaitlistEntry]:
        result = await db.execute(
            select(WaitlistEntry)
            .where(WaitlistEntry.practice_id == practice_id, WaitlistEntry.status == WaitlistEntryStatus.WAITING)
            .order_by(WaitlistEntry.created_at.asc())
        )
        return list(result.scalars().all())

    async def add(
        self,
        db: AsyncSession,
        practice_id: UUID,
        patient_id: UUID | None,
        patient_name: str,
        phone: str | None,
        doctor_id: UUID | None,
        requested_date: date | None,
        notes: str | None,
    ) -> WaitlistEntry:
        entry = WaitlistEntry(
            practice_id=practice_id,
            patient_id=patient_id,
            patient_name=patient_name,
            phone=phone,
            doctor_id=doctor_id,
            requested_date=requested_date,
            notes=notes,
        )
        db.add(entry)
        await db.flush()
        await db.refresh(entry)
        return entry

    async def _get(self, db: AsyncSession, practice_id: UUID, entry_id: UUID) -> WaitlistEntry:
        result = await db.execute(
            select(WaitlistEntry).where(WaitlistEntry.id == entry_id, WaitlistEntry.practice_id == practice_id)
        )
        entry = result.scalar_one_or_none()
        if entry is None:
            raise NotFoundException("Waitlist entry not found")
        return entry

    async def fulfill(self, db: AsyncSession, practice_id: UUID, entry_id: UUID) -> WaitlistEntry:
        entry = await self._get(db, practice_id, entry_id)
        entry.status = WaitlistEntryStatus.FULFILLED
        await db.flush()
        await db.refresh(entry)
        return entry

    async def cancel(self, db: AsyncSession, practice_id: UUID, entry_id: UUID) -> WaitlistEntry:
        entry = await self._get(db, practice_id, entry_id)
        entry.status = WaitlistEntryStatus.CANCELLED
        await db.flush()
        await db.refresh(entry)
        return entry
