import uuid
from datetime import datetime, date

from sqlalchemy import String, Text, Integer, DateTime, Date, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class RecoveryJournal(Base):
    __tablename__ = "recovery_journals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    procedure_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("procedures.id"), nullable=True)
    surgery_date: Mapped[date] = mapped_column(Date, nullable=True)
    recovery_day: Mapped[int] = mapped_column(Integer, default=0)
    healing_score: Mapped[int] = mapped_column(Integer, nullable=True)
    medication_adherence: Mapped[float] = mapped_column(Integer, nullable=True)
    checkin_completion: Mapped[float] = mapped_column(Integer, nullable=True)
    notes: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(50), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    patient = relationship("Patient", back_populates="recovery_journals")
