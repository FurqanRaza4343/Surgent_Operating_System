from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.practice import Practice
from src.schemas.patient import CreatePatientRequest, PatientResponse
from src.server.exceptions import AppException
from src.services.patients.patients_services import PatientsService

router = APIRouter(prefix="/public", tags=["Public"])
service = PatientsService()

# Public lead intake — no practice-member auth by design. This is the
# website's "Book a consultation" form (frontend/src/components/
# book-consultation/BookConsultationSection.tsx), the same way the patient
# portal's POST /{token}/appointments runs unauthenticated: the form is
# itself the funnel entry, and the resulting lead lands in the Front Desk /
# Funnel for an Owner or Receptionist to pick up. Demo hardening notes (rate
# limiting, bot protection, duplicate-email swallowing) apply to both.

# Front-desk entry agent — the intake conversation a fresh website lead would
# land in (mirrors classifyPatient.ts's receptionist fallback slug).
FRONT_DESK_AGENT_SLUG = "receptionist"


class ConsultationRequest(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None
    chief_complaint: str
    needs_surgery: bool = False


@router.post("/consultation-request", response_model=PatientResponse)
async def create_consultation_request(
    data: ConsultationRequest,
    db: AsyncSession = Depends(get_db),
):
    # No auth means no user.practice_id — resolve the practice directly. This
    # demo runs a single practice, so "the first (oldest) one" is the primary;
    # a multi-practice deployment needs a proper routing key here instead.
    result = await db.execute(select(Practice).order_by(Practice.created_at))
    practice = result.scalars().first()
    if practice is None:
        raise AppException("No practice is configured yet — check back soon.", status_code=400)

    parts = data.full_name.strip().split(maxsplit=1)
    first_name = parts[0]
    last_name = parts[1].strip() if len(parts) > 1 else ""

    patient = await service.create_patient(
        db,
        practice.id,
        CreatePatientRequest(
            first_name=first_name,
            last_name=last_name,
            email=data.email,
            phone=data.phone,
            chief_complaint=data.chief_complaint.strip(),
            needs_surgery=data.needs_surgery,
            ai_agent_assigned=FRONT_DESK_AGENT_SLUG,
            source="Website",
        ),
    )
    await db.commit()
    return PatientResponse.model_validate(patient)