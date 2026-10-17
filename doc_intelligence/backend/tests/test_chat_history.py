import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from src.app import app
from src.models.user_querydb import Conversation, ChatMessage, MessageContext


transport = ASGITransport(app=app)

@pytest.mark.asyncio
async def test_list_conversations_empty(test_session: AsyncSession):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/chat/conversations")

    assert response.status_code == 200, response.text
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_conversations(test_session: AsyncSession):
    convo1 = Conversation(id=uuid.uuid4(), username="alice")
    convo2 = Conversation(id=uuid.uuid4(), username="bob")

    test_session.add_all([convo1, convo2])
    await test_session.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/chat/conversations")

    assert response.status_code == 200, response.text
    data = response.json()

    assert len(data) == 2
    assert data[0]["username"] in ["alice", "bob"]


@pytest.mark.asyncio
async def test_get_conversation_history_not_found(test_session: AsyncSession):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(f"/chat/conversation/{uuid.uuid4()}")

    assert response.status_code == 404, response.text
    assert response.json()["detail"] == "Conversation not found"


@pytest.mark.asyncio
async def test_get_conversation_history(test_session: AsyncSession):
    id = uuid.uuid4()

    convo = Conversation(id=id, username="alice")
    test_session.add(convo)
    await test_session.commit()
    await test_session.refresh(convo)

    msg1 = ChatMessage(
        conversation_id=id,
        query="Hello",
        response="Hi there",
        rephrase=None
    )
    msg2 = ChatMessage(
        conversation_id=id,
        query="How are you?",
        response="Doing well",
        rephrase=None
    )

    test_session.add_all([msg1, msg2])
    await test_session.commit()
    await test_session.refresh(msg1)
    await test_session.refresh(msg2)

    ctx = MessageContext(
        message_id=msg1.id,
        context="Retrieved docs: A, B, C"
    )
    test_session.add(ctx)
    await test_session.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(f"/chat/conversation/{convo.id}")

    assert response.status_code == 200, response.text
    data = response.json()

    assert uuid.UUID(data["conversation"]["id"]) == id
    assert data["conversation"]["username"] == "alice"

    assert len(data["messages"]) == 2

    msg_data = data["messages"]
    assert msg_data[0]["context"] == "Retrieved docs: A, B, C"
    assert msg_data[1]["context"] is None
