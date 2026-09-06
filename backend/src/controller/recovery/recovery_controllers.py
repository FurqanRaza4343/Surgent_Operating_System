from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.models.patient import Patient
from src.models.recovery_checkin import RecoveryCheckpoint, SwellingLevel
from src.schemas.recovery import (
    RecoveryJournalResponse,
    SubmitCheckInRequest,
    RecoveryCheckInResponse,
    FlaggedCheckInResponse,
)
from src.services.recovery.recovery_services import RecoveryService
from src.services.recovery.post_op_followup_service import PostOpFollowUpService
from src.server.exceptions import AppException


class RecoveryController:
    def __init__(self):
        self.service = RecoveryService()
        self.followups = PostOpFollowUpService()

    async def run_followups(self, db: AsyncSession, user: User) -> dict:
        sent = await self.followups.check_and_send_followups(db, practice_id=user.practice_id)
        return {"sent": sent, "count": len(sent)}

    async def get_journal_for_patient(self, db: AsyncSession, user: User, patient_id: UUID) -> RecoveryJournalResponse | None:
        journal = await self.service.get_journal_for_patient(db, user.practice_id, patient_id)
        return RecoveryJournalResponse.model_validate(journal) if journal else None

    async def get_journal_for_portal_patient(self, db: AsyncSession, patient: Patient) -> RecoveryJournalResponse | None:
        journal = await self.service.get_journal_for_patient(db, patient.practice_id, patient.id)
        return RecoveryJournalResponse.model_validate(journal) if journal else None

    async def submit_checkin_for_patient(
        self, db: AsyncSession, user: User, patient_id: UUID, data: SubmitCheckInRequest
    ) -> RecoveryCheckInResponse:
        return await self._submit(db, user.practice_id, patient_id, data)

    async def submit_checkin_from_portal(
        self, db: AsyncSession, patient: Patient, data: SubmitCheckInRequest
    ) -> RecoveryCheckInResponse:
        return await self._submit(db, patient.practice_id, patient.id, data)

    async def _submit(self, db: AsyncSession, practice_id: UUID, patient_id: UUID, data: SubmitCheckInRequest) -> RecoveryCheckInResponse:
        try:
            checkpoint = RecoveryCheckpoint(data.checkpoint)
        except ValueError:
            raise AppException(f"Invalid checkpoint: {data.checkpoint}", status_code=422)
        swelling = None
        if data.swelling_level:
            try:
                swelling = SwellingLevel(data.swelling_level)
            except ValueError:
                raise AppException(f"Invalid swelling_level: {data.swelling_level}", status_code=422)

        journal = await self.service.get_journal_for_patient(db, practice_id, patient_id)
        if journal is None:
            journal = await self.service.get_or_create_journal(db, patient_id)

        checkin = await self.service.submit_checkin(
            db, journal, checkpoint,
            pain_score=data.pain_score,
            swelling_level=swelling,
            temperature_celsius=data.temperature_celsius,
            symptoms=data.symptoms,
            concerns=data.concerns,
            photo_url=data.photo_url,
        )
        return RecoveryCheckInResponse.model_validate(checkin)

    async def list_flagged(self, db: AsyncSession, user: User) -> list[FlaggedCheckInResponse]:
        rows = await self.service.list_flagged(db, user.practice_id)
        return [
            FlaggedCheckInResponse(
                checkin=RecoveryCheckInResponse.model_validate(checkin),
                patient_id=patient.id,
                patient_name=f"{patient.first_name} {patient.last_name}".strip(),
            )
            for checkin, patient in rows
        ]

    async def mark_reviewed(self, db: AsyncSession, user: User, checkin_id: UUID) -> RecoveryCheckInResponse:
        checkin = await self.service.mark_reviewed(db, user.practice_id, user.id, checkin_id)
        return RecoveryCheckInResponse.model_validate(checkin)
