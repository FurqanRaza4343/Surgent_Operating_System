import uuid
from datetime import datetime, date
from decimal import Decimal

from sqlalchemy import String, Text, DateTime, Date, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practices.id"), nullable=False)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=True)
    medical_history: Mapped[dict] = mapped_column(JSONB, default=dict)
    consent_status: Mapped[bool] = mapped_column(default=False)
    plan_type: Mapped[str] = mapped_column(String(50), default="solo")  # "solo" or "enterprise"
    chief_complaint: Mapped[str] = mapped_column(Text, nullable=True)  # What the patient described — what the AI assignment below is based on
    needs_surgery: Mapped[bool] = mapped_column(default=False)
    ai_agent_assigned: Mapped[str] = mapped_column(String(100), nullable=True)  # Which agent is handling this patient
    agent_status: Mapped[str] = mapped_column(String(20), default="inactive")  # "active" or "inactive"
    agent_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0)  # Per-agent cost tracking
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    practice = relationship("Practice", back_populates="patients")
    photos = relationship("PatientPhoto", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    recovery_journals = relationship("RecoveryJournal", back_populates="patient", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="patient", cascade="all, delete-orphan")
    review_requests = relationship("ReviewRequest", back_populates="patient", cascade="all, delete-orphan")
