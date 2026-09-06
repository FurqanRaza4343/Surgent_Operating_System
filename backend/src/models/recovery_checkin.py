import enum
import uuid
from datetime import datetime

from sqlalchemy import String, Text, Integer, Float, Boolean, DateTime, ForeignKey, func, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class RecoveryCheckpoint(str, enum.Enum):
    DAY_1 = "day_1"
    DAY_3 = "day_3"
    DAY_7 = "day_7"
    DAY_14 = "day_14"
    MONTH_1 = "month_1"
    OTHER = "other"


class SwellingLevel(str, enum.Enum):
    NONE = "none"
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"


class RecoveryCheckIn(Base):
    """One patient-submitted checkpoint against a RecoveryJournal — the
    piece that made RecoveryJournal real (previously a model with zero
    writers). Patient-facing via the Portal (see patient_portal endpoints);
    staff review a flagged queue on the dashboard side.

    `flagged_for_review` is set by a plain threshold rule in
    recovery_services.py (pain/fever/swelling/free-text-concern), never by
    an LLM — this module's job is explicitly collect → classify → alert,
    never diagnose, matching the project's existing "no unqualified
    clinical claims" boundary. A flag means "a human should look at this,"
    not a clinical conclusion."""

    __tablename__ = "recovery_checkins"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recovery_journal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("recovery_journals.id"), nullable=False)
    checkpoint: Mapped[RecoveryCheckpoint] = mapped_column(Enum(RecoveryCheckpoint), nullable=False)

    pain_score: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-10
    swelling_level: Mapped[SwellingLevel | None] = mapped_column(Enum(SwellingLevel), nullable=True)
    temperature_celsius: Mapped[float | None] = mapped_column(Float, nullable=True)
    symptoms: Mapped[list] = mapped_column(JSONB, default=list)  # free-text tags, e.g. ["nausea", "redness"]
    concerns: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    flagged_for_review: Mapped[bool] = mapped_column(Boolean, default=False)
    flag_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    recovery_journal = relationship("RecoveryJournal", back_populates="checkins")
    reviewed_by = relationship("User")
