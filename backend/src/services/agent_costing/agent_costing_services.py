from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.agent_costing import AgentCosting

# Per-session cost, tiered by what the agent actually does — vision/real-time
# agents (photo/video) cost the most, simple rule-based ones (reminders) the
# least. Mirrors the 31-agent roster in frontend/src/data/agents/index.ts —
# if an agent is added/renamed there, update here too.
DEFAULT_COSTS: dict[str, float] = {
    # Front Desk & Intake — high-volume, cheap
    "receptionist": 0.12,
    "appointment_booking": 0.10,
    "reschedule_cancellation": 0.10,
    "appointment_reminder": 0.06,
    "multilingual_translation": 0.15,
    # Consultation & Screening — vision/multi-turn agents cost the most on the platform
    "ai_consultation": 0.85,
    "photo_analysis": 1.20,
    "video_consultation": 2.50,
    "medical_history_intake": 0.25,
    "risk_assessment": 0.35,
    "procedure_recommendation": 0.40,
    "pre_surgery_preparation": 0.30,
    # Surgery Management — scheduling/logistics
    "surgery_scheduling": 0.28,
    "surgeon_calendar": 0.18,
    "operating_room_scheduler": 0.32,
    "equipment_checklist": 0.20,
    "implant_inventory": 0.22,
    "surgical_documentation": 0.45,
    # Post-Surgery Care — monitoring
    "recovery_followup": 0.25,
    "healing_monitoring": 0.30,
    "emergency_triage": 0.55,
    "medication_reminder": 0.08,
    "wound_care_guidance": 0.35,
    "recovery_dashboard": 0.28,
    # Business & Operations — analytics/financial
    "cost_estimation": 0.30,
    "payment_invoice": 0.20,
    "insurance_verification": 0.35,
    "analytics_dashboard": 0.65,
    "patient_feedback": 0.15,
    "marketing_followup": 0.18,
    "lead_nurturing": 0.20,
}


class AgentCostingService:
    async def list_all(self, db: AsyncSession) -> list[AgentCosting]:
        result = await db.execute(select(AgentCosting))
        rows = result.scalars().all()
        if not rows:
            # Self-seeding on first read — no separate seed script to remember
            # to run, matches this app's "just works" pattern elsewhere
            # (useDoctors.ts/usePracticeProfile.ts seed their own defaults too).
            rows = await self._seed_defaults(db)
        return list(rows)

    async def _seed_defaults(self, db: AsyncSession) -> list[AgentCosting]:
        rows = [AgentCosting(agent_slug=slug, cost_per_session=cost, is_active=True) for slug, cost in DEFAULT_COSTS.items()]
        db.add_all(rows)
        await db.flush()
        return rows
