from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from src.models.user_querydb import Conversation, ChatMessage, MessageContext
from src.services.model_dependencies.session_maker import get_async_session

chat_router = APIRouter(prefix="/chat")

@chat_router.get("/conversations")
async def list_conversations(
    session: AsyncSession = Depends(get_async_session)
):
    try:
        stmt = (
            select(Conversation)
            .order_by(Conversation.last_updated.desc())
        )
        result = await session.execute(stmt)
        conversations = result.scalars().all()

        return [
            {
                "id": str(c.id),
                "username": c.username,
                "created_at": c.created_at,
                "last_updated": c.last_updated,
            }
            for c in conversations
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.get("/conversation/{conversation_id}")
async def get_conversation_history(
    conversation_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session)
):
    try:
        # 1. Fetch conversation metadata
        convo_stmt = select(Conversation).where(Conversation.id == conversation_id)
        convo_result = await session.execute(convo_stmt)
        conversation = convo_result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # 2. Fetch all messages for this conversation
        msg_stmt = (
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.created_at.asc())
        )
        msg_result = await session.execute(msg_stmt)
        messages = msg_result.scalars().all()

        # 3. Fetch context only for messages in this conversation
        context_stmt = (
            select(MessageContext)
            .join(ChatMessage, MessageContext.message_id == ChatMessage.id)
            .where(ChatMessage.conversation_id == conversation_id)
        )
        context_result = await session.execute(context_stmt)
        all_context = context_result.scalars().all()

        context_map = {c.message_id: c.context for c in all_context}

        # 4. Build response
        return {
            "conversation": {
                "id": str(conversation.id),
                "username": conversation.username,
                "created_at": conversation.created_at,
                "last_updated": conversation.last_updated,
            },
            "messages": [
                {
                    "id": m.id,
                    "query": m.query,
                    "response": m.response,
                    "created_at": m.created_at,
                    "rephrase": m.rephrase,
                    "context": context_map.get(m.id)
                }
                for m in messages
            ]
        }
    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
