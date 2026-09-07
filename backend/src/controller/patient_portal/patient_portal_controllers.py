from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

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
from src.services.patient_portal.patient_portal_services import PatientPortalService
from src.services.patient_portal.patient_portal_auth_service import PatientPortalAuthService
from src.services.patient_portal.patient_intake_service import PatientIntakeService
from src.config import get_settings

settings = get_settings()


class PatientPortalController:
    def __init__(self):
        self.service = PatientPortalService()
        self.auth = PatientPortalAuthService()
        self.intake = PatientIntakeService()

    # --- Owner/staff-side management ---

    async def enable_portal(self, db: AsyncSession, user: User, patient_id: UUID) -> PortalEnabledResponse:
        portal_id, invite_sent = await self.auth.enable_portal(db, user.practice_id, patient_id)
        return PortalEnabledResponse(portal_id=portal_id, invite_sent=invite_sent)

    async def resend_invite(self, db: AsyncSession, user: User, patient_id: UUID) -> PortalAccessResponse:
        await self.auth.resend_invite(db, user.practice_id, patient_id)
        portal_id, enabled = await self.auth.get_portal_state(db, user.practice_id, patient_id)
        return PortalAccessResponse(portal_id=portal_id, enabled=enabled)

    async def disable_portal(self, db: AsyncSession, user: User, patient_id: UUID) -> PortalAccessResponse:
        await self.auth.disable_portal(db, user.practice_id, patient_id)
        portal_id, enabled = await self.auth.get_portal_state(db, user.practice_id, patient_id)
        return PortalAccessResponse(portal_id=portal_id, enabled=enabled)

    async def get_access_state(self, db: AsyncSession, user: User, patient_id: UUID) -> PortalAccessResponse:
        portal_id, enabled = await self.auth.get_portal_state(db, user.practice_id, patient_id)
        return PortalAccessResponse(portal_id=portal_id, enabled=enabled)

    # --- Patient-side login ---

    async def request_otp(self, db: AsyncSession, data: RequestOtpRequest, client_key: str, ip_address: str | None = None) -> RequestOtpResponse:
        result = await self.auth.request_otp(db, data.phone, client_key, ip_address)
        return RequestOtpResponse(**result)

    async def verify_otp(self, db: AsyncSession, data: VerifyOtpRequest, client_key: str, ip_address: str | None = None) -> PatientPortalLoginResponse:
        token, _patient = await self.auth.verify_otp(db, data.phone, data.code, client_key, ip_address)
        return PatientPortalLoginResponse(access_token=token, expires_in_minutes=settings.patient_portal_jwt_expires_minutes)

    # --- Patient-side data ---

    async def get_my_data(self, db: AsyncSession, patient: Patient) -> PortalPatientResponse:
        return await self.service.get_my_portal_data(db, patient)

    async def book_appointment(self, db: AsyncSession, patient: Patient, data: PortalBookingRequest) -> PortalPatientResponse:
        await self.service.book_appointment(db, patient, data)
        return await self.service.get_my_portal_data(db, patient)

    async def submit_intake(self, db: AsyncSession, patient: Patient, data: PatientIntakeRequest) -> PortalPatientResponse:
        await self.intake.submit_intake(db, patient, data)
        return await self.service.get_my_portal_data(db, patient)

    async def get_messages(self, db: AsyncSession, patient: Patient) -> list[PortalMessage]:
        return await self.service.get_messages(db, patient)

    async def send_message(self, db: AsyncSession, patient: Patient, data: SendPortalMessageRequest) -> PortalMessage:
        return await self.service.send_message(db, patient, data.content)
