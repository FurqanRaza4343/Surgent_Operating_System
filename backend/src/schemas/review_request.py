from __future__ import annotations
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class ReviewRequestResponse(BaseModel):
    id: UUID
    practice_id: UUID
    patient_id: UUID
    appointment_id: UUID | None
    channel: str
    sent_at: datetime
    review_link_clicked_at: datetime | None

    model_config = {"from_attributes": True}
