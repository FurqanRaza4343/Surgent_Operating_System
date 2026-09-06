import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Practice(Base):
    __tablename__ = "practices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    address: Mapped[str] = mapped_column(Text, nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="practice", cascade="all, delete-orphan")
    patients = relationship("Patient", back_populates="practice", cascade="all, delete-orphan")
    doctors = relationship("Doctor", back_populates="practice", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="practice", cascade="all, delete-orphan")
    review_requests = relationship("ReviewRequest", back_populates="practice", cascade="all, delete-orphan")
    pending_doctor_requests = relationship("PendingDoctorRequest", back_populates="practice", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="practice", cascade="all, delete-orphan")
    agent_configs = relationship("AgentConfig", back_populates="practice", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="practice", cascade="all, delete-orphan")
    procedures = relationship("Procedure", back_populates="practice", cascade="all, delete-orphan")
    consultation_notes = relationship("ConsultationNote", back_populates="practice", cascade="all, delete-orphan")
    treatment_plans = relationship("TreatmentPlan", back_populates="practice", cascade="all, delete-orphan")
    agent_logs = relationship("AgentLog", back_populates="practice", cascade="all, delete-orphan")
    consent_documents = relationship("ConsentDocument", back_populates="practice", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="practice", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="practice", cascade="all, delete-orphan")
    inventory_items = relationship("InventoryItem", back_populates="practice", cascade="all, delete-orphan")
    staff_messages = relationship("StaffMessage", back_populates="practice", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="practice", cascade="all, delete-orphan")
