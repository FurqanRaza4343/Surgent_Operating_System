from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user
from src.models.user import User
from src.schemas.attendance import AttendanceRecordResponse
from src.controller.attendance.attendance_controllers import AttendanceController

router = APIRouter(prefix="/attendance", tags=["Attendance"])
controller = AttendanceController()


@router.post("/check-in", response_model=AttendanceRecordResponse)
async def check_in(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.check_in(db, user)


@router.post("/check-out", response_model=AttendanceRecordResponse)
async def check_out(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.check_out(db, user)


@router.get("/me", response_model=list[AttendanceRecordResponse])
async def list_my_attendance(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_my_attendance(db, user)
