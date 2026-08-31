from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.patient_photo import PatientPhotoResponse
from src.services.patient_photos.patient_photos_services import PatientPhotosService


class PatientPhotosController:
    def __init__(self):
        self.service = PatientPhotosService()

    async def upload_photo(
        self, db: AsyncSession, user: User, patient_id: UUID,
        file_bytes: bytes, filename: str, photo_type: str | None, notes: str | None,
    ) -> PatientPhotoResponse:
        photo = await self.service.upload_photo(db, user.practice_id, patient_id, file_bytes, filename, photo_type, notes)
        return PatientPhotoResponse.model_validate(photo)

    async def list_for_patient(self, db: AsyncSession, user: User, patient_id: UUID) -> list[PatientPhotoResponse]:
        photos = await self.service.list_for_patient(db, user.practice_id, patient_id)
        return [PatientPhotoResponse.model_validate(p) for p in photos]

    async def delete_photo(self, db: AsyncSession, user: User, photo_id: UUID) -> None:
        await self.service.delete_photo(db, user.practice_id, photo_id)
