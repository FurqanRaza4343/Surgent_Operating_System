from __future__ import annotations
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.models.doctor import Doctor
from src.schemas.waitlist import WaitlistEntryResponse, CreateWaitlistEntryRequest
from src.services.waitlist.waitlist_services import WaitlistService


class WaitlistController:
    def __init__(self):
        self.service = WaitlistService()

    async def _to_response(self, db: AsyncSession, entry) -> WaitlistEntryResponse:
        doctor_name = None
        if entry.doctor_id:
            result = await db.execute(select(Doctor).where(Doctor.id == entry.doctor_id))
            doctor = result.scalar_one_or_none()
            doctor_name = doctor.name if doctor else None
        data = WaitlistEntryResponse.model_validate(entry).model_dump()
        data["doctor_name"] = doctor_name
        return WaitlistEntryResponse(**data)

    async def list_active(self, db: AsyncSession, user: User) -> list[WaitlistEntryResponse]:
        entries = await self.service.list_active(db, user.practice_id)
        return [await self._to_response(db, e) for e in entries]

    async def add(self, db: AsyncSession, user: User, data: CreateWaitlistEntryRequest) -> WaitlistEntryResponse:
        entry = await self.service.add(
            db,
            user.practice_id,
            data.patient_id,
            data.patient_name,
            data.phone,
            data.doctor_id,
            data.requested_date,
            data.notes,
        )
        return await self._to_response(db, entry)

    async def fulfill(self, db: AsyncSession, user: User, entry_id: UUID) -> WaitlistEntryResponse:
        entry = await self.service.fulfill(db, user.practice_id, entry_id)
        return await self._to_response(db, entry)

    async def cancel(self, db: AsyncSession, user: User, entry_id: UUID) -> WaitlistEntryResponse:
        entry = await self.service.cancel(db, user.practice_id, entry_id)
        return await self._to_response(db, entry)
