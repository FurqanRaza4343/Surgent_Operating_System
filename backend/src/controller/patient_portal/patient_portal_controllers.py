from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.models.patient import Patient
from src.schemas.patient_portal import (
    PortalAccessResponse,
    PortalPinIssuedResponse,
    PortalPatientResponse,
    PortalBookingRequest,
    PatientPortalLoginRequest,
    PatientPortalLoginResponse,
    PatientIntakeRequest,
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

    async def enable_portal(self, db: AsyncSession, user: User, patient_id: UUID) -> PortalPinIssuedResponse:
        portal_id, pin = await self.auth.enable_portal(db, user.practice_id, patient_id)
        return PortalPinIssuedResponse(portal_id=portal_id, pin=pin)

    async def reset_pin(self, db: AsyncSession, user: User, patient_id: UUID) -> PortalPinIssuedResponse:
        pin = await self.auth.reset_pin(db, user.practice_id, patient_id)
        portal_id, _ = await self.auth.get_portal_state(db, user.practice_id, patient_id)
        return PortalPinIssuedResponse(portal_id=portal_id, pin=pin)

    async def disable_portal(self, db: AsyncSession, user: User, patient_id: UUID) -> PortalAccessResponse:
        await self.auth.disable_portal(db, user.practice_id, patient_id)
        portal_id, enabled = await self.auth.get_portal_state(db, user.practice_id, patient_id)
        return PortalAccessResponse(portal_id=portal_id, enabled=enabled)

    async def get_access_state(self, db: AsyncSession, user: User, patient_id: UUID) -> PortalAccessResponse:
        portal_id, enabled = await self.auth.get_portal_state(db, user.practice_id, patient_id)
        return PortalAccessResponse(portal_id=portal_id, enabled=enabled)

    # --- Patient-side login ---

    async def login(self, db: AsyncSession, data: PatientPortalLoginRequest, client_key: str, ip_address: str | None = None) -> PatientPortalLoginResponse:
        token, _patient = await self.auth.login(db, data.portal_id, data.pin, client_key, ip_address)
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
