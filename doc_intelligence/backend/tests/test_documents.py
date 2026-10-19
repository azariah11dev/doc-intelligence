import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from sqlalchemy import select
import uuid
from passlib.context import CryptContext

# MUST match conftest + app imports
from src.app import app
from src.endpoints import documents
from src.models.documentdb import Document
from src.models.deldocdb import DeletedVectors, DeletedDocument
from src.models.usersdb import Users
from src.services.auth.jwt_dependency import get_current_user


transport = ASGITransport(app=app)
password_context = CryptContext(schemes=["argon2"], deprecated="auto")

# -------------------------------------------------------------------
# FIXTURES
# -------------------------------------------------------------------
@pytest_asyncio.fixture
async def admin_user(test_session: AsyncSession):
    user = Users(
        username="admin",
        role="Admin",
        email="admin@test.com",
        password_hash=password_context.hash("hashed")
    )
    test_session.add(user)
    await test_session.commit()
    return user

@pytest_asyncio.fixture
async def override_get_current_user(admin_user):
    async def _override():
        return admin_user

    # Correct override: use function object, not string
    app.dependency_overrides[get_current_user] = _override
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def temp_files_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(
        documents,
        "get_base_dir",
        lambda: tmp_path
    )

    return tmp_path

# -------------------------------------------------------------------
# TEST: /upload/recent_files
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_recent_files(temp_files_dir, admin_headers):
    (temp_files_dir / "a.txt").write_text("hello")
    (temp_files_dir / "b.txt").write_text("world")

    async with AsyncClient(
        transport=transport, base_url="http://test", headers=admin_headers
    ) as ac:
        res = await ac.get("/upload/recent_files")

    assert res.status_code == 200, res.text
    assert len(res.json()) == 2

# -------------------------------------------------------------------
# TEST: /upload/files
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_get_files(temp_files_dir, admin_headers):
    (temp_files_dir / "x.txt").write_text("data")

    async with AsyncClient(
        transport=transport, base_url="http://test", headers=admin_headers
    ) as ac:
        res = await ac.get("/upload/files")

    assert res.status_code == 200, res.text
    data = res.json()
    assert "files" in data
    assert data["count"] == 1


@pytest.mark.asyncio
async def test_view_file(temp_files_dir, admin_headers):
    (temp_files_dir / "view_me.txt").write_text("view this")

    async with AsyncClient(
        transport=transport, base_url="http://test", headers=admin_headers
    ) as ac:
        res = await ac.get("/upload/files/view/view_me.txt")

    assert res.status_code == 200, res.text
    assert res.text == "view this"
    assert res.headers["content-type"].startswith("text/plain")


# -------------------------------------------------------------------
# TEST: /upload/audit_trail
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_audit_trail(test_session: AsyncSession, admin_headers):
    doc = Document(
        id=uuid.uuid4(),
        upload_filename="test.pdf",
        saved_filename="test_v1.pdf",
        file_type="application/pdf",
        file_size=123,
        file_path="/tmp/test_v1.pdf",
        action=None,
        upload_ts=datetime.now(timezone.utc),
        status="UPLOADED",
        error=None
    )
    test_session.add(doc)
    await test_session.commit()

    async with AsyncClient(
        transport=transport, base_url="http://test", headers=admin_headers
    ) as ac:
        res = await ac.get("/upload/audit_trail")

    assert res.status_code == 200, res.text
    assert len(res.json()) >= 1

# -------------------------------------------------------------------
# TEST: /upload/documents (file upload)
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_upload_document(
    temp_files_dir, test_session: AsyncSession, monkeypatch, admin_headers
):
    (temp_files_dir / "sample.txt").write_text("hello world")
    file_path = temp_files_dir / "sample.txt"

    async def fake_extract(*args, **kwargs):
        return None

    async def fake_delete_vectors(*args, **kwargs):
        return True

    monkeypatch.setattr(
        "src.services.rag.extraction.DocumentExtractor.extract_text",
        fake_extract
    )

    monkeypatch.setattr(
        "src.services.rag.semantic_chunker.SemanticChunker.delete_vectors_by_source",
        fake_delete_vectors
    )

    async with AsyncClient(
        transport=transport, base_url="http://test", headers=admin_headers
    ) as ac:
        with file_path.open("rb") as f:
            res = await ac.post(
                "/upload/documents",
                files={"file": ("sample.txt", f, "text/plain")}
            )

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "UPLOADED"
    assert "filename" in data

# -------------------------------------------------------------------
# TEST: /upload/delete_document (admin only)
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_delete_document(
    temp_files_dir,
    test_session: AsyncSession,
    override_get_current_user,
    monkeypatch,
):
    async def fake_delete_vectors(*args, **kwargs):
        return True

    monkeypatch.setattr(
        documents.SemanticChunker,
        "delete_vectors_by_source",
        fake_delete_vectors,
    )

    (temp_files_dir / "delete_me.txt").write_text("delete this")
    file_path = temp_files_dir / "delete_me.txt"

    doc = Document(
        id=uuid.uuid4(),
        upload_filename="delete_me.txt",
        saved_filename="delete_me_v1.txt",
        file_type="text/plain",
        file_size=12,
        file_path=str(file_path),
        action=None,
        upload_ts=datetime.now(timezone.utc),
        status="UPLOADED",
        error=None
    )
    test_session.add(doc)
    await test_session.commit()

    payload = {
        "document_id": str(doc.id),
        "reason": "cleanup",
    }

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.request("DELETE", "/upload/delete_document", json=payload)

    assert res.status_code == 200, res.text
    assert res.json()["status"] == "deleted"

    assert not file_path.exists()

    dv = await test_session.execute(select(DeletedVectors))
    dd = await test_session.execute(select(DeletedDocument))

    assert dv.scalars().first() is not None
    assert dd.scalars().first() is not None
