from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class PlanResponse(BaseModel):
    id: UUID
    tier: str
    name: str
    tagline: Optional[str] = None
    price: Optional[float] = None
    billing_period: str
    is_custom_pricing: bool
    features: list[str]
    agent_categories: list[str]
    max_doctors: Optional[int] = None
    max_social_channels: Optional[int] = None
    max_locations: Optional[int] = None
    has_analytics: bool
    stripe_price_id: Optional[str] = None
    is_active: bool
    highlight: bool
    display_order: int
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_model(cls, plan) -> "PlanResponse":
        return cls(
            id=plan.id,
            tier=plan.tier.value,
            name=plan.name,
            tagline=plan.tagline,
            price=float(plan.price) if plan.price is not None else None,
            billing_period=plan.billing_period,
            is_custom_pricing=plan.is_custom_pricing,
            features=plan.features or [],
            agent_categories=plan.agent_categories or [],
            max_doctors=plan.max_doctors,
            max_social_channels=plan.max_social_channels,
            max_locations=plan.max_locations,
            has_analytics=plan.has_analytics,
            stripe_price_id=plan.stripe_price_id,
            is_active=plan.is_active,
            highlight=plan.highlight,
            display_order=plan.display_order,
            updated_at=plan.updated_at,
        )


class PlanCreateRequest(BaseModel):
    tier: str
    name: str
    tagline: Optional[str] = None
    price: Optional[float] = None
    billing_period: str = "monthly"
    is_custom_pricing: bool = False
    features: list[str] = []
    agent_categories: list[str] = []
    max_doctors: Optional[int] = None
    max_social_channels: Optional[int] = None
    max_locations: Optional[int] = None
    has_analytics: bool = False
    stripe_price_id: Optional[str] = None
    is_active: bool = True
    highlight: bool = False
    display_order: int = 0


class PlanUpdateRequest(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    price: Optional[float] = None
    billing_period: Optional[str] = None
    is_custom_pricing: Optional[bool] = None
    features: Optional[list[str]] = None
    agent_categories: Optional[list[str]] = None
    max_doctors: Optional[int] = None
    max_social_channels: Optional[int] = None
    max_locations: Optional[int] = None
    has_analytics: Optional[bool] = None
    stripe_price_id: Optional[str] = None
    is_active: Optional[bool] = None
    highlight: Optional[bool] = None
    display_order: Optional[int] = None
