from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import DeclarativeBase
import os

from src.schemas.env_schema import settings


def get_engine():
    DATABASE_URL = settings.DATABASE_URL or os.getenv("DATABASE_URL")
    if DATABASE_URL is None:
        raise RuntimeError("DATABASE_URL is not set in environment or .env file")
    return create_async_engine(DATABASE_URL, echo=True)

engine = get_engine()

class Base(DeclarativeBase):
    pass

async def create_db_and_tables():
    from src.models.usersdb import Users

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)