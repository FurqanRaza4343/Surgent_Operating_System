import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class PatientPhoto(Base):
    __tablename__ = "patient_photos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    cloudinary_public_id: Mapped[str] = mapped_column(String(255), nullable=False)
    cloudinary_url: Mapped[str] = mapped_column(Text, nullable=False)
    photo_type: Mapped[str] = mapped_column(String(50), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    # --- Before/after timeline (Week 2) ---------------------------------
    # A fixed progression point — see data/photoStages.ts on the frontend
    # for the exact set (before/day7/day14/1mo/3mo/6mo/1yr/other). Kept as
    # free text (not an Enum) so a practice's own odd checkpoint doesn't
    # need a migration; the frontend still only offers the fixed set.
    stage: Mapped[str] = mapped_column(String(20), nullable=True)
    body_area: Mapped[str] = mapped_column(String(100), nullable=True)
    procedure_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("procedures.id"), nullable=True)
    # Independently controllable from the patient's general clinical
    # consent — the user's own explicit ask: a patient can consent to
    # clinical photo storage without consenting to marketing use, or vice
    # versa is meaningless since marketing implies clinical storage already
    # happened. Defaults False — an affirmative opt-in, never assumed.
    is_marketing_approved: Mapped[bool] = mapped_column(default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="photos")
    procedure = relationship("Procedure")
