import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, func
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
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    practice = relationship("Practice", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="doctor", cascade="all, delete-orphan")
