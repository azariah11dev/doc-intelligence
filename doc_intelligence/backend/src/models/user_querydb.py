from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID

from src.services.model_dependencies.database import Base

class Conversation(Base):
    __tablename__ = "conversation"

    id = Column(UUID(as_uuid=True), primary_key=True)

    username = Column(String, nullable=False, index=True)

    created_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )

    last_updated = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )


class ChatMessage(Base):
    __tablename__ = "chat_message"

    id = Column(Integer, primary_key=True, autoincrement=True)

    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversation.id"),
        nullable=False,
        index=True
    )

    query = Column(String, nullable=False)

    response = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Optional RAG metadata
    rephrase = Column(Text, nullable=True)


class MessageContext(Base):
    __tablename__ = "message_context"

    id = Column(Integer, primary_key=True, autoincrement=True)

    message_id = Column(Integer, ForeignKey("chat_message.id"), nullable=False)

    context = Column(Text, nullable=False)
