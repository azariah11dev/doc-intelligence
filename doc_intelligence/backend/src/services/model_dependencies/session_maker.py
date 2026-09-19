from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.services.model_dependencies.database import engine

async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

#Dependency for FastAPI
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session