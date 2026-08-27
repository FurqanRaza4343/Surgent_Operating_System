from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.demo_request import DemoRequestResponse
from src.services.demo.demo_services import DemoService


class DemoController:
    def __init__(self):
        self.service = DemoService()

    async def create_demo_request(
        self,
        db: AsyncSession,
        name: str,
        email: str,
        phone: str | None,
        practice_name: str | None,
        message: str | None,
    ) -> DemoRequestResponse:
        request = await self.service.create_demo_request(db, name, email, phone, practice_name, message)
        return DemoRequestResponse.model_validate(request)
