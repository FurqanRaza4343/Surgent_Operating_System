from __future__ import annotations
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.patient import Patient
from src.models.patient_photo import PatientPhoto
from src.server.exceptions import NotFoundException
from src.services.storage.storage_service import StorageService


class PatientPhotosService:
    """Wires up the previously-dormant PatientPhoto model — mirrors
    services/doctor_applications/doctor_applications_service.py's upload_file
    exactly. Practice-scoped indirectly: PatientPhoto has no practice_id of
    its own, so every method verifies the parent Patient belongs to the
    caller's practice first."""

    def __init__(self):
        self.storage = StorageService()

    async def _verify_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> None:
        result = await db.execute(select(Patient).where(Patient.id == patient_id, Patient.practice_id == practice_id))
        if result.scalar_one_or_none() is None:
            raise NotFoundException("Patient not found")

    async def upload_photo(
        self, db: AsyncSession, practice_id: UUID, patient_id: UUID,
        file_bytes: bytes, filename: str, photo_type: str | None, notes: str | None,
    ) -> PatientPhoto:
        await self._verify_patient(db, practice_id, patient_id)

        result = await self.storage.upload(file_bytes, filename, folder=f"patient_photos/{practice_id}")
        photo = PatientPhoto(
            patient_id=patient_id,
            cloudinary_public_id=result["public_id"],
            cloudinary_url=result["url"],
            photo_type=photo_type,
            notes=notes,
        )
        db.add(photo)
        await db.flush()
        await db.refresh(photo)
        return photo

    async def list_for_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> list[PatientPhoto]:
        await self._verify_patient(db, practice_id, patient_id)
        query = select(PatientPhoto).where(PatientPhoto.patient_id == patient_id).order_by(PatientPhoto.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    async def delete_photo(self, db: AsyncSession, practice_id: UUID, photo_id: UUID) -> None:
        query = (
            select(PatientPhoto)
            .join(Patient, PatientPhoto.patient_id == Patient.id)
            .where(PatientPhoto.id == photo_id, Patient.practice_id == practice_id)
        )
        result = await db.execute(query)
        photo = result.scalar_one_or_none()
        if photo is None:
            raise NotFoundException("Photo not found")

        await self.storage.delete(photo.cloudinary_public_id)
        await db.delete(photo)
        await db.flush()
