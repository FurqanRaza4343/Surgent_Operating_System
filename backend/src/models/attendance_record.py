import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practices.id"), nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    check_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    check_out_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    practice = relationship("Practice", back_populates="attendance_records")
    doctor = relationship("Doctor", back_populates="attendance_records")
