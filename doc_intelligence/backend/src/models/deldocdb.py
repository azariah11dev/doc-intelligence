from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID

from src.services.model_dependencies.database import Base

class DeletedVectors(Base):
    __tablename__ = "deleted_vectors"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)

    upload_filename = Column(String)
    saved_filename = Column(String)
    file_path = Column(String)

    collection_name = Column(String)

    delete_ts = Column(DateTime(timezone=True), server_default=func.now())
    reason = Column(String, nullable=True)


class DeletedDocument(Base):
    __tablename__ = "deleted_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)

    upload_filename = Column(String)
    saved_filename = Column(String)
    file_path = Column(String)

    collection_name = Column(String)

    deleted_by = Column(String, nullable=False)
    delete_ts = Column(DateTime(timezone=True), server_default=func.now())

    reason = Column(Text, nullable=False)
