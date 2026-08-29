from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.attendance_record import AttendanceRecord
from src.models.doctor import Doctor
from src.server.exceptions import NotFoundException, AppException


class AttendanceService:
    """Simple daily check-in/check-out for doctors. Practice-scoped; callers
    must always pass the requesting user's own practice_id."""

    async def _get_doctor_for_user(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> Doctor:
        result = await db.execute(select(Doctor).where(Doctor.practice_id == practice_id, Doctor.user_id == user_id))
        doctor = result.scalar_one_or_none()
        if doctor is None:
            raise NotFoundException("No doctor profile linked to this account")
        return doctor

    async def check_in(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> AttendanceRecord:
        doctor = await self._get_doctor_for_user(db, practice_id, user_id)

        result = await db.execute(
            select(AttendanceRecord).where(
                AttendanceRecord.doctor_id == doctor.id, AttendanceRecord.check_out_at.is_(None)
            )
        )
        if result.scalar_one_or_none() is not None:
            raise AppException("Already checked in — check out first")

        record = AttendanceRecord(practice_id=practice_id, doctor_id=doctor.id)
        db.add(record)
        await db.flush()
        await db.refresh(record)
        return record

    async def check_out(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> AttendanceRecord:
        doctor = await self._get_doctor_for_user(db, practice_id, user_id)

        result = await db.execute(
            select(AttendanceRecord)
            .where(AttendanceRecord.doctor_id == doctor.id, AttendanceRecord.check_out_at.is_(None))
            .order_by(desc(AttendanceRecord.check_in_at))
        )
        record = result.scalars().first()
        if record is None:
            raise AppException("Not checked in")

        record.check_out_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(record)
        return record

    async def list_my_attendance(
        self, db: AsyncSession, practice_id: UUID, user_id: UUID, limit: int = 30
    ) -> list[AttendanceRecord]:
        doctor = await self._get_doctor_for_user(db, practice_id, user_id)
        result = await db.execute(
            select(AttendanceRecord)
            .where(AttendanceRecord.doctor_id == doctor.id)
            .order_by(desc(AttendanceRecord.check_in_at))
            .limit(limit)
        )
        return list(result.scalars().all())
