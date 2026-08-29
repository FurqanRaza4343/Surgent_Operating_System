import enum
import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class DoctorRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class PendingDoctorRequest(Base):
    """A doctor's self-registration application — from Clerk sign-up (via a
    practice's shareable signup code, see Practice.settings) through Owner
    review to becoming a real Doctor row. The applicant's User row already
    exists by the time this is created (the `user.created` webhook makes it,
    inactive, as soon as Clerk sign-up completes) — this table just holds
    what they submit about themselves until an Owner decides."""

    __tablename__ = "pending_doctor_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practices.id"), nullable=False)
    # One pending application per Clerk account — resubmitting updates the
    # same row rather than creating duplicates.
    clerk_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    specialty: Mapped[str] = mapped_column(String(255), nullable=True)
    license_number: Mapped[str] = mapped_column(String(100), nullable=True)
    bio: Mapped[str] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str] = mapped_column(String(500), nullable=True)
    # [{"name": "...", "url": "...", "uploaded_at": "..."}]
    documents: Mapped[list] = mapped_column(JSONB, default=list)
    status: Mapped[DoctorRequestStatus] = mapped_column(Enum(DoctorRequestStatus), default=DoctorRequestStatus.PENDING)
    rejected_reason: Mapped[str] = mapped_column(Text, nullable=True)
    # Set once approved — the real Doctor row this application became.
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    practice = relationship("Practice", back_populates="pending_doctor_requests")
