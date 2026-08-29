"""
Seed realistic demo data for the platform admin panel: 3 practices at
different plan tiers with subscriptions and a tier-appropriate subset of
enabled agents, so estimated-cost/revenue numbers differ meaningfully
between rows (the whole point of the admin Clinics list demo).

Usage: python scripts/seed_admin_demo.py
"""

import asyncio
from datetime import date

from src.database import async_session_factory
from src.models.practice import Practice
from src.models.agent_config import AgentConfig
from src.models.subscription import Subscription, SubscriptionStatus, SubscriptionTier
from src.services.practice.plan_capabilities import AGENT_CATEGORIES, TIER_CATEGORIES


def agents_for_tier(tier: SubscriptionTier) -> list[str]:
    categories = TIER_CATEGORIES[tier]
    return [slug for cat in categories for slug in AGENT_CATEGORIES.get(cat, [])]


DEMO_PRACTICES = [
    {
        "name": "Chen Aesthetics",
        "email": "hello@chenaesthetics.demo",
        "tier": SubscriptionTier.SOLO,
        "price": 690,
        "status": SubscriptionStatus.ACTIVE,
    },
    {
        "name": "Lakeside Surgical Group",
        "email": "contact@lakesidesurgical.demo",
        "tier": SubscriptionTier.PRACTICE,
        "price": 1690,
        "status": SubscriptionStatus.ACTIVE,
    },
    {
        "name": "Coastal Plastic Partners",
        "email": "admin@coastalplastic.demo",
        "tier": SubscriptionTier.ENTERPRISE,
        "price": 4000,
        "status": SubscriptionStatus.TRIAL,
    },
]


async def seed():
    async with async_session_factory() as session:
        for demo in DEMO_PRACTICES:
            practice = Practice(name=demo["name"], email=demo["email"], phone="+10000000000")
            session.add(practice)
            await session.flush()

            session.add(Subscription(
                practice_id=practice.id,
                tier=demo["tier"],
                status=demo["status"],
                price=demo["price"],
                start_date=date.today(),
            ))

            for agent_type in agents_for_tier(demo["tier"]):
                session.add(AgentConfig(practice_id=practice.id, agent_type=agent_type, enabled=True))

            print(f"Seeded {demo['name']} — {demo['tier'].value}, {len(agents_for_tier(demo['tier']))} agents enabled")

        await session.commit()
        print("Done.")


if __name__ == "__main__":
    asyncio.run(seed())
