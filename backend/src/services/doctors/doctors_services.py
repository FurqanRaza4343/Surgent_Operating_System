from __future__ import annotations
from uuid import UUID

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.doctor import Doctor
from src.schemas.doctor import CreateDoctorRequest, UpdateDoctorRequest
from src.server.exceptions import NotFoundException, AppException
from src.services.clerk.clerk_service import ClerkService

settings = get_settings()


class DoctorsService:
    """Backs the dashboard's Doctors page (frontend/src/app/dashboard/doctors/) —
    every method here is practice-scoped; callers must always pass the
    requesting user's own practice_id (see server/dependencies.py:
    get_current_practice_user), never trust one from the client. Mirrors
    services/patients/patients_services.py's shape."""

    async def create_doctor(self, db: AsyncSession, practice_id: UUID, data: CreateDoctorRequest) -> Doctor:
        doctor = Doctor(
            practice_id=practice_id,
            name=data.name,
            email=data.email,
            phone=data.phone,
            specialty=data.specialty,
            license_number=data.license_number,
            bio=data.bio,
            capabilities=data.capabilities,
        )
        db.add(doctor)
        await db.flush()
        await db.refresh(doctor)
        return doctor

    async def list_doctors(self, db: AsyncSession, practice_id: UUID) -> list[Doctor]:
        query = select(Doctor).where(Doctor.practice_id == practice_id).order_by(desc(Doctor.created_at))
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_doctor(self, db: AsyncSession, practice_id: UUID, doctor_id: UUID) -> Doctor:
        query = select(Doctor).where(Doctor.id == doctor_id, Doctor.practice_id == practice_id)
        result = await db.execute(query)
        doctor = result.scalar_one_or_none()
        if doctor is None:
            raise NotFoundException("Doctor not found")
        return doctor

    async def get_my_doctor(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> Doctor:
        query = select(Doctor).where(Doctor.practice_id == practice_id, Doctor.user_id == user_id)
        result = await db.execute(query)
        doctor = result.scalar_one_or_none()
        if doctor is None:
            raise NotFoundException("No doctor profile linked to this account")
        return doctor

    async def update_doctor(
        self, db: AsyncSession, practice_id: UUID, doctor_id: UUID, data: UpdateDoctorRequest
    ) -> Doctor:
        doctor = await self.get_doctor(db, practice_id, doctor_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(doctor, field, value)
        await db.flush()
        await db.refresh(doctor)
        return doctor

    async def invite_doctor(self, db: AsyncSession, practice_id: UUID, doctor_id: UUID) -> Doctor:
        doctor = await self.get_doctor(db, practice_id, doctor_id)
        clerk = ClerkService()
        result = await clerk.invite_user(
            email=doctor.email,
            redirect_url=f"{settings.frontend_url}/doctor/sign-up",
            public_metadata={
                "invite_type": "doctor",
                "doctor_id": str(doctor.id),
                "practice_id": str(doctor.practice_id),
            },
        )
        if result is None:
            raise AppException("Failed to send invitation via Clerk")
        return doctor
