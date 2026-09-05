import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Numeric, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practices.id"), nullable=False)
    # Nullable+unique: a Doctor is a practice-managed roster entry that can
    # exist before (or without) ever accepting a login invite — mirrors how
    # Patient has no User counterpart at all. Set once the invited Clerk user
    # completes sign-up (see webhooks/webhook_router.py's user.created handler).
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    specialty: Mapped[str] = mapped_column(String(255), nullable=True)
    license_number: Mapped[str] = mapped_column(String(100), nullable=True)
    bio: Mapped[str] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str] = mapped_column(String(500), nullable=True)
    capabilities: Mapped[list] = mapped_column(JSONB, default=list)
    # Granular dashboard access beyond the baseline doctor shell — set by the
    # Owner at application-approval time (see services/doctor_applications/).
    # Keys come from data/doctor_permissions.py's static catalog.
    permissions: Mapped[list] = mapped_column(JSONB, default=list)
    # Structured credentials — list of {degree, institution, year}. Kept
    # separate from free-text `bio` so a future "Doctor" public profile can
    # render qualifications as a real list, not parse prose.
    qualifications: Mapped[list] = mapped_column(JSONB, default=list)
    # Multi-value specializations for display/filtering — `specialty` above
    # stays as the single headline one shown in compact UI (patient cards,
    # appointment rows) so nothing that reads `specialty` today needs to change.
    specializations: Mapped[list] = mapped_column(JSONB, default=list)
    # Per-weekday ranges, e.g. {"mon": [{"start": "09:00", "end": "17:00"}], "tue": [...]}.
    # One-off exceptions (a holiday, an extra Saturday clinic) live in
    # DoctorAvailability below rather than here, so the recurring schedule
    # never has to be rewritten for a single date.
    working_hours: Mapped[dict] = mapped_column(JSONB, default=dict)
    commission_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    signature_url: Mapped[str] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    practice = relationship("Practice", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="doctor", cascade="all, delete-orphan")
    procedures = relationship("DoctorProcedure", back_populates="doctor", cascade="all, delete-orphan")
    availability_overrides = relationship("DoctorAvailability", back_populates="doctor", cascade="all, delete-orphan")


class DoctorProcedure(Base):
    """Real link between a Doctor and the practice's Procedure catalog —
    replaces relying on `Doctor.capabilities`' free-text tags for "what does
    this doctor do," and lets each doctor carry their own fee for a
    procedure (the catalog's own `base_price` is just the practice default)."""

    __tablename__ = "doctor_procedures"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    procedure_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("procedures.id"), nullable=False)
    consultation_fee: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    surgery_fee: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    doctor = relationship("Doctor", back_populates="procedures")
    procedure = relationship("Procedure")


class DoctorAvailability(Base):
    """One-off schedule overrides — a blocked day (holiday, leave) or an
    extra clinic outside the recurring `Doctor.working_hours` pattern."""

    __tablename__ = "doctor_availability"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_available: Mapped[bool] = mapped_column(default=False)
    # Populated only when is_available=True (an extra clinic day) — the
    # normal working_hours shape for that one date, e.g. [{"start": "10:00", "end": "14:00"}].
    hours: Mapped[list] = mapped_column(JSONB, default=list)
    reason: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    doctor = relationship("Doctor", back_populates="availability_overrides")
