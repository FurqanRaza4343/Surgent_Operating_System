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
    PortalEnabledResponse,
    PortalPatientResponse,
    PortalBookingRequest,
    RequestOtpRequest,
    RequestOtpResponse,
    VerifyOtpRequest,
    PatientPortalLoginResponse,
    PatientIntakeRequest,
    PortalMessage,
    SendPortalMessageRequest,
)
from src.schemas.recovery import SubmitCheckInRequest, RecoveryCheckInResponse, RecoveryJournalResponse
from src.controller.patient_portal.patient_portal_controllers import PatientPortalController
from src.controller.recovery.recovery_controllers import RecoveryController

router = APIRouter(prefix="/patient-portal", tags=["Patient Portal"])
controller = PatientPortalController()
recovery_controller = RecoveryController()


# Three distinct auth surfaces on one router:
#
#  - /patient-portal/patients/{id}/*     → practice-member only (staff turns
#    portal access on/off and can resend the "portal is ready" invite —
#    never handles a patient credential directly).
#  - /patient-portal/request-otp,verify  → PUBLIC. Phone number in, a
#    one-time code out over WhatsApp/email; the code back in for a
#    short-lived JWT scoped to that one patient (see
#    patient_portal_auth_service.py) — rate-limited against brute-forcing
#    and phone enumeration.
#  - /patient-portal/me*                 → requires that JWT
#    (get_current_portal_patient), not Clerk and not a raw token-in-URL.


@router.post("/patients/{patient_id}/enable", response_model=PortalEnabledResponse)
async def enable_portal(
    patient_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    """Turns portal access on and sends a "your portal is ready" invite
    over WhatsApp/email — no PIN generated, nothing for staff to hand over."""
    return await controller.enable_portal(db, user, patient_id)


@router.post("/patients/{patient_id}/resend-invite", response_model=PortalAccessResponse)
async def resend_invite(
    patient_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.resend_invite(db, user, patient_id)


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


@router.post("/request-otp", response_model=RequestOtpResponse)
async def request_otp(
    data: RequestOtpRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    # Rate-limit key mixes the client IP and the phone being attempted —
    # slows both OTP-spam against one number and phone enumeration across
    # numbers.
    ip = request.client.host if request.client else None
    client_key = f"{ip or 'unknown'}:{data.phone}"
    return await controller.request_otp(db, data, client_key, ip)


@router.post("/verify-otp", response_model=PatientPortalLoginResponse)
async def verify_otp(
    data: VerifyOtpRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else None
    client_key = f"{ip or 'unknown'}:{data.phone}"
    return await controller.verify_otp(db, data, client_key, ip)


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


@router.post("/me/intake", response_model=PortalPatientResponse)
async def submit_intake(
    data: PatientIntakeRequest,
    patient: Patient = Depends(get_current_portal_patient),
    db: AsyncSession = Depends(get_db),
):
    """One-time structured pre-consultation intake (allergies/surgical
    history/medications/smoking) — writes onto the patient's real profile
    fields and generates a doctor-facing AI summary flagging anything
    clinically relevant. Re-submitting overwrites the previous summary."""
    return await controller.submit_intake(db, patient, data)


@router.get("/me/messages", response_model=list[PortalMessage])
async def get_my_messages(
    patient: Patient = Depends(get_current_portal_patient),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_messages(db, patient)


@router.post("/me/messages", response_model=PortalMessage)
async def send_my_message(
    data: SendPortalMessageRequest,
    patient: Patient = Depends(get_current_portal_patient),
    db: AsyncSession = Depends(get_db),
):
    return await controller.send_message(db, patient, data)


@router.get("/me/recovery", response_model=RecoveryJournalResponse | None)
async def get_my_recovery(
    patient: Patient = Depends(get_current_portal_patient),
    db: AsyncSession = Depends(get_db),
):
    return await recovery_controller.get_journal_for_portal_patient(db, patient)


@router.post("/me/recovery/checkin", response_model=RecoveryCheckInResponse)
async def submit_my_recovery_checkin(
    data: SubmitCheckInRequest,
    patient: Patient = Depends(get_current_portal_patient),
    db: AsyncSession = Depends(get_db),
):
    return await recovery_controller.submit_checkin_from_portal(db, patient, data)
