from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.sql import func

from src.services.model_dependencies.database import Base

class ContactHistory(Base):
    __tablename__ = "contact_history"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # When the row was inserted and changed
    modified_date = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    username = Column(String, nullable=False)

    email = Column(String, nullable=False)

    message = Column(String, nullable=False)