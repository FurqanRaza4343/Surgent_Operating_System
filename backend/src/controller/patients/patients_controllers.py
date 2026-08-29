from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.patient import CreatePatientRequest, PatientResponse
from src.services.patients.patients_services import PatientsService


class PatientsController:
    def __init__(self):
        self.service = PatientsService()

    async def create_patient(self, db: AsyncSession, user: User, data: CreatePatientRequest) -> PatientResponse:
        patient = await self.service.create_patient(db, user.practice_id, data)
        return PatientResponse.model_validate(patient)

    async def list_patients(self, db: AsyncSession, user: User) -> list[PatientResponse]:
        patients = await self.service.list_patients(db, user.practice_id)
        return [PatientResponse.model_validate(p) for p in patients]

    async def get_patient(self, db: AsyncSession, user: User, patient_id: UUID) -> PatientResponse:
        patient = await self.service.get_patient(db, user.practice_id, patient_id)
        return PatientResponse.model_validate(patient)
