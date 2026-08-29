from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.attendance import AttendanceRecordResponse
from src.services.attendance.attendance_service import AttendanceService


class AttendanceController:
    def __init__(self):
        self.service = AttendanceService()

    async def check_in(self, db: AsyncSession, user: User) -> AttendanceRecordResponse:
        record = await self.service.check_in(db, user.practice_id, user.id)
        return AttendanceRecordResponse.model_validate(record)

    async def check_out(self, db: AsyncSession, user: User) -> AttendanceRecordResponse:
        record = await self.service.check_out(db, user.practice_id, user.id)
        return AttendanceRecordResponse.model_validate(record)

    async def list_my_attendance(self, db: AsyncSession, user: User) -> list[AttendanceRecordResponse]:
        records = await self.service.list_my_attendance(db, user.practice_id, user.id)
        return [AttendanceRecordResponse.model_validate(r) for r in records]
