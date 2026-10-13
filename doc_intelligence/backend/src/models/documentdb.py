from sqlalchemy import Column, String, DateTime, Integer, Text, Enum
from sqlalchemy.dialects.postgresql import UUID

from src.services.model_dependencies.database import Base

class Document(Base):
    __tablename__ = "documents"
    __table_args__ = {"extend_existing": True}

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)

    upload_filename = Column(String)

    saved_filename = Column(String)

    file_type = Column(String)

    file_size = Column(Integer)

    file_path = Column(String)

    upload_ts = Column(DateTime(timezone=True))

    action = Column(String, nullable=True)

    status = Column(Enum("UPLOADED", "PROCESSING", "SUCCESS", "FAILED", name="status_enum"))

    error = Column(Text, nullable=True)
