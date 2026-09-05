from __future__ import annotations
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.doctor import Doctor, DoctorAvailability
from src.schemas.doctor import CreateDoctorAvailabilityRequest
from src.server.exceptions import NotFoundException


class DoctorAvailabilityService:
    """One-off schedule overrides on top of Doctor.working_hours — a
    blocked day or an extra clinic outside the recurring pattern."""

    async def _resolve_doctor(self, db: AsyncSession, practice_id: UUID, doctor_id: UUID) -> Doctor:
        result = await db.execute(select(Doctor).where(Doctor.id == doctor_id, Doctor.practice_id == practice_id))
        doctor = result.scalar_one_or_none()
        if doctor is None:
            raise NotFoundException("Doctor not found")
        return doctor

    async def add_override(
        self, db: AsyncSession, practice_id: UUID, doctor_id: UUID, data: CreateDoctorAvailabilityRequest
    ) -> DoctorAvailability:
        await self._resolve_doctor(db, practice_id, doctor_id)
        override = DoctorAvailability(
            doctor_id=doctor_id,
            date=data.date,
            is_available=data.is_available,
            hours=data.hours,
            reason=data.reason,
        )
        db.add(override)
        await db.flush()
        await db.refresh(override)
        return override

    async def list_overrides(self, db: AsyncSession, practice_id: UUID, doctor_id: UUID) -> list[DoctorAvailability]:
        await self._resolve_doctor(db, practice_id, doctor_id)
        result = await db.execute(
            select(DoctorAvailability).where(DoctorAvailability.doctor_id == doctor_id).order_by(DoctorAvailability.date)
        )
        return list(result.scalars().all())

    async def remove_override(self, db: AsyncSession, practice_id: UUID, doctor_id: UUID, override_id: UUID) -> None:
        await self._resolve_doctor(db, practice_id, doctor_id)
        result = await db.execute(
            select(DoctorAvailability).where(DoctorAvailability.id == override_id, DoctorAvailability.doctor_id == doctor_id)
        )
        override = result.scalar_one_or_none()
        if override is None:
            raise NotFoundException("Availability override not found")
        await db.delete(override)
        await db.flush()
