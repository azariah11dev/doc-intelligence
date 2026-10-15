import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from src.app import app
from src.schemas.response_gen import QueryRequest
from src.services.model_dependencies.session_maker import async_session_maker
from src.services.model_dependencies.database import Base


# -------------------------------------------------------------------
# FIXTURE: Use conftest session
# -------------------------------------------------------------------

@pytest.fixture
async def test_session():
    async with async_session_maker() as session:
        yield session
        await session.rollback()


# -------------------------------------------------------------------
# Fake RAG for streaming tests
# -------------------------------------------------------------------

class FakeRAG:
    def __init__(self, chunks=None, error=None):
        self.chunks = chunks or ["hello ", "world"]
        self.error = error

    async def answer(self, **kwargs):
        if self.error:
            raise self.error
        for c in self.chunks:
            yield c


@pytest.fixture
def mock_rag_success(monkeypatch):
    monkeypatch.setattr(
        "services.rag.retrieval_engine.queryRetrieval",
        lambda session: FakeRAG()
    )


@pytest.fixture
def mock_rag_error(monkeypatch):
    monkeypatch.setattr(
        "services.rag.retrieval_engine.queryRetrieval",
        lambda session: FakeRAG(error=RuntimeError("boom"))
    )


# -------------------------------------------------------------------
# TEST: Successful streaming
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_response_generation_stream_success(mock_rag_success):
    payload = {
        "question": "Hello?",
        "username": "alice",
        "rewrite_model": None,
        "generation_model": "gpt",
        "provider": "openai",
        "id": str(uuid.uuid4())
    }

    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.post("/response_generation/answer", json=payload)

    assert res.status_code == 200
    assert res.headers["content-type"] == "text/plain"

    body = res.text
    assert "hello " in body
    assert "world" in body


# -------------------------------------------------------------------
# TEST: Streaming with internal generator error
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_response_generation_stream_error(mock_rag_error):
    payload = {
        "question": "Hello?",
        "username": "alice",
        "rewrite_model": None,
        "generation_model": "gpt",
        "provider": "openai",
        "id": str(uuid.uuid4())
    }

    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.post("/response_generation/answer", json=payload)

    assert res.status_code == 200

    body = res.text
    assert "[Error generating answer:" in body
    assert "boom" in body


# -------------------------------------------------------------------
# TEST: Missing fields → FastAPI validation error
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_response_generation_validation_error():
    payload = {
        "question": "Hello?",
        # Missing required fields
    }

    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.post("/response_generation/answer", json=payload)

    assert res.status_code == 422


# -------------------------------------------------------------------
# TEST: Ensure correct call parameters passed to RAG
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_response_generation_parameter_forwarding(monkeypatch):
    captured = {}

    class CaptureRAG:
        async def answer(self, **kwargs):
            captured.update(kwargs)
            yield "ok"

    monkeypatch.setattr(
        "services.rag.retrieval_engine.queryRetrieval",
        lambda session: CaptureRAG()
    )

    payload = {
        "question": "Test?",
        "username": "bob",
        "rewrite_model": "rewrite",
        "generation_model": "gpt",
        "provider": "openai",
        "id": "123"
    }

    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/response_generation/answer", json=payload)

    assert captured["query"] == "Test?"
    assert captured["username"] == "bob"
    assert captured["rewrite_model"] == "rewrite"
    assert captured["generation_model"] == "gpt"
    assert captured["provider"] == "openai"
    assert captured["id"] == "123"
