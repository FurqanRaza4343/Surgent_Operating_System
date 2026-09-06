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
    CreateTreatmentPlanRequest,
    UpdateTreatmentPlanRequest,
    UpdateTreatmentPlanItemRequest,
    TreatmentPlanResponse,
    TreatmentPlanItemResponse,
)
from src.services.clinical.consultation_services import ConsultationService
from src.services.clinical.treatment_plan_services import TreatmentPlanService


class ClinicalController:
    def __init__(self):
        self.consultations = ConsultationService()
        self.treatment_plans = TreatmentPlanService()

    # --- Consultation Notes ---

    async def create_note(self, db: AsyncSession, user: User, data: CreateConsultationNoteRequest) -> ConsultationNoteResponse:
        note = await self.consultations.create_note(db, user.practice_id, user.id, data)
        return ConsultationNoteResponse.model_validate(note)

    async def list_notes_for_patient(self, db: AsyncSession, user: User, patient_id: UUID) -> list[ConsultationNoteResponse]:
        notes = await self.consultations.list_for_patient(db, user.practice_id, patient_id)
        return [ConsultationNoteResponse.model_validate(n) for n in notes]

    async def get_note(self, db: AsyncSession, user: User, note_id: UUID) -> ConsultationNoteResponse:
        note = await self.consultations.get_note(db, user.practice_id, note_id)
        return ConsultationNoteResponse.model_validate(note)

    async def update_note(self, db: AsyncSession, user: User, note_id: UUID, data: UpdateConsultationNoteRequest) -> ConsultationNoteResponse:
        note = await self.consultations.update_note(db, user.practice_id, note_id, data)
        return ConsultationNoteResponse.model_validate(note)

    async def ai_draft_note(self, db: AsyncSession, user: User, data: AIConsultationDraftRequest) -> AIConsultationDraftResponse:
        return await self.consultations.ai_draft(db, user.practice_id, data.patient_id, data.raw_notes)

    # --- Treatment Plans ---

    async def create_plan(self, db: AsyncSession, user: User, data: CreateTreatmentPlanRequest) -> TreatmentPlanResponse:
        plan = await self.treatment_plans.create_plan(db, user.practice_id, user.id, data)
        return TreatmentPlanResponse.model_validate(plan)

    async def list_plans_for_patient(self, db: AsyncSession, user: User, patient_id: UUID) -> list[TreatmentPlanResponse]:
        plans = await self.treatment_plans.list_for_patient(db, user.practice_id, patient_id)
        return [TreatmentPlanResponse.model_validate(p) for p in plans]

    async def get_plan(self, db: AsyncSession, user: User, plan_id: UUID) -> TreatmentPlanResponse:
        plan = await self.treatment_plans.get_plan(db, user.practice_id, plan_id)
        return TreatmentPlanResponse.model_validate(plan)

    async def update_plan(self, db: AsyncSession, user: User, plan_id: UUID, data: UpdateTreatmentPlanRequest) -> TreatmentPlanResponse:
        plan = await self.treatment_plans.update_plan(db, user.practice_id, plan_id, data)
        return TreatmentPlanResponse.model_validate(plan)

    async def update_item(self, db: AsyncSession, user: User, item_id: UUID, data: UpdateTreatmentPlanItemRequest) -> TreatmentPlanItemResponse:
        item = await self.treatment_plans.update_item(db, user.practice_id, item_id, data)
        return TreatmentPlanItemResponse.model_validate(item)
