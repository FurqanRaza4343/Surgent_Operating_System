from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class AdminSummaryResponse(BaseModel):
    total_clinics: int
    plan_distribution: dict[str, int]
    total_estimated_mrr: float
    total_estimated_cost: float
    total_estimated_margin: float
    margin_percent: float
    assumption_note: str = "Estimated — based on an assumed average of 150 sessions/agent/month, not live usage."


class AdminPracticeListItem(BaseModel):
    id: UUID
    name: str
    email: str
    plan_tier: str
    subscription_status: str
    agents_enabled_count: int
    estimated_monthly_cost: float
    estimated_monthly_revenue: float
    joined_at: datetime


class AgentCostBreakdownItem(BaseModel):
    agent_slug: str
    enabled: bool
    cost_per_session: float
    estimated_monthly_cost: float


class AdminPracticeDetailResponse(BaseModel):
    id: UUID
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    plan_tier: str
    subscription_status: str
    estimated_monthly_revenue: float
    estimated_monthly_cost: float
    agent_breakdown: list[AgentCostBreakdownItem]
    joined_at: datetime


class UpdateSubscriptionRequest(BaseModel):
    tier: str


class AdminUserResponse(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    practice_id: UUID
    is_platform_admin: bool

    class Config:
        from_attributes = True


class UpdateAdminUserRequest(BaseModel):
    is_platform_admin: bool


class AdminMeResponse(BaseModel):
    username: str
    role: str = "platform_admin"


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class SalesLeadResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    message: Optional[str] = None
    source: str
    status: str
    conversation_id: Optional[UUID] = None
    created_at: datetime


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
