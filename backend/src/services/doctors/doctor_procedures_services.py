from __future__ import annotations
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.doctor import Doctor, DoctorProcedure
from src.models.procedure import Procedure
from src.schemas.doctor import CreateDoctorProcedureRequest, UpdateDoctorProcedureRequest
from src.server.exceptions import NotFoundException, AppException


class DoctorProceduresService:
    """The real Doctor<->Procedure link — what a doctor actually performs,
    and what they charge for it. Every method is practice-scoped via the
    parent Doctor row (DoctorProcedure itself carries no practice_id)."""

    async def _resolve_doctor(self, db: AsyncSession, practice_id: UUID, doctor_id: UUID) -> Doctor:
        result = await db.execute(select(Doctor).where(Doctor.id == doctor_id, Doctor.practice_id == practice_id))
        doctor = result.scalar_one_or_none()
        if doctor is None:
            raise NotFoundException("Doctor not found")
        return doctor

    async def add_procedure(
        self, db: AsyncSession, practice_id: UUID, doctor_id: UUID, data: CreateDoctorProcedureRequest
    ) -> DoctorProcedure:
        await self._resolve_doctor(db, practice_id, doctor_id)

        procedure_result = await db.execute(
            select(Procedure).where(Procedure.id == data.procedure_id, Procedure.practice_id == practice_id)
        )
        if procedure_result.scalar_one_or_none() is None:
            raise NotFoundException("Procedure not found")

        existing = await db.execute(
            select(DoctorProcedure).where(
                DoctorProcedure.doctor_id == doctor_id, DoctorProcedure.procedure_id == data.procedure_id
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise AppException("This doctor already has this procedure linked — edit it instead.")

        link = DoctorProcedure(
            doctor_id=doctor_id,
            procedure_id=data.procedure_id,
            consultation_fee=data.consultation_fee,
            surgery_fee=data.surgery_fee,
        )
        db.add(link)
        await db.flush()
        await db.refresh(link)
        return link

    async def list_procedures(self, db: AsyncSession, practice_id: UUID, doctor_id: UUID) -> list[DoctorProcedure]:
        await self._resolve_doctor(db, practice_id, doctor_id)
        result = await db.execute(select(DoctorProcedure).where(DoctorProcedure.doctor_id == doctor_id))
        return list(result.scalars().all())

    async def update_procedure(
        self, db: AsyncSession, practice_id: UUID, doctor_id: UUID, link_id: UUID, data: UpdateDoctorProcedureRequest
    ) -> DoctorProcedure:
        await self._resolve_doctor(db, practice_id, doctor_id)
        result = await db.execute(
            select(DoctorProcedure).where(DoctorProcedure.id == link_id, DoctorProcedure.doctor_id == doctor_id)
        )
        link = result.scalar_one_or_none()
        if link is None:
            raise NotFoundException("Doctor procedure link not found")

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(link, field, value)
        await db.flush()
        await db.refresh(link)
        return link

    async def remove_procedure(self, db: AsyncSession, practice_id: UUID, doctor_id: UUID, link_id: UUID) -> None:
        await self._resolve_doctor(db, practice_id, doctor_id)
        result = await db.execute(
            select(DoctorProcedure).where(DoctorProcedure.id == link_id, DoctorProcedure.doctor_id == doctor_id)
        )
        link = result.scalar_one_or_none()
        if link is None:
            raise NotFoundException("Doctor procedure link not found")
        await db.delete(link)
        await db.flush()
