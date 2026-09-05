from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.dependencies import get_current_practice_user
from src.models.user import User
from src.models.conversation import ConversationStatus
from src.schemas.conversation import ConversationListItem, ConversationDetail, CreateMessageRequest, ToggleAiRequest
from src.controller.conversations.conversations_controllers import ConversationsController

router = APIRouter(prefix="/conversations", tags=["Conversations"])
controller = ConversationsController()


@router.get("", response_model=list[ConversationListItem])
async def list_conversations(
    status: ConversationStatus | None = None,
    channel: str | None = None,
    agent_type: list[str] | None = Query(default=None),
    search: str | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.list_conversations(db, user, status, channel, agent_type, search, limit, offset)


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.get_conversation(db, user, conversation_id)


@router.post("/{conversation_id}/resolve", response_model=ConversationDetail)
async def resolve_conversation(
    conversation_id: UUID,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.resolve_conversation(db, user, conversation_id)


@router.post("/{conversation_id}/messages", response_model=ConversationDetail)
async def send_message(
    conversation_id: UUID,
    data: CreateMessageRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    # A staff member replying directly — sends over the real channel
    # (WhatsApp today) and pauses AI auto-replies for this conversation.
    return await controller.send_message(db, user, conversation_id, data.body)


@router.post("/{conversation_id}/toggle-ai", response_model=ConversationDetail)
async def toggle_ai(
    conversation_id: UUID,
    data: ToggleAiRequest,
    user: User = Depends(get_current_practice_user),
    db: AsyncSession = Depends(get_db),
):
    return await controller.toggle_ai(db, user, conversation_id, data.paused)
