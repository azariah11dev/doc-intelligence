from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.sql import func
from services.model_dependencies.database import Base

class Users(Base):
    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String(50), unique=True, index=True, nullable=False)

    email = Column(String(255), unique=True, index=True, nullable=False)

    password_hash = Column(String(255), nullable=False)

    role = Column(String(50), nullable= False, default="User")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())