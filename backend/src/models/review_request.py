import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base
from src.models.conversation import ConversationChannel


class ReviewRequest(Base):
    __tablename__ = "review_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practices.id"), nullable=False)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    appointment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("appointments.id"), nullable=True)
    channel: Mapped[ConversationChannel] = mapped_column(Enum(ConversationChannel), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    review_link_clicked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    practice = relationship("Practice", back_populates="review_requests")
    patient = relationship("Patient", back_populates="review_requests")
