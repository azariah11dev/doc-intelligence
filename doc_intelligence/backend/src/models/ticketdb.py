from sqlalchemy import Column, String, DateTime, Integer, Text
from sqlalchemy.sql import func
import uuid
from sqlalchemy.dialects.postgresql import UUID

from src.services.model_dependencies.database import Base


class Tickets(Base):
    __tablename__ = "ticket"
    __table_args__ = {"extend_existing": True}

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)

    date = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    username = Column(String, nullable=False)

    email = Column(String, nullable=False)

    subject = Column(String, nullable=True)

    description = Column(Text, nullable=True)

    priority = Column(String, nullable=True)

    status = Column(String, nullable=True)

    filepath = Column(String, nullable=True)