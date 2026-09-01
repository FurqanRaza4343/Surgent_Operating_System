from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class AttendanceRecordResponse(BaseModel):
    id: UUID
    practice_id: UUID
    user_id: UUID
    doctor_id: UUID | None
    check_in_at: datetime
    check_out_at: datetime | None

    model_config = {"from_attributes": True}
