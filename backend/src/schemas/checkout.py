from __future__ import annotations
from pydantic import BaseModel, EmailStr


class CheckoutSessionRequest(BaseModel):
    email: EmailStr
    plan_tier: str  # "solo" | "practice" — Enterprise never reaches this endpoint, see Pricing.tsx


class CheckoutSessionResponse(BaseModel):
    url: str


class CheckoutSessionStatusResponse(BaseModel):
    paid: bool
    plan_tier: str
    email: str
    claimed: bool
