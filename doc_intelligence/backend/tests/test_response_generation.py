import pytest
from httpx import AsyncClient, ASGITransport
import uuid

from src.app import app

transport = ASGITransport(app=app)

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
        "src.endpoints.response_generation.queryRetrieval",
        lambda session: FakeRAG()
    )


@pytest.fixture
def mock_rag_error(monkeypatch):
    monkeypatch.setattr(
        "src.endpoints.response_generation.queryRetrieval",
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

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/response_generation/answer", json=payload)

    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "text/plain; charset=utf-8"

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

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/response_generation/answer", json=payload)

    assert res.status_code == 200, res.text

    body = res.text
    assert "Error generating answer:" in body
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

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/response_generation/answer", json=payload)

    assert res.status_code == 422, res.text

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
        "src.endpoints.response_generation.queryRetrieval",
        lambda session: CaptureRAG()
    )

    id = str(uuid.uuid4())
    payload = {
        "question": "Test?",
        "username": "bob",
        "rewrite_model": "rewrite",
        "generation_model": "gpt",
        "provider": "openai",
        "id": id
    }

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/response_generation/answer", json=payload)

    assert res.status_code == 200, res.text
    assert captured["query"] == "Test?"
    assert captured["username"] == "bob"
    assert captured["rewrite_model"] == "rewrite"
    assert captured["generation_model"] == "gpt"
    assert captured["provider"] == "openai"
    assert captured["id"] == id
