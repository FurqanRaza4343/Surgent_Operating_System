import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class AuditLog(Base):
    """A dedicated security/compliance audit trail — separate from AgentLog,
    which is AI-action-specific (agent_type, LLM-driven actions). This is for
    real access/modification events on sensitive resources: who looked at or
    changed a patient record, downloaded a photo, signed/edited a consent,
    or changed an appointment, and from where. Wired via a reusable FastAPI
    dependency (see server/audit.py) added at the router-dependency level on
    the endpoints that touch that data, rather than hand-written per call
    site — see the dependency's own docstring for why."""

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Nullable — a few audited events (e.g. a failed Patient Portal login
    # attempt with a portal_id that doesn't resolve to a real patient) have
    # no practice to scope to yet.
    practice_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("practices.id"), nullable=True)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    # "user" | "patient_portal" | "ai_agent" | "system" — distinguishes a
    # staff Clerk-authenticated action from a patient's own portal session
    # from something the platform did on its own, since actor_user_id alone
    # can't tell those apart (a patient portal session has no User row).
    actor_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # Dot-namespaced, e.g. "patient.view", "consent.sign", "photo.download",
    # "appointment.update", "portal_login.failed" — free-text by design
    # (mirrors AgentLog.action) so new audited actions don't need a schema
    # migration to add.
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    practice = relationship("Practice", back_populates="audit_logs")
    actor_user = relationship("User")
