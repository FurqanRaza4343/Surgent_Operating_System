from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user
from src.server.audit import audit_action
from src.models.user import User
from src.schemas.patient import CreatePatientRequest, UpdatePatientRequest, UpdatePatientStageRequest, PatientResponse, FunnelStageCount
from src.controller.patients.patients_controllers import PatientsController

router = APIRouter(prefix="/patients", tags=["Patients"])
controller = PatientsController()


@router.post("", response_model=PatientResponse)
async def create_patient(
    data: CreatePatientRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.create_patient(db, user, data)


@router.get("", response_model=list[PatientResponse])
async def list_patients(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_patients(db, user)


# Must be declared before GET /{patient_id} — otherwise FastAPI tries to
# parse "funnel-summary" as a patient_id UUID and 422s before ever reaching
# this handler.
@router.get("/funnel-summary", response_model=list[FunnelStageCount])
async def funnel_summary(
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.funnel_summary(db, user)


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: UUID,
    user: User = Depends(audit_action("patient.view", "patient", id_param="patient_id")),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_patient(db, user, patient_id)


@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: UUID,
    data: UpdatePatientRequest,
    user: User = Depends(audit_action("patient.update", "patient", id_param="patient_id")),
    db: AsyncSession = Depends(get_db),
):
    return await controller.update_patient(db, user, patient_id, data)


@router.patch("/{patient_id}/stage", response_model=PatientResponse)
async def update_stage(
    patient_id: UUID,
    data: UpdatePatientStageRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.update_stage(db, user, patient_id, data)
