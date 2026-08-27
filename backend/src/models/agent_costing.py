import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, DateTime, Boolean, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base

# Platform-wide, not practice-scoped (no practice_id) — what an agent costs
# to RUN is the same for every practice, unlike Subscription/AgentConfig
# which are per-practice. One row per agent slug (31 total once seeded).


class AgentCosting(Base):
    __tablename__ = "agent_costing"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_slug: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    cost_per_session: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    total_sessions: Mapped[int] = mapped_column(default=0)
    total_earned: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<AgentCosting {self.agent_slug}: ${self.cost_per_session}>"