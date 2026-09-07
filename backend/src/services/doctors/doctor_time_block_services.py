from __future__ import annotations
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.doctor import Doctor, DoctorTimeBlock
from src.schemas.doctor import CreateDoctorTimeBlockRequest
from src.server.exceptions import NotFoundException, AppException


class DoctorTimeBlockService:
    """A doctor's own personal calendar blocks — every method is scoped to
    the caller's own linked Doctor row (resolved from user_id, never a
    client-supplied doctor_id), same self-service pattern as
    DoctorDashboardService. No cross-doctor access — a doctor manages only
    their own blocks."""

    async def _resolve_doctor(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> Doctor:
        result = await db.execute(select(Doctor).where(Doctor.practice_id == practice_id, Doctor.user_id == user_id))
        doctor = result.scalar_one_or_none()
        if doctor is None:
            raise NotFoundException("No doctor profile linked to this account")
        return doctor

    async def create_block(
        self, db: AsyncSession, practice_id: UUID, user_id: UUID, data: CreateDoctorTimeBlockRequest
    ) -> DoctorTimeBlock:
        if data.end_time <= data.start_time:
            raise AppException("Block end time must be after start time")
        doctor = await self._resolve_doctor(db, practice_id, user_id)
        block = DoctorTimeBlock(
            practice_id=practice_id,
            doctor_id=doctor.id,
            title=data.title,
            note=data.note,
            start_time=data.start_time,
            end_time=data.end_time,
        )
        db.add(block)
        await db.flush()
        await db.refresh(block)
        return block

    async def list_blocks(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> list[DoctorTimeBlock]:
        doctor = await self._resolve_doctor(db, practice_id, user_id)
        result = await db.execute(
            select(DoctorTimeBlock)
            .where(DoctorTimeBlock.doctor_id == doctor.id)
            .order_by(DoctorTimeBlock.start_time)
        )
        return list(result.scalars().all())

    async def delete_block(self, db: AsyncSession, practice_id: UUID, user_id: UUID, block_id: UUID) -> None:
        doctor = await self._resolve_doctor(db, practice_id, user_id)
        result = await db.execute(
            select(DoctorTimeBlock).where(DoctorTimeBlock.id == block_id, DoctorTimeBlock.doctor_id == doctor.id)
        )
        block = result.scalar_one_or_none()
        if block is None:
            raise NotFoundException("Time block not found")
        await db.delete(block)
        await db.flush()
