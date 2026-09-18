from sqlalchemy import Column, String, DateTime, Integer, Text
from sqlalchemy.sql import func

from services.model_dependencies.database import Base

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, autoincrement=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    username = Column(String, nullable=False, index=True)

    query = Column(Text, nullable=False)

    rephrase = Column(Text, nullable=False)
    
    response = Column(Text, nullable=False)

    context = Column(Text, nullable=True)
