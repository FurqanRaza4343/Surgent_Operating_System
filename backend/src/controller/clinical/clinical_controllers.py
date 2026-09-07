from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.clinical import (
    CreateConsultationNoteRequest,
    UpdateConsultationNoteRequest,
    ConsultationNoteResponse,
    AIConsultationDraftRequest,
    AIConsultationDraftResponse,
    TranscriptionResponse,
    CreateTreatmentPlanRequest,
    UpdateTreatmentPlanRequest,
    UpdateTreatmentPlanItemRequest,
    TreatmentPlanResponse,
    TreatmentPlanItemResponse,
)
from src.server.patient_access import verify_doctor_access
from src.services.clinical.consultation_services import ConsultationService
from src.services.clinical.treatment_plan_services import TreatmentPlanService


class ClinicalController:
    def __init__(self):
        self.consultations = ConsultationService()
        self.treatment_plans = TreatmentPlanService()

    # --- Consultation Notes ---
    # Every method here is Owner/Doctor-only at the router level already;
    # the extra verify_doctor_access call is the Doctor hard-restriction —
    # Owner passes through as a no-op (see server/patient_access.py).

    async def create_note(self, db: AsyncSession, user: User, data: CreateConsultationNoteRequest) -> ConsultationNoteResponse:
        await verify_doctor_access(db, user, data.patient_id)
        note = await self.consultations.create_note(db, user.practice_id, user.id, data)
        return ConsultationNoteResponse.model_validate(note)

    async def list_notes_for_patient(self, db: AsyncSession, user: User, patient_id: UUID) -> list[ConsultationNoteResponse]:
        await verify_doctor_access(db, user, patient_id)
        notes = await self.consultations.list_for_patient(db, user.practice_id, patient_id)
        return [ConsultationNoteResponse.model_validate(n) for n in notes]

    async def get_note(self, db: AsyncSession, user: User, note_id: UUID) -> ConsultationNoteResponse:
        note = await self.consultations.get_note(db, user.practice_id, note_id)
        await verify_doctor_access(db, user, note.patient_id)
        return ConsultationNoteResponse.model_validate(note)

    async def update_note(self, db: AsyncSession, user: User, note_id: UUID, data: UpdateConsultationNoteRequest) -> ConsultationNoteResponse:
        existing = await self.consultations.get_note(db, user.practice_id, note_id)
        await verify_doctor_access(db, user, existing.patient_id)
        note = await self.consultations.update_note(db, user.practice_id, note_id, data)
        return ConsultationNoteResponse.model_validate(note)

    async def ai_draft_note(self, db: AsyncSession, user: User, data: AIConsultationDraftRequest) -> AIConsultationDraftResponse:
        await verify_doctor_access(db, user, data.patient_id)
        return await self.consultations.ai_draft(db, user.practice_id, data.patient_id, data.raw_notes)

    async def transcribe_dictation(self, audio_bytes: bytes, filename: str) -> TranscriptionResponse:
        text = await self.consultations.transcribe_dictation(audio_bytes, filename)
        return TranscriptionResponse(text=text)

    # --- Treatment Plans ---

    async def create_plan(self, db: AsyncSession, user: User, data: CreateTreatmentPlanRequest) -> TreatmentPlanResponse:
        await verify_doctor_access(db, user, data.patient_id)
        plan = await self.treatment_plans.create_plan(db, user.practice_id, user.id, data)
        return TreatmentPlanResponse.model_validate(plan)

    async def list_plans_for_patient(self, db: AsyncSession, user: User, patient_id: UUID) -> list[TreatmentPlanResponse]:
        await verify_doctor_access(db, user, patient_id)
        plans = await self.treatment_plans.list_for_patient(db, user.practice_id, patient_id)
        return [TreatmentPlanResponse.model_validate(p) for p in plans]

    async def get_plan(self, db: AsyncSession, user: User, plan_id: UUID) -> TreatmentPlanResponse:
        plan = await self.treatment_plans.get_plan(db, user.practice_id, plan_id)
        await verify_doctor_access(db, user, plan.patient_id)
        return TreatmentPlanResponse.model_validate(plan)

    async def update_plan(self, db: AsyncSession, user: User, plan_id: UUID, data: UpdateTreatmentPlanRequest) -> TreatmentPlanResponse:
        existing = await self.treatment_plans.get_plan(db, user.practice_id, plan_id)
        await verify_doctor_access(db, user, existing.patient_id)
        plan = await self.treatment_plans.update_plan(db, user.practice_id, plan_id, data)
        return TreatmentPlanResponse.model_validate(plan)

    async def update_item(self, db: AsyncSession, user: User, item_id: UUID, data: UpdateTreatmentPlanItemRequest) -> TreatmentPlanItemResponse:
        plan = await self.treatment_plans.get_plan_for_item(db, user.practice_id, item_id)
        await verify_doctor_access(db, user, plan.patient_id)
        item = await self.treatment_plans.update_item(db, user.practice_id, item_id, data)
        return TreatmentPlanItemResponse.model_validate(item)
