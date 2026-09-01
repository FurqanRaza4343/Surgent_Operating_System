from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user
from src.models.user import User
from src.schemas.patient_portal import (
    PortalLinkResponse,
    PortalPatientResponse,
    PortalBookingRequest,
)
from src.controller.patient_portal.patient_portal_controllers import PatientPortalController

router = APIRouter(prefix="/patient-portal", tags=["Patient Portal"])
controller = PatientPortalController()


# Both surfaces live on one router but with very different auth:
#
#  - /patient-portal/patients/{id}/link*  → practice-member only (an Owner
#    generates / revokes a patient's share link).
#  - /patient-portal/{token}              → PUBLIC by design. No
#    practice-member dependency: the high-entropy token IS the credential.
#    Kept deliberately out from under get_current_practice_user so any holder
#    of the link can open the patient's read-only view. Demo-only security
#    model (see the service's note) — production must move to real auth.


@router.post("/patients/{patient_id}/link", response_model=PortalLinkResponse)
async def generate_portal_link(
    patient_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.generate_link(db, user, patient_id)


@router.delete("/patients/{patient_id}/link", response_model=PortalLinkResponse)
async def revoke_portal_link(
    patient_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.revoke_link(db, user, patient_id)


@router.get("/patients/{patient_id}/link", response_model=PortalLinkResponse)
async def get_portal_link(
    patient_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_link_state(db, user, patient_id)


@router.get("/{token}", response_model=PortalPatientResponse)
async def open_portal(token: str, db: AsyncSession = Depends(get_db)):
    return await controller.resolve_token(db, token)


@router.post("/{token}/appointments", response_model=PortalPatientResponse)
async def portal_book_appointment(
    token: str,
    data: PortalBookingRequest,
    db: AsyncSession = Depends(get_db),
):
    """Self-serve booking from the public portal — no practice-member auth.
    High-entropy token is the credential (same model as GET /{token}). Creates
    a SCHEDULED appointment with no assigned doctor; front desk assigns one."""
    return await controller.book_appointment(db, token, data)
