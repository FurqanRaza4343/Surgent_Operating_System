from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.doctor import CreateDoctorRequest, UpdateDoctorRequest, DoctorResponse
from src.services.doctors.doctors_services import DoctorsService


class DoctorsController:
    def __init__(self):
        self.service = DoctorsService()

    async def create_doctor(self, db: AsyncSession, user: User, data: CreateDoctorRequest) -> DoctorResponse:
        doctor = await self.service.create_doctor(db, user.practice_id, data)
        return DoctorResponse.model_validate(doctor)

    async def list_doctors(self, db: AsyncSession, user: User) -> list[DoctorResponse]:
        doctors = await self.service.list_doctors(db, user.practice_id)
        return [DoctorResponse.model_validate(d) for d in doctors]

    async def get_doctor(self, db: AsyncSession, user: User, doctor_id: UUID) -> DoctorResponse:
        doctor = await self.service.get_doctor(db, user.practice_id, doctor_id)
        return DoctorResponse.model_validate(doctor)

    async def get_my_doctor(self, db: AsyncSession, user: User) -> DoctorResponse:
        doctor = await self.service.get_my_doctor(db, user.practice_id, user.id)
        return DoctorResponse.model_validate(doctor)

    async def update_doctor(
        self, db: AsyncSession, user: User, doctor_id: UUID, data: UpdateDoctorRequest
    ) -> DoctorResponse:
        doctor = await self.service.update_doctor(db, user.practice_id, doctor_id, data)
        return DoctorResponse.model_validate(doctor)

    async def invite_doctor(self, db: AsyncSession, user: User, doctor_id: UUID) -> DoctorResponse:
        doctor = await self.service.invite_doctor(db, user.practice_id, doctor_id)
        return DoctorResponse.model_validate(doctor)
