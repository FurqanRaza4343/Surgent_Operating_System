from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user
from src.models.user import User
from src.schemas.patient import CreatePatientRequest, PatientResponse
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


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_patient(db, user, patient_id)
