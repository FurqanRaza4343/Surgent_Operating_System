from __future__ import annotations
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.consent_document import ConsentTemplate
from src.server.exceptions import NotFoundException


class ConsentTemplateService:
    """The LIVE, editable wording behind each consent type — see
    models/consent_document.py's ConsentTemplate docstring for why editing
    never touches an already-signed ConsentDocument's own snapshot."""

    async def create_template(self, db: AsyncSession, practice_id: UUID, document_type: str, body: str) -> ConsentTemplate:
        template = ConsentTemplate(practice_id=practice_id, document_type=document_type, body=body, version=1)
        db.add(template)
        await db.flush()
        await db.refresh(template)
        return template

    async def list_templates(self, db: AsyncSession, practice_id: UUID) -> list[ConsentTemplate]:
        result = await db.execute(
            select(ConsentTemplate)
            .where(ConsentTemplate.practice_id == practice_id)
            .order_by(ConsentTemplate.document_type, ConsentTemplate.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_template(self, db: AsyncSession, practice_id: UUID, template_id: UUID) -> ConsentTemplate:
        result = await db.execute(
            select(ConsentTemplate).where(ConsentTemplate.id == template_id, ConsentTemplate.practice_id == practice_id)
        )
        template = result.scalar_one_or_none()
        if template is None:
            raise NotFoundException("Consent template not found")
        return template

    async def get_active_for_type(self, db: AsyncSession, practice_id: UUID, document_type: str) -> ConsentTemplate | None:
        result = await db.execute(
            select(ConsentTemplate)
            .where(
                ConsentTemplate.practice_id == practice_id,
                ConsentTemplate.document_type == document_type,
                ConsentTemplate.is_active == True,  # noqa: E712
            )
            .order_by(ConsentTemplate.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def update_template(
        self, db: AsyncSession, practice_id: UUID, template_id: UUID, body: str | None, is_active: bool | None
    ) -> ConsentTemplate:
        template = await self.get_template(db, practice_id, template_id)
        # Editing the body is what versions — bumping the counter in place
        # rather than inserting a new row, since ConsentDocument already
        # snapshots content+version permanently at signing time (that's
        # what makes an edit here safe in the first place).
        if body is not None and body != template.body:
            template.body = body
            template.version += 1
        if is_active is not None:
            template.is_active = is_active
        await db.flush()
        await db.refresh(template)
        return template
