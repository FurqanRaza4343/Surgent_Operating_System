import uuid
from datetime import datetime

from sqlalchemy import Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class StaffMessage(Base):
    """One message in a thread between the Owner and one staff member
    (Doctor or Receptionist) — `staff_user_id` identifies whose thread a
    message belongs to regardless of who wrote it (`sender_id`), so a
    thread is just every row sharing the same (practice_id, staff_user_id)."""

    __tablename__ = "staff_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practices.id"), nullable=False)
    staff_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    practice = relationship("Practice", back_populates="staff_messages")
    staff_user = relationship("User", foreign_keys=[staff_user_id])
    sender = relationship("User", foreign_keys=[sender_id])
