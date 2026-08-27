import uuid
import enum
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class DemoRequestStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    SCHEDULED = "scheduled"


class DemoRequest(Base):
    __tablename__ = "demo_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    practice_name: Mapped[str] = mapped_column(String(255), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[DemoRequestStatus] = mapped_column(Enum(DemoRequestStatus), default=DemoRequestStatus.NEW)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
