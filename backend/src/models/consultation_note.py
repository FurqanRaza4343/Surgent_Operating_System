import enum
import uuid
from datetime import datetime

from sqlalchemy import Text, DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class ConsultationNoteStatus(str, enum.Enum):
    DRAFT = "draft"
    FINAL = "final"


class ConsultationNote(Base):
    """A doctor's clinical note for one patient encounter — SOAP-structured
    (Subjective/Objective/Assessment/Plan), the near-universal documentation
    format real EHR/EMR systems use, rather than a single free-text field.
    `final` is meant to read as immutable in the UI (a later edit creates a
    new note instead of rewriting history) — a frontend convention, not
    enforced at this layer."""

    __tablename__ = "consultation_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practices.id"), nullable=False)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    appointment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("appointments.id"), nullable=True)
    # Snapshotted from Patient.chief_complaint at note-creation time — a
    # patient's chief complaint can change between visits, so the note keeps
    # its own copy rather than a live reference that would rewrite history.
    chief_complaint: Mapped[str] = mapped_column(Text, nullable=True)
    subjective: Mapped[str] = mapped_column(Text, nullable=True)
    objective: Mapped[str] = mapped_column(Text, nullable=True)
    assessment: Mapped[str] = mapped_column(Text, nullable=True)
    plan: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[ConsultationNoteStatus] = mapped_column(Enum(ConsultationNoteStatus), default=ConsultationNoteStatus.DRAFT)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    practice = relationship("Practice", back_populates="consultation_notes")
    patient = relationship("Patient")
    doctor = relationship("Doctor")
    appointment = relationship("Appointment")
