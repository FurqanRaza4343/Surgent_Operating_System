from __future__ import annotations
from uuid import UUID

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.patient import Patient
from src.schemas.patient import CreatePatientRequest
from src.server.exceptions import NotFoundException


class PatientsService:
    """Backs the dashboard's Patients page (frontend/src/app/dashboard/patients/) —
    every method here is practice-scoped; callers must always pass the
    requesting user's own practice_id (see server/dependencies.py:
    get_current_practice_user), never trust one from the client. Mirrors
    services/conversations/conversations_services.py's shape."""

    async def create_patient(self, db: AsyncSession, practice_id: UUID, data: CreatePatientRequest) -> Patient:
        patient = Patient(
            practice_id=practice_id,
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            phone=data.phone,
            date_of_birth=data.date_of_birth,
            chief_complaint=data.chief_complaint,
            needs_surgery=data.needs_surgery,
            ai_agent_assigned=data.ai_agent_assigned,
            agent_status="active" if data.ai_agent_assigned else "inactive",
        )
        db.add(patient)
        await db.flush()
        await db.refresh(patient)
        return patient

    async def list_patients(self, db: AsyncSession, practice_id: UUID) -> list[Patient]:
        query = select(Patient).where(Patient.practice_id == practice_id).order_by(desc(Patient.created_at))
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> Patient:
        query = select(Patient).where(Patient.id == patient_id, Patient.practice_id == practice_id)
        result = await db.execute(query)
        patient = result.scalar_one_or_none()
        if patient is None:
            raise NotFoundException("Patient not found")
        return patient
