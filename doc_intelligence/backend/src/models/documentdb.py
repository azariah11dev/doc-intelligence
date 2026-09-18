from sqlalchemy import Column, String, DateTime, Integer, Text, Enum

from services.model_dependencies.database import Base

class Document(Base):
    __tablename__ = "documents"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True)

    upload_filename = Column(String)

    saved_filename = Column(String)

    file_type = Column(String)

    file_size = Column(Integer)

    file_path = Column(String)

    upload_ts = Column(DateTime)

    action = Column(String, nullable=True)

    status = Column(Enum("UPLOADED", "SUCCESS", "FAILED"))

    error = Column(Text, nullable=True)
