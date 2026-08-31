from __future__ import annotations
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.procedure import CreateProcedureRequest, UpdateProcedureRequest, ProcedureResponse
from src.services.procedures.procedures_services import ProceduresService


class ProceduresController:
    def __init__(self):
        self.service = ProceduresService()

    async def create_procedure(self, db: AsyncSession, user: User, data: CreateProcedureRequest) -> ProcedureResponse:
        procedure = await self.service.create_procedure(db, user.practice_id, data)
        return ProcedureResponse.model_validate(procedure)

    async def list_procedures(self, db: AsyncSession, user: User, active_only: bool) -> list[ProcedureResponse]:
        procedures = await self.service.list_procedures(db, user.practice_id, active_only)
        return [ProcedureResponse.model_validate(p) for p in procedures]

    async def get_procedure(self, db: AsyncSession, user: User, procedure_id: UUID) -> ProcedureResponse:
        procedure = await self.service.get_procedure(db, user.practice_id, procedure_id)
        return ProcedureResponse.model_validate(procedure)

    async def update_procedure(
        self, db: AsyncSession, user: User, procedure_id: UUID, data: UpdateProcedureRequest
    ) -> ProcedureResponse:
        procedure = await self.service.update_procedure(db, user.practice_id, procedure_id, data)
        return ProcedureResponse.model_validate(procedure)
