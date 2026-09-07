from __future__ import annotations
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.doctor import Doctor
from src.models.patient import Patient
from src.models.user import User, UserRole
from src.server.exceptions import ForbiddenException, NotFoundException

# Single choke point for the Doctor hard-restriction: a Doctor may only
# access patients assigned to them (Patient.assigned_doctor_id) — Owner and
# Receptionist reach every practice patient (Receptionist's own field-level
# redaction happens separately, in patients_controllers.py). Every
# patient-scoped controller method routes through one of these two
# functions so the rule can't be silently skipped by a new endpoint
# forgetting to check it — this is what "backend must be authoritative"
# means in practice: the frontend never decides this, it only reflects it.


async def resolve_doctor_id(db: AsyncSession, user: User) -> UUID | None:
    """The Doctor row's id for the currently-authenticated user, or None if
    they aren't a Doctor / have no linked Doctor row yet."""
    if user.role != UserRole.DOCTOR:
        return None
    result = await db.execute(select(Doctor.id).where(Doctor.practice_id == user.practice_id, Doctor.user_id == user.id))
    return result.scalar_one_or_none()


async def verify_doctor_access(db: AsyncSession, user: User, patient_id: UUID) -> None:
    """Raises ForbiddenException if `user` is a Doctor not assigned to
    `patient_id`. A no-op for every other role — Owner/Receptionist's own
    (looser) rules are enforced elsewhere (require_role on the route,
    field-redaction in the controller)."""
    if user.role != UserRole.DOCTOR:
        return
    doctor_id = await resolve_doctor_id(db, user)
    result = await db.execute(select(Patient.assigned_doctor_id).where(Patient.id == patient_id))
    assigned_doctor_id = result.scalar_one_or_none()
    if doctor_id is None or assigned_doctor_id != doctor_id:
        raise ForbiddenException("This patient isn't assigned to you")


async def get_patient_or_403(db: AsyncSession, user: User, patient_id: UUID) -> Patient:
    """Fetches a patient scoped to the user's practice and enforces the
    Doctor hard-restriction in one call — the entry point for controller
    methods that already need the full Patient row (get_patient,
    update_patient, archive, assign_doctor, ...)."""
    result = await db.execute(select(Patient).where(Patient.id == patient_id, Patient.practice_id == user.practice_id))
    patient = result.scalar_one_or_none()
    if patient is None:
        raise NotFoundException("Patient not found")
    await verify_doctor_access(db, user, patient_id)
    return patient
