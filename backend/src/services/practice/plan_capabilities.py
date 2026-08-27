"""The backend enforcement mirror of
frontend/src/app/dashboard/plan/planCapabilities.ts — same mapping, same
derivation from data/plans.ts's marketing copy, kept as a SEPARATE file on
purpose (not shared code — frontend/backend are different languages/deploys)
so a change to what a plan includes means updating both files deliberately,
not a silent one-sided drift. If you change one, change the other.

The frontend file is presentation only (gates what's shown/clickable) and is
trivially bypassed via devtools. THIS file is what actually matters for
security — every endpoint that scopes access by plan tier must go through
require_plan_feature()/require_agent_category() in server/dependencies.py,
which read from here.
"""
from __future__ import annotations

from src.models.subscription import SubscriptionTier

# Mirrors frontend/src/data/agents/index.ts's AGENT_CATEGORIES groupings —
# the backend has no separate "category" model, so this is the one place
# that encodes which of the 31 agent slugs belong to which category.
AGENT_CATEGORIES: dict[str, list[str]] = {
    "front-desk": [
        "receptionist",
        "appointment_booking",
        "reschedule_cancellation",
        "appointment_reminder",
        "multilingual_translation",
    ],
    "consultation": [
        "ai_consultation",
        "photo_analysis",
        "video_consultation",
        "medical_history_intake",
        "risk_assessment",
        "procedure_recommendation",
        "pre_surgery_preparation",
    ],
    "surgery": [
        "surgery_scheduling",
        "surgeon_calendar",
        "operating_room_scheduler",
        "equipment_checklist",
        "implant_inventory",
        "surgical_documentation",
    ],
    "post-care": [
        "recovery_followup",
        "healing_monitoring",
        "emergency_triage",
        "medication_reminder",
        "wound_care_guidance",
        "recovery_dashboard",
    ],
    "business": [
        "cost_estimation",
        "payment_invoice",
        "insurance_verification",
        "analytics_dashboard",
        "patient_feedback",
        "marketing_followup",
        "lead_nurturing",
    ],
}

# Category ids unlocked per tier — same derivation as the frontend's
# planCapabilities.ts (each line traceable to a data/plans.ts feature string).
TIER_CATEGORIES: dict[SubscriptionTier, list[str]] = {
    SubscriptionTier.SOLO: ["front-desk"],
    SubscriptionTier.PRACTICE: ["front-desk", "consultation", "surgery", "post-care"],
    SubscriptionTier.ENTERPRISE: ["front-desk", "consultation", "surgery", "post-care", "business"],
    SubscriptionTier.CUSTOM: ["front-desk", "consultation", "surgery", "post-care", "business"],
}

TIER_LIMITS: dict[SubscriptionTier, dict[str, float]] = {
    SubscriptionTier.SOLO: {"max_doctors": 1, "max_social_channels": 1, "max_locations": 1},
    SubscriptionTier.PRACTICE: {"max_doctors": float("inf"), "max_social_channels": float("inf"), "max_locations": 1},
    SubscriptionTier.ENTERPRISE: {"max_doctors": float("inf"), "max_social_channels": float("inf"), "max_locations": float("inf")},
    SubscriptionTier.CUSTOM: {"max_doctors": float("inf"), "max_social_channels": float("inf"), "max_locations": float("inf")},
}


def allowed_categories(tier: SubscriptionTier) -> list[str]:
    return TIER_CATEGORIES.get(tier, TIER_CATEGORIES[SubscriptionTier.SOLO])


def allowed_agent_slugs(tier: SubscriptionTier) -> set[str]:
    categories = allowed_categories(tier)
    return {slug for cat in categories for slug in AGENT_CATEGORIES.get(cat, [])}


def category_for_agent(agent_slug: str) -> str | None:
    for cat, slugs in AGENT_CATEGORIES.items():
        if agent_slug in slugs:
            return cat
    return None


def allows_category(tier: SubscriptionTier, category_id: str) -> bool:
    return category_id in allowed_categories(tier)


def allows_agent(tier: SubscriptionTier, agent_slug: str) -> bool:
    return agent_slug in allowed_agent_slugs(tier)


def has_analytics(tier: SubscriptionTier) -> bool:
    return tier in (SubscriptionTier.PRACTICE, SubscriptionTier.ENTERPRISE, SubscriptionTier.CUSTOM)


def limits_for(tier: SubscriptionTier) -> dict[str, float]:
    return TIER_LIMITS.get(tier, TIER_LIMITS[SubscriptionTier.SOLO])
