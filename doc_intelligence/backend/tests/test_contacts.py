import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
import uuid
from sqlalchemy import select

# MUST match conftest.py + app imports
from src.app import app
from src.endpoints import contacts
from src.endpoints import contacts
from src.models.ticketdb import Tickets
from src.models.contactsdb import ContactHistory


transport = ASGITransport(app=app)

# -------------------------------------------------------------------
# FIXTURES
# -------------------------------------------------------------------
@pytest.fixture
def temp_files_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(
        contacts,
        "get_base_dir",
        lambda: tmp_path
    )

    return tmp_path

# -------------------------------------------------------------------
# Tests
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_open_tickets_empty(test_session: AsyncSession):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/contact/open_tickets")

    assert res.status_code == 200, res.text
    assert res.json() == []


@pytest.mark.asyncio
async def test_view_ticket_attachment(tmp_path, monkeypatch):
    (tmp_path / "attachment.txt").write_text("ticket attachment")
    monkeypatch.setattr(contacts, "get_base_dir", lambda: tmp_path)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/contact/tickets/files/attachment.txt")

    assert res.status_code == 200, res.text
    assert res.text == "ticket attachment"
    assert res.headers["content-type"].startswith("text/plain")


@pytest.mark.asyncio
async def test_open_tickets(test_session: AsyncSession):
    t1 = Tickets(username="alice", email="a@a.com", subject="S1", description="D1", priority="high", status=None)
    t2 = Tickets(username="bob", email="b@b.com", subject="S2", description="D2", priority="low", status="open")
    t3 = Tickets(username="charlie", email="c@c.com", subject="S3", description="D3", priority="low", status="completed")

    test_session.add_all([t1, t2, t3])
    await test_session.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/contact/open_tickets")

    assert res.status_code == 200, res.text
    data = res.json()

    assert len(data) == 2
    usernames = [d["username"] for d in data]
    assert "alice" in usernames
    assert "bob" in usernames
    assert "charlie" not in usernames


@pytest.mark.asyncio
async def test_all_tickets(test_session: AsyncSession):
    t1 = Tickets(username="alice", email="a@a.com", subject="S1", description="D1", priority="high")
    t2 = Tickets(username="bob", email="b@b.com", subject="S2", description="D2", priority="low")

    test_session.add_all([t1, t2])
    await test_session.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/contact/all_tickets")

    assert res.status_code == 200, res.text
    data = res.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_update_status_not_found(test_session: AsyncSession):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.put("/contact/update_status", params={
            "ticket_id": str(uuid.uuid4()),
            "new_status": "closed"
        })

    assert res.status_code == 404, res.text
    assert res.json()["detail"] == "Ticket not found"


@pytest.mark.asyncio
async def test_update_status(test_session: AsyncSession):
    t1 = Tickets(username="alice", email="a@a.com", subject="S1", description="D1", priority="high", status="open")
    test_session.add(t1)
    await test_session.commit()
    await test_session.refresh(t1)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.put("/contact/update_status", params={
            "ticket_id": str(t1.id),
            "new_status": "closed"
        })

    assert res.status_code == 200, res.text
    assert res.json()["message"] == "Status updated"

    await test_session.refresh(t1)
    refreshed = await test_session.get(Tickets, t1.id)
    assert refreshed.status == "closed"


@pytest.mark.asyncio
async def test_submit_ticket_no_file(test_session: AsyncSession):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/contact/ticket",
            data={
                "username": "alice",
                "email": "a@a.com",
                "subject": "Help",
                "description": "Something broke",
                "priority": "high"
            }
        )

    assert res.status_code == 200, res.text
    assert res.json()["message"] == "ticket submitted"

    stmt = await test_session.execute(select(Tickets))
    rows = stmt.scalars().all()
    assert len(rows) == 1
    assert rows[0].filepath is None


@pytest.mark.asyncio
async def test_submit_ticket_with_file(temp_files_dir, test_session: AsyncSession):
    (temp_files_dir / "test.txt").write_text("hello world")
    file_path = temp_files_dir / "test.txt"

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        with file_path.open("rb") as f:
            res = await ac.post(
                "/contact/ticket",
                files={"file": ("test.txt", f, "text/plain")},
                data={
                    "username": "bob",
                    "email": "b@b.com",
                    "subject": "Upload",
                    "description": "Uploading file",
                    "priority": "low"
                }
            )

    assert res.status_code == 200, res.text
    assert res.json()["message"] == "ticket submitted"

    stmt = await test_session.execute(select(Tickets))
    rows = stmt.scalars().all()
    assert len(rows) == 1
    assert rows[0].filepath is not None
    assert Path(rows[0].filepath).exists()


@pytest.mark.asyncio
async def test_contact_form(test_session: AsyncSession):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/contact/", json={
            "name": "alice",
            "email": "a@a.com",
            "message": "Hello!"
        })

    assert res.status_code == 200, res.text
    assert "Report created by alice" in res.json()["report"]

    stmt = await test_session.execute(select(ContactHistory))
    rows = stmt.scalars().all()
    assert len(rows) == 1
    assert rows[0].username == "alice"
