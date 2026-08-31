from __future__ import annotations
from pydantic import BaseModel


class OverviewSummaryResponse(BaseModel):
    sessions_today: int
    needs_attention: int
    bookings_this_week: int
    # Sum of completed TreatmentPlanItems' actual/estimated price — real,
    # clinically-linked revenue, not a projection. None (not 0) when nothing
    # is completed yet, so the frontend can show an honest "not enough data"
    # state instead of a fabricated $0.
    revenue_estimate: float | None = None


class ChannelCount(BaseModel):
    channel: str
    count: int


class CategoryCount(BaseModel):
    category: str
    count: int


class SessionAnalyticsResponse(BaseModel):
    total_conversations: int
    active_count: int
    needs_attention_count: int
    resolved_count: int
    by_channel: list[ChannelCount]
    by_category: list[CategoryCount]
