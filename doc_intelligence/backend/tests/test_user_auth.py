import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# MUST match conftest + app imports
from src.app import app
from src.models.usersdb import Users
from src.services.auth.jwt_dependency import get_current_user
from src.services.model_dependencies.session_maker import get_async_session

password_context = CryptContext(schemes=["argon2"], deprecated="auto")


# -------------------------------------------------------------------
# USE CONFTEXT DB FIXTURES — DO NOT RECREATE ENGINE HERE
# -------------------------------------------------------------------

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# -------------------------------------------------------------------
# USER / AUTH FIXTURES
# -------------------------------------------------------------------

def make_user(username, role="User", password="pass"):
    return Users(
        id=str(uuid.uuid4()),
        username=username,
        email=f"{username}@test.com",
        role=role,
        password_hash=password_context.hash(password),
    )


@pytest_asyncio.fixture
async def admin_user(test_session: AsyncSession):
    user = make_user("admin", role="Admin", password="adminpass")
    test_session.add(user)
    await test_session.commit()
    return user


@pytest.fixture
def act_as():
    """Override get_current_user to return the given user."""
    def _act_as(user):
        async def _override():
            return user
        app.dependency_overrides[get_current_user] = _override
    return _act_as


@pytest.fixture
def as_admin(admin_user, act_as):
    act_as(admin_user)
    return admin_user


# -------------------------------------------------------------------
# TEST: /auth/all_users
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_all_users(client, test_session, as_admin):
    test_session.add(make_user("alice"))
    await test_session.commit()

    res = await client.get("/auth/all_users")

    assert res.status_code == 200
    assert any(u["username"] == "alice" for u in res.json())


@pytest.mark.asyncio
async def test_get_all_users_not_admin(client, test_session, act_as):
    user = make_user("bob")
    test_session.add(user)
    await test_session.commit()
    act_as(user)

    res = await client.get("/auth/all_users")

    assert res.status_code == 403
    assert res.json()["detail"] == "Not authorized."


# -------------------------------------------------------------------
# TEST: /auth/register
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_register_success(client, test_session):
    payload = {"username": "newuser", "email": "new@test.com", "password": "mypassword"}

    res = await client.post("/auth/register", json=payload)

    assert res.status_code == 200
    assert res.json()["message"] == "Registration successful!"

    result = await test_session.execute(select(Users).where(Users.username == "newuser"))
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_register_duplicate_username(client, test_session):
    test_session.add(make_user("taken"))
    await test_session.commit()

    payload = {"username": "taken", "email": "new@test.com", "password": "mypassword"}
    res = await client.post("/auth/register", json=payload)

    assert res.status_code == 400
    assert res.json()["detail"] == "Username already exists."


@pytest.mark.asyncio
async def test_register_duplicate_email(client, test_session):
    test_session.add(make_user("unique"))
    await test_session.commit()

    payload = {"username": "newuser", "email": "unique@test.com", "password": "mypassword"}
    res = await client.post("/auth/register", json=payload)

    assert res.status_code == 400
    assert res.json()["detail"] == "Email already exists."


# -------------------------------------------------------------------
# TEST: /auth/login
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_success(client, test_session):
    test_session.add(make_user("loginuser", password="secret"))
    await test_session.commit()

    res = await client.post("/auth/login", json={"username": "loginuser", "password": "secret"})

    assert res.status_code == 200
    body = res.json()
    assert body["access_token"]
    assert body["username"] == "loginuser"


@pytest.mark.asyncio
async def test_login_wrong_password(client, test_session):
    test_session.add(make_user("wrongpass", password="correct"))
    await test_session.commit()

    res = await client.post("/auth/login", json={"username": "wrongpass", "password": "incorrect"})

    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect password."


@pytest.mark.asyncio
async def test_login_user_not_exist(client):
    res = await client.post("/auth/login", json={"username": "ghost", "password": "whatever"})

    assert res.status_code == 401
    assert res.json()["detail"] == "User does not exist."


# -------------------------------------------------------------------
# TEST: /auth/assign_role
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_assign_role_success(client, test_session, as_admin):
    u = make_user("bob")
    test_session.add(u)
    await test_session.commit()

    res = await client.put("/auth/assign_role", json={"username": "bob", "role": "Admin"})

    assert res.status_code == 200
    assert res.json()["message"] == "Admin assigned to user bob."

    await test_session.refresh(u)
    assert u.role == "Admin"


@pytest.mark.asyncio
async def test_assign_role_self_change(client, as_admin):
    res = await client.put("/auth/assign_role", json={"username": "admin", "role": "User"})

    assert res.status_code == 400
    assert "cannot change their own role" in res.json()["detail"]


@pytest.mark.asyncio
async def test_assign_role_invalid_role(client, as_admin):
    res = await client.put("/auth/assign_role", json={"username": "someone", "role": "SuperAdmin"})

    assert res.status_code == 400
    assert "Invalid role" in res.json()["detail"]


@pytest.mark.asyncio
async def test_assign_role_user_not_found(client, as_admin):
    res = await client.put("/auth/assign_role", json={"username": "ghost", "role": "Admin"})

    assert res.status_code == 404
    assert res.json()["detail"] == "User not found."


# -------------------------------------------------------------------
# TEST: /auth/delete_user
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_user_success(client, test_session, as_admin):
    test_session.add(make_user("victim"))
    await test_session.commit()

    res = await client.request("DELETE", "/auth/delete_user", json={"username": "victim"})

    assert res.status_code == 200
    assert "has been deleted" in res.json()["message"]

    test_session.expire_all()
    result = await test_session.execute(select(Users).where(Users.username == "victim"))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_user_self_delete(client, as_admin):
    res = await client.request("DELETE", "/auth/delete_user", json={"username": "admin"})

    assert res.status_code == 400
    assert res.json()["detail"] == "Admins cannot delete themselves."


@pytest.mark.asyncio
async def test_delete_user_not_found(client, as_admin):
    res = await client.request("DELETE", "/auth/delete_user", json={"username": "ghost"})

    assert res.status_code == 404
    assert res.json()["detail"] == "User not found."
