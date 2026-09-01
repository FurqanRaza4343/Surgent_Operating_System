from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.patient_portal import (
    PortalLinkResponse,
    PortalPatientResponse,
    PortalBookingRequest,
)
from src.services.patient_portal.patient_portal_services import PatientPortalService


class PatientPortalController:
    def __init__(self):
        self.service = PatientPortalService()

    async def generate_link(self, db: AsyncSession, user: User, patient_id: UUID) -> PortalLinkResponse:
        url = await self.service.generate_link(db, user.practice_id, patient_id)
        return PortalLinkResponse(portal_url=url, enabled=True)

    async def revoke_link(self, db: AsyncSession, user: User, patient_id: UUID) -> PortalLinkResponse:
        await self.service.revoke_link(db, user.practice_id, patient_id)
        return PortalLinkResponse(portal_url=None, enabled=False)

    async def get_link_state(self, db: AsyncSession, user: User, patient_id: UUID) -> PortalLinkResponse:
        url, enabled = await self.service.get_link_state(db, user.practice_id, patient_id)
        return PortalLinkResponse(portal_url=url, enabled=enabled)

    async def resolve_token(self, db: AsyncSession, token: str) -> PortalPatientResponse:
        return await self.service.resolve_token(db, token)

    async def book_appointment(
        self, db: AsyncSession, token: str, data: PortalBookingRequest
    ) -> PortalPatientResponse:
        await self.service.book_appointment(db, token, data)
        return await self.service.resolve_token(db, token)
