from __future__ import annotations
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.conversation import Conversation, ConversationStatus
from src.models.appointment import Appointment
from src.models.treatment_plan import TreatmentPlan, TreatmentPlanItem, TreatmentPlanItemStatus
from src.services.practice.plan_capabilities import AGENT_CATEGORIES, category_for_agent
from src.schemas.analytics import OverviewSummaryResponse, SessionAnalyticsResponse, ChannelCount, CategoryCount


def _start_of_today() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


class AnalyticsService:
    """Real aggregate queries over Conversation/Appointment — replaces the
    dashboard's MOCK_SESSIONS-derived numbers. Practice-scoped; callers must
    always pass the requesting user's own practice_id."""

    async def get_overview_summary(self, db: AsyncSession, practice_id: UUID) -> OverviewSummaryResponse:
        today = _start_of_today()
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)

        sessions_today = await db.scalar(
            select(func.count()).select_from(Conversation).where(
                Conversation.practice_id == practice_id, Conversation.created_at >= today
            )
        )
        needs_attention = await db.scalar(
            select(func.count()).select_from(Conversation).where(
                Conversation.practice_id == practice_id, Conversation.status == ConversationStatus.NEEDS_ATTENTION
            )
        )
        bookings_this_week = await db.scalar(
            select(func.count()).select_from(Appointment).where(
                Appointment.practice_id == practice_id, Appointment.created_at >= week_ago
            )
        )

        # Revenue estimate — decision #4 in the roadmap: real, not a
        # fabricated number. Only counts TreatmentPlanItems actually marked
        # COMPLETED, using the real price actually charged when set,
        # falling back to the plan's estimate otherwise.
        revenue_rows = (
            await db.execute(
                select(TreatmentPlanItem.actual_price, TreatmentPlanItem.estimated_price)
                .join(TreatmentPlan, TreatmentPlanItem.treatment_plan_id == TreatmentPlan.id)
                .where(TreatmentPlan.practice_id == practice_id, TreatmentPlanItem.status == TreatmentPlanItemStatus.COMPLETED)
            )
        ).all()
        priced_rows = [(actual if actual is not None else estimated) for actual, estimated in revenue_rows]
        priced_rows = [p for p in priced_rows if p is not None]
        revenue_estimate = float(sum(priced_rows)) if priced_rows else None

        return OverviewSummaryResponse(
            sessions_today=sessions_today or 0,
            needs_attention=needs_attention or 0,
            bookings_this_week=bookings_this_week or 0,
            revenue_estimate=revenue_estimate,
        )

    async def get_session_analytics(self, db: AsyncSession, practice_id: UUID) -> SessionAnalyticsResponse:
        status_counts = dict(
            (
                await db.execute(
                    select(Conversation.status, func.count())
                    .where(Conversation.practice_id == practice_id)
                    .group_by(Conversation.status)
                )
            ).all()
        )

        channel_rows = (
            await db.execute(
                select(Conversation.channel, func.count())
                .where(Conversation.practice_id == practice_id)
                .group_by(Conversation.channel)
            )
        ).all()
        by_channel = [ChannelCount(channel=channel.value, count=count) for channel, count in channel_rows]

        agent_type_rows = (
            await db.execute(
                select(Conversation.agent_type, func.count())
                .where(Conversation.practice_id == practice_id)
                .group_by(Conversation.agent_type)
            )
        ).all()
        category_totals: dict[str, int] = {cat: 0 for cat in AGENT_CATEGORIES}
        for agent_type, count in agent_type_rows:
            category = category_for_agent(agent_type) or "business"
            category_totals[category] = category_totals.get(category, 0) + count
        by_category = [CategoryCount(category=cat, count=count) for cat, count in category_totals.items()]

        total = sum(status_counts.values())

        return SessionAnalyticsResponse(
            total_conversations=total,
            active_count=status_counts.get(ConversationStatus.ACTIVE, 0),
            needs_attention_count=status_counts.get(ConversationStatus.NEEDS_ATTENTION, 0),
            resolved_count=status_counts.get(ConversationStatus.RESOLVED, 0),
            by_channel=by_channel,
            by_category=by_category,
        )
