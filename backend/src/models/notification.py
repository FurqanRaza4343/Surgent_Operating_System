import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Notification(Base):
    """Lightweight in-app notification — the piece of the notification
    engine the existing SMS/WhatsApp (MessagingService) and Email
    (EmailService) paths don't cover on their own. `user_id` null means
    practice-wide (every staff member sees it, e.g. "a payment came in");
    set means targeted at one person. Real event triggers live at their
    existing call sites (invoice mark-paid, consent document created, …) —
    see NotificationService's own docstring.

    Deliberate simplification: `read_at` is one field per row, not a
    per-user read table — a practice-wide notification's read state is
    shared (whichever staff member reads/dismisses it first marks it read
    for the whole practice), the same way a shared team inbox works. A true
    per-user read state would need a join table; not worth the complexity
    for a lightweight FYI feed."""

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practices.id"), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=True)
    resource_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    practice = relationship("Practice")
    user = relationship("User")
