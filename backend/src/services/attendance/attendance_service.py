from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.attendance_record import AttendanceRecord
from src.models.doctor import Doctor
from src.server.exceptions import NotFoundException, AppException


class AttendanceService:
    """Simple daily check-in/check-out for every practice user — doctors link
    via their Doctor row, staff receptionists check in as themselves. Practice-
    scoped; callers must always pass the requesting user's own practice_id.
    A user can check in at most once per calendar day (UTC) — once marked,
    it's locked for that day and the next check-in is only possible the
    following day."""

    def _day_start(self, now: datetime) -> datetime:
        return datetime(now.year, now.month, now.day, tzinfo=now.tzinfo)

    async def check_in(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> AttendanceRecord:
        now = datetime.now(timezone.utc)
        day_start = self._day_start(now)

        # Once-per-day: any check-in record for this user today (whether they
        # checked out or not) blocks a second one until the next day.
        result = await db.execute(
            select(AttendanceRecord).where(
                AttendanceRecord.practice_id == practice_id,
                AttendanceRecord.user_id == user_id,
                AttendanceRecord.check_in_at >= day_start,
            )
        )
        if result.scalars().first() is not None:
            raise AppException("Already checked in today — next check-in is tomorrow")

        doctor_result = await db.execute(
            select(Doctor).where(Doctor.practice_id == practice_id, Doctor.user_id == user_id)
        )
        doctor = doctor_result.scalar_one_or_none()

        record = AttendanceRecord(
            practice_id=practice_id,
            user_id=user_id,
            doctor_id=doctor.id if doctor is not None else None,
        )
        db.add(record)
        await db.flush()
        await db.refresh(record)
        return record

    async def check_out(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> AttendanceRecord:
        doctor_result = await db.execute(
            select(Doctor).where(Doctor.practice_id == practice_id, Doctor.user_id == user_id)
        )
        doctor = doctor_result.scalar_one_or_none()

        subject_where = [AttendanceRecord.user_id == user_id]
        if doctor is not None:
            subject_where.append(AttendanceRecord.doctor_id == doctor.id)
        result = await db.execute(
            select(AttendanceRecord)
            .where(AttendanceRecord.check_out_at.is_(None), or_(*subject_where))
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
        result = await db.execute(
            select(AttendanceRecord)
            .where(AttendanceRecord.practice_id == practice_id, AttendanceRecord.user_id == user_id)
            .order_by(desc(AttendanceRecord.check_in_at))
            .limit(limit)
        )
        return list(result.scalars().all())
