import enum
import uuid
from datetime import date, datetime

from sqlalchemy import String, Text, Date, DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class WaitlistEntryStatus(str, enum.Enum):
    WAITING = "waiting"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"


class WaitlistEntry(Base):
    """A patient (or not-yet-a-patient lead) who couldn't get a slot on their
    preferred day and wants to be called if one opens up — front desk's own
    "call them back" list, separate from the Leads/Funnel CRM pipeline
    (that's marketing-stage tracking; this is a same-week scheduling need).
    `patient_id` is nullable since a walk-in asking "do you have anything
    Thursday?" doesn't require an existing Patient record to be waitlisted."""

    __tablename__ = "waitlist_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practices.id"), nullable=False)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=True)
    patient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=True)
    requested_date: Mapped[date] = mapped_column(Date, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[WaitlistEntryStatus] = mapped_column(Enum(WaitlistEntryStatus), default=WaitlistEntryStatus.WAITING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    practice = relationship("Practice")
    patient = relationship("Patient")
    doctor = relationship("Doctor")
