from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.doctor import (
    CreateDoctorRequest,
    UpdateDoctorRequest,
    DoctorResponse,
    CreateDoctorProcedureRequest,
    UpdateDoctorProcedureRequest,
    DoctorProcedureResponse,
    CreateDoctorAvailabilityRequest,
    DoctorAvailabilityResponse,
    DoctorTodayResponse,
)
from src.services.doctors.doctors_services import DoctorsService
from src.services.doctors.doctor_procedures_services import DoctorProceduresService
from src.services.doctors.doctor_availability_services import DoctorAvailabilityService
from src.services.doctors.doctor_dashboard_services import DoctorDashboardService


class DoctorsController:
    def __init__(self):
        self.service = DoctorsService()
        self.procedures = DoctorProceduresService()
        self.availability = DoctorAvailabilityService()
        self.dashboard = DoctorDashboardService()

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

    async def get_my_today(self, db: AsyncSession, user: User) -> DoctorTodayResponse:
        snapshot = await self.dashboard.get_today_snapshot(db, user.practice_id, user.id)
        return DoctorTodayResponse(**snapshot)

    async def update_doctor(
        self, db: AsyncSession, user: User, doctor_id: UUID, data: UpdateDoctorRequest
    ) -> DoctorResponse:
        doctor = await self.service.update_doctor(db, user.practice_id, doctor_id, data)
        return DoctorResponse.model_validate(doctor)

    async def invite_doctor(self, db: AsyncSession, user: User, doctor_id: UUID) -> DoctorResponse:
        doctor = await self.service.invite_doctor(db, user.practice_id, doctor_id)
        return DoctorResponse.model_validate(doctor)

    # --- Doctor <-> Procedure ---

    async def add_procedure(self, db: AsyncSession, user: User, doctor_id: UUID, data: CreateDoctorProcedureRequest) -> DoctorProcedureResponse:
        link = await self.procedures.add_procedure(db, user.practice_id, doctor_id, data)
        return DoctorProcedureResponse.model_validate(link)

    async def list_procedures(self, db: AsyncSession, user: User, doctor_id: UUID) -> list[DoctorProcedureResponse]:
        links = await self.procedures.list_procedures(db, user.practice_id, doctor_id)
        return [DoctorProcedureResponse.model_validate(l) for l in links]

    async def update_procedure(self, db: AsyncSession, user: User, doctor_id: UUID, link_id: UUID, data: UpdateDoctorProcedureRequest) -> DoctorProcedureResponse:
        link = await self.procedures.update_procedure(db, user.practice_id, doctor_id, link_id, data)
        return DoctorProcedureResponse.model_validate(link)

    async def remove_procedure(self, db: AsyncSession, user: User, doctor_id: UUID, link_id: UUID) -> None:
        await self.procedures.remove_procedure(db, user.practice_id, doctor_id, link_id)

    # --- Doctor availability ---

    async def add_availability(self, db: AsyncSession, user: User, doctor_id: UUID, data: CreateDoctorAvailabilityRequest) -> DoctorAvailabilityResponse:
        override = await self.availability.add_override(db, user.practice_id, doctor_id, data)
        return DoctorAvailabilityResponse.model_validate(override)

    async def list_availability(self, db: AsyncSession, user: User, doctor_id: UUID) -> list[DoctorAvailabilityResponse]:
        overrides = await self.availability.list_overrides(db, user.practice_id, doctor_id)
        return [DoctorAvailabilityResponse.model_validate(o) for o in overrides]

    async def remove_availability(self, db: AsyncSession, user: User, doctor_id: UUID, override_id: UUID) -> None:
        await self.availability.remove_override(db, user.practice_id, doctor_id, override_id)
