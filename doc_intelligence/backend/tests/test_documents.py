import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
import uuid
import os
from sqlalchemy import select

# MUST match conftest + app imports
from src.app import app
from src.models.documentdb import Document
from src.models.deldocdb import DeletedVectors, DeletedDocument
from src.models.usersdb import Users
from src.services.model_dependencies.session_maker import async_session_maker
from src.services.auth.jwt_dependency import get_current_user


# -------------------------------------------------------------------
# FIXTURES
# -------------------------------------------------------------------
@pytest.fixture
async def test_session():
    async with async_session_maker() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def admin_user(test_session: AsyncSession):
    user = Users(
        id=str(uuid.uuid4()),
        username="admin",
        role="Admin",
        email="admin@test.com",
        password="hashed"
    )
    test_session.add(user)
    await test_session.commit()
    return user


@pytest.fixture
async def override_get_current_user(admin_user):
    async def _override():
        return admin_user

    # Correct override: use function object, not string
    app.dependency_overrides[get_current_user] = _override
    yield
    app.dependency_overrides.clear()


# -------------------------------------------------------------------
# TEST: /upload/recent_files
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_recent_files(tmp_path: Path):
    f1 = tmp_path / "a.txt"
    f2 = tmp_path / "b.txt"
    f1.write_text("hello")
    f2.write_text("world")

    base_dir = Path(__file__).parent.parent / "src" / "models" / "files"
    base_dir.mkdir(parents=True, exist_ok=True)

    (base_dir / "a.txt").write_text("hello")
    (base_dir / "b.txt").write_text("world")

    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.get("/upload/recent_files")

    assert res.status_code == 200
    assert len(res.json()) >= 2


# -------------------------------------------------------------------
# TEST: /upload/files
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_get_files(tmp_path: Path):
    base_dir = Path(__file__).parent.parent / "src" / "models" / "files"
    base_dir.mkdir(parents=True, exist_ok=True)

    (base_dir / "x.txt").write_text("data")

    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.get("/upload/files")

    assert res.status_code == 200
    data = res.json()
    assert "files" in data
    assert data["count"] >= 1


# -------------------------------------------------------------------
# TEST: /upload/audit_trail
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_audit_trail(test_session: AsyncSession):
    doc = Document(
        id=str(uuid.uuid4()),
        upload_filename="test.pdf",
        saved_filename="test_v1.pdf",
        file_type="application/pdf",
        file_size=123,
        file_path="/tmp/test_v1.pdf",
        action=None,
        upload_ts=None,
        status="UPLOADED",
        error=None
    )
    test_session.add(doc)
    await test_session.commit()

    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.get("/upload/audit_trail")

    assert res.status_code == 200
    assert len(res.json()) >= 1


# -------------------------------------------------------------------
# TEST: /upload/documents (file upload)
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_upload_document(tmp_path: Path, test_session: AsyncSession, monkeypatch):
    file_path = tmp_path / "sample.txt"
    file_path.write_text("hello world")

    async def fake_extract(*args, **kwargs):
        return None

    monkeypatch.setattr(
        "src.services.rag.extraction.DocumentExtractor.extract_text",
        fake_extract
    )

    async with AsyncClient(app=app, base_url="http://test") as ac:
        with file_path.open("rb") as f:
            res = await ac.post(
                "/upload/documents",
                files={"file": ("sample.txt", f, "text/plain")}
            )

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "UPLOADED"
    assert "filename" in data


# -------------------------------------------------------------------
# TEST: /upload/delete_document (admin only)
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_delete_document(
    tmp_path: Path,
    test_session: AsyncSession,
    override_get_current_user
):
    file_path = tmp_path / "delete_me.txt"
    file_path.write_text("delete this")

    doc = Document(
        id=str(uuid.uuid4()),
        upload_filename="delete_me.txt",
        saved_filename="delete_me_v1.txt",
        file_type="text/plain",
        file_size=12,
        file_path=str(file_path),
        action=None,
        upload_ts=None,
        status="UPLOADED",
        error=None
    )
    test_session.add(doc)
    await test_session.commit()

    payload = {
        "username": "admin",
        "reason": "cleanup",
        "file_path": str(file_path)
    }

    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.delete("/upload/delete_document", json=payload)

    assert res.status_code == 200
    assert res.json()["status"] == "deleted"

    assert not file_path.exists()

    dv = await test_session.execute(select(DeletedVectors))
    dd = await test_session.execute(select(DeletedDocument))

    assert dv.scalars().first() is not None
    assert dd.scalars().first() is not None
