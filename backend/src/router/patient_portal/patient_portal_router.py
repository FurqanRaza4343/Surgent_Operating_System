from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user, get_current_portal_patient
from src.models.user import User
from src.models.patient import Patient
from src.schemas.patient_portal import (
    PortalAccessResponse,
    PortalPinIssuedResponse,
    PortalPatientResponse,
    PortalBookingRequest,
    PatientPortalLoginRequest,
    PatientPortalLoginResponse,
)
from src.controller.patient_portal.patient_portal_controllers import PatientPortalController

router = APIRouter(prefix="/patient-portal", tags=["Patient Portal"])
controller = PatientPortalController()


# Three distinct auth surfaces on one router:
#
#  - /patient-portal/patients/{id}/*  → practice-member only (staff manages
#    a patient's portal access: enable/reset-PIN/disable).
#  - /patient-portal/login            → PUBLIC. Takes portal_id+PIN, returns
#    a short-lived JWT scoped to that one patient (see
#    patient_portal_auth_service.py) — rate-limited against brute-forcing.
#  - /patient-portal/me*              → requires that JWT
#    (get_current_portal_patient), not Clerk and not a raw token-in-URL.


@router.post("/patients/{patient_id}/enable", response_model=PortalPinIssuedResponse)
async def enable_portal(
    patient_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    """Turns portal access on and returns the portal_id + a freshly-generated
    PIN — shown to staff exactly once, to hand to the patient in person."""
    return await controller.enable_portal(db, user, patient_id)


@router.post("/patients/{patient_id}/reset-pin", response_model=PortalPinIssuedResponse)
async def reset_pin(
    patient_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.reset_pin(db, user, patient_id)


@router.post("/patients/{patient_id}/disable", response_model=PortalAccessResponse)
async def disable_portal(
    patient_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.disable_portal(db, user, patient_id)


@router.get("/patients/{patient_id}/access", response_model=PortalAccessResponse)
async def get_access_state(
    patient_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_access_state(db, user, patient_id)


@router.post("/login", response_model=PatientPortalLoginResponse)
async def login(
    data: PatientPortalLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    # Rate-limit key mixes the client IP and the portal_id being attempted —
    # slows both PIN brute-forcing against one ID and enumeration across IDs.
    client_key = f"{request.client.host if request.client else 'unknown'}:{data.portal_id}"
    return await controller.login(db, data, client_key)


@router.get("/me", response_model=PortalPatientResponse)
async def get_my_data(
    patient: Patient = Depends(get_current_portal_patient),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_my_data(db, patient)


@router.post("/me/appointments", response_model=PortalPatientResponse)
async def book_appointment(
    data: PortalBookingRequest,
    patient: Patient = Depends(get_current_portal_patient),
    db: AsyncSession = Depends(get_db),
):
    return await controller.book_appointment(db, patient, data)
