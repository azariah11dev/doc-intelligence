import pytest
from httpx import AsyncClient, ASGITransport
import uuid

from src.app import app
from src.schemas.env_schema import settings

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
async def test_response_generation_stream_success(mock_rag_success, admin_headers, monkeypatch):
    payload = {
        "question": "Hello?",
        "rewrite_model": None,
        "generation_model": "gpt",
        "provider": "openai",
        "id": str(uuid.uuid4())
    }

    monkeypatch.setattr(settings, "ENABLED_PROVIDERS", "openai")
    monkeypatch.setattr(settings, "ENABLED_MODELS", "openai:gpt")
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers=admin_headers,
    ) as ac:
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
async def test_response_generation_stream_error(mock_rag_error, admin_headers, monkeypatch):
    payload = {
        "question": "Hello?",
        "rewrite_model": None,
        "generation_model": "gpt",
        "provider": "openai",
        "id": str(uuid.uuid4())
    }

    monkeypatch.setattr(settings, "ENABLED_PROVIDERS", "openai")
    monkeypatch.setattr(settings, "ENABLED_MODELS", "openai:gpt")
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers=admin_headers,
    ) as ac:
        res = await ac.post("/response_generation/answer", json=payload)

    assert res.status_code == 200, res.text

    body = res.text
    assert "Error generating answer." in body
    assert "Please try again" in body

# -------------------------------------------------------------------
# TEST: Missing fields → FastAPI validation error
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_response_generation_validation_error(admin_headers):
    payload = {
        "question": "Hello?",
        # Missing required fields
    }

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers=admin_headers,
    ) as ac:
        res = await ac.post("/response_generation/answer", json=payload)

    assert res.status_code == 422, res.text

# -------------------------------------------------------------------
# TEST: Ensure correct call parameters passed to RAG
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_response_generation_parameter_forwarding(monkeypatch, admin_headers):
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
        "rewrite_model": "rewrite",
        "generation_model": "gpt",
        "provider": "openai",
        "id": id
    }

    monkeypatch.setattr(settings, "ENABLED_PROVIDERS", "openai")
    monkeypatch.setattr(settings, "ENABLED_MODELS", "openai:gpt,ollama:rewrite")
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers=admin_headers,
    ) as ac:
        res = await ac.post("/response_generation/answer", json=payload)

    assert res.status_code == 200, res.text
    assert captured["query"] == "Test?"
    assert captured["username"] == "route-admin"
    assert captured["rewrite_model"] == "rewrite"
    assert captured["generation_model"] == "gpt"
    assert captured["provider"] == "openai"
    assert captured["id"] == id


@pytest.mark.asyncio
@pytest.mark.parametrize("extra, expected", [({}, False), ({"think": True}, True)])
async def test_response_generation_think_forwarding(
    monkeypatch, admin_headers, extra, expected
):
    captured = {}

    class CaptureRAG:
        async def answer(self, **kwargs):
            captured.update(kwargs)
            yield "ok"

    monkeypatch.setattr(
        "src.endpoints.response_generation.queryRetrieval",
        lambda session: CaptureRAG(),
    )
    monkeypatch.setattr(settings, "ENABLED_PROVIDERS", "ollama")
    monkeypatch.setattr(settings, "ENABLED_MODELS", "ollama:qwen")

    payload = {
        "question": "Test?",
        "rewrite_model": None,
        "generation_model": "qwen",
        "provider": "ollama",
        "id": str(uuid.uuid4()),
        **extra,
    }
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers=admin_headers,
    ) as ac:
        res = await ac.post("/response_generation/answer", json=payload)

    assert res.status_code == 200, res.text
    assert captured["think"] is expected
