# tests/conftest.py
import sys
import os

# backend/
backend_dir = os.path.dirname(os.path.abspath(__file__))  # tests/
backend_dir = os.path.dirname(backend_dir)                # backend/

# Add backend/ to sys.path
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# db setup
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

# IMPORTANT: match the app’s imports exactly
from src.app import app
from src.services.model_dependencies.database import Base
from src.services.model_dependencies.session_maker import get_async_session
from src.models.usersdb import Users
from src.services.auth.jwt_handler import create_access_token

DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine(
        DATABASE_URL,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
def session_maker(test_engine):
    return async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)


@pytest_asyncio.fixture
async def test_session(session_maker):
    async with session_maker() as session:
        yield session


@pytest.fixture(autouse=True)
def override_db(session_maker):
    async def _override_get_async_session():
        async with session_maker() as session:
            yield session

    # This override will now WORK
    app.dependency_overrides[get_async_session] = _override_get_async_session
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def admin_headers(test_session):
    user = Users(
        username="route-admin",
        email="route-admin@test.com",
        password_hash="unused",
        role="Admin",
    )
    test_session.add(user)
    await test_session.commit()
    token = create_access_token({"sub": user.username})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def user_headers(test_session):
    user = Users(
        username="route-user",
        email="route-user@test.com",
        password_hash="unused",
        role="User",
    )
    test_session.add(user)
    await test_session.commit()
    token = create_access_token({"sub": user.username})
    return {"Authorization": f"Bearer {token}"}
