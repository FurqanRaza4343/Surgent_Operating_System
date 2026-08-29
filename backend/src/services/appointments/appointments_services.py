from __future__ import annotations
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.appointment import Appointment, AppointmentStatus
from src.models.doctor import Doctor
from src.models.patient import Patient
from src.server.exceptions import NotFoundException, AppException


class AppointmentsService:
    """Every method here is practice-scoped; callers must always pass the
    requesting user's own practice_id, never trust one from the client."""

    async def list_for_doctor_user(self, db: AsyncSession, practice_id: UUID, user_id: UUID) -> list[Appointment]:
        result = await db.execute(
            select(Doctor).where(Doctor.practice_id == practice_id, Doctor.user_id == user_id)
        )
        doctor = result.scalar_one_or_none()
        if doctor is None:
            raise NotFoundException("No doctor profile linked to this account")

        query = (
            select(Appointment)
            .where(Appointment.practice_id == practice_id, Appointment.doctor_id == doctor.id)
            .order_by(Appointment.start_time)
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_appointment(self, db: AsyncSession, practice_id: UUID, appointment_id: UUID) -> Appointment:
        result = await db.execute(
            select(Appointment).where(Appointment.id == appointment_id, Appointment.practice_id == practice_id)
        )
        appointment = result.scalar_one_or_none()
        if appointment is None:
            raise NotFoundException("Appointment not found")
        return appointment

    async def create_appointment(
        self,
        db: AsyncSession,
        practice_id: UUID,
        patient_id: UUID,
        doctor_id: UUID | None,
        appointment_type: str,
        start_time: datetime,
        end_time: datetime,
        notes: str | None = None,
    ) -> Appointment:
        if end_time <= start_time:
            raise AppException("Appointment end_time must be after start_time")

        patient_result = await db.execute(
            select(Patient).where(Patient.id == patient_id, Patient.practice_id == practice_id)
        )
        if patient_result.scalar_one_or_none() is None:
            raise NotFoundException("Patient not found")

        if doctor_id is not None:
            doctor_result = await db.execute(
                select(Doctor).where(Doctor.id == doctor_id, Doctor.practice_id == practice_id)
            )
            if doctor_result.scalar_one_or_none() is None:
                raise NotFoundException("Doctor not found")

        appointment = Appointment(
            practice_id=practice_id,
            patient_id=patient_id,
            doctor_id=doctor_id,
            appointment_type=appointment_type,
            status=AppointmentStatus.SCHEDULED,
            start_time=start_time,
            end_time=end_time,
            notes=notes,
        )
        db.add(appointment)
        await db.flush()
        await db.refresh(appointment)
        return appointment

    async def reschedule_appointment(
        self,
        db: AsyncSession,
        practice_id: UUID,
        appointment_id: UUID,
        new_start_time: datetime,
        new_end_time: datetime,
    ) -> Appointment:
        if new_end_time <= new_start_time:
            raise AppException("Appointment end_time must be after start_time")

        appointment = await self.get_appointment(db, practice_id, appointment_id)
        if appointment.status in (AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED):
            raise AppException(f"Cannot reschedule a {appointment.status.value} appointment")

        appointment.start_time = new_start_time
        appointment.end_time = new_end_time
        appointment.status = AppointmentStatus.SCHEDULED
        await db.flush()
        await db.refresh(appointment)
        return appointment

    async def cancel_appointment(
        self, db: AsyncSession, practice_id: UUID, appointment_id: UUID, reason: str | None = None
    ) -> Appointment:
        appointment = await self.get_appointment(db, practice_id, appointment_id)
        if appointment.status == AppointmentStatus.CANCELLED:
            return appointment

        appointment.status = AppointmentStatus.CANCELLED
        if reason:
            appointment.notes = f"{appointment.notes}\nCancelled: {reason}" if appointment.notes else f"Cancelled: {reason}"
        await db.flush()
        await db.refresh(appointment)
        return appointment

    async def complete_appointment(self, db: AsyncSession, practice_id: UUID, appointment_id: UUID) -> Appointment:
        appointment = await self.get_appointment(db, practice_id, appointment_id)
        if appointment.status == AppointmentStatus.CANCELLED:
            raise AppException("Cannot complete a cancelled appointment")

        appointment.status = AppointmentStatus.COMPLETED
        await db.flush()
        await db.refresh(appointment)
        return appointment
