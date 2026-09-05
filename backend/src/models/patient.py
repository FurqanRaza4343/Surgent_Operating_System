import enum
import uuid
from datetime import datetime, date
from decimal import Decimal

from sqlalchemy import String, Text, DateTime, Date, Enum, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class PatientLifecycleStage(str, enum.Enum):
    INQUIRY = "inquiry"
    CONTACTED = "contacted"
    CONSULT_SCHEDULED = "consult_scheduled"
    CONSULT_COMPLETED = "consult_completed"
    TREATMENT_PLANNED = "treatment_planned"
    PATIENT = "patient"
    LOST = "lost"


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
    # CRM funnel stage — separate from the frontend's derived `status`
    # ("active"/"lead"), which stays booking-based (has_upcoming/has_completed
    # appointment) for backward compat. This is the richer, explicit stage a
    # front-desk/marketing workflow actually tracks a lead through.
    lifecycle_stage: Mapped[PatientLifecycleStage] = mapped_column(
        Enum(PatientLifecycleStage), nullable=False, default=PatientLifecycleStage.INQUIRY
    )
    lost_reason: Mapped[str] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(String(100), nullable=True)  # e.g. "Instagram", "Referral", "Walk-in"
    # Patient Portal login — a human-readable ID (e.g. "AP-2026-00042") the
    # patient is meant to remember, verified against a bcrypt-hashed PIN.
    # Replaces an earlier plaintext-link-token scheme entirely (see
    # patient_portal_services.py) — portal_enabled still gates access on/off.
    portal_id: Mapped[str | None] = mapped_column(String(32), nullable=True, unique=True)
    portal_pin_hash: Mapped[str | None] = mapped_column(String(100), nullable=True)
    portal_enabled: Mapped[bool] = mapped_column(default=False)

    # --- Patient profile depth (Week 2) ---------------------------------
    gender: Mapped[str] = mapped_column(String(30), nullable=True)
    emergency_contact_name: Mapped[str] = mapped_column(String(255), nullable=True)
    emergency_contact_phone: Mapped[str] = mapped_column(String(50), nullable=True)
    # List of {name, severity, reaction} — kept separate from the general
    # medical_history blob above so it's the one thing every clinical screen
    # can surface prominently without parsing free text.
    allergies: Mapped[list] = mapped_column(JSONB, default=list)
    # `medical_history` above stays as-is (general conditions); this is the
    # patient's own surgical history specifically — list of {procedure,
    # year, facility, notes}.
    surgical_history: Mapped[list] = mapped_column(JSONB, default=list)
    # List of {name, dosage, frequency} — current, not historical.
    current_medications: Mapped[list] = mapped_column(JSONB, default=list)
    smoking_status: Mapped[str] = mapped_column(String(30), nullable=True)
    # List of {procedure, year, provider} — cosmetic work done elsewhere,
    # before this practice; distinct from this practice's own TreatmentPlan
    # records.
    previous_cosmetic_procedures: Mapped[list] = mapped_column(JSONB, default=list)
    # Who specifically referred this patient (a person's name — "Dr. Ahmed",
    # "existing patient Sara Khan") — distinct from `source` above, which is
    # the marketing CHANNEL ("Instagram", "Referral", "Walk-in"). A lead can
    # have a channel of "Referral" and a referral_source naming exactly who.
    referral_source: Mapped[str] = mapped_column(String(255), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(50), nullable=True)
    # {"sms": true, "email": true, "whatsapp": false, ...}
    communication_preferences: Mapped[dict] = mapped_column(JSONB, default=dict)
    insurance_provider: Mapped[str] = mapped_column(String(255), nullable=True)
    insurance_number: Mapped[str] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    practice = relationship("Practice", back_populates="patients")
    photos = relationship("PatientPhoto", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    recovery_journals = relationship("RecoveryJournal", back_populates="patient", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="patient", cascade="all, delete-orphan")
    review_requests = relationship("ReviewRequest", back_populates="patient", cascade="all, delete-orphan")
    consent_documents = relationship("ConsentDocument", back_populates="patient", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="patient", cascade="all, delete-orphan")
