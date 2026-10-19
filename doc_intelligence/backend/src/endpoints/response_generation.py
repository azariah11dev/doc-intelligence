from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from src.services.rag.retrieval_engine import queryRetrieval
from src.schemas.response_gen import QueryRequest
from src.services.model_dependencies.session_maker import get_async_session
from src.services.auth.jwt_dependency import get_current_user
from src.models.usersdb import Users
from src.services.rate_limit import limiter
from src.schemas.env_schema import settings
from src.services.utils.error_logger import generate_logs


response_generation = APIRouter(
    prefix="/response_generation",
    tags=["response_generation"],
    dependencies=[Depends(get_current_user)],
)

def _configured_values(value: str) -> set[str]:
    return {item.strip() for item in value.split(",") if item.strip()}

async def stream_answer(
    rag: queryRetrieval, 
    question: str,
    username: str,
    rewrite_model: str | None,
    generation_model: str,
    provider: str,
    id: uuid.UUID | None
):
    try:
        async for chunk in rag.answer(
            query=question,
            username=username,
            rewrite_model=rewrite_model,
            generation_model=generation_model,
            provider=provider,
            id=id
        ):
            yield chunk
            
    except Exception as exc:
        generate_logs(error=exc,endpoint="/response_generation/answer")
        yield "\n\n[Error generating answer. Please try again.]"


@response_generation.post("/answer")
@limiter.limit(settings.ANSWER_RATE_LIMIT)
async def response_generator(
     request: Request,
     query: QueryRequest,
     session: AsyncSession = Depends(get_async_session),
     current_user: Users = Depends(get_current_user),
):
    try:
        enabled_providers = _configured_values(settings.ENABLED_PROVIDERS)
        enabled_models = _configured_values(settings.ENABLED_MODELS)
        if query.provider not in enabled_providers:
            raise HTTPException(status_code=400, detail="Provider is not enabled")
        if f"{query.provider}:{query.generation_model}" not in enabled_models:
            raise HTTPException(status_code=400, detail="Generation model is not enabled")
        if query.rewrite_model and f"ollama:{query.rewrite_model}" not in enabled_models:
            raise HTTPException(status_code=400, detail="Rewrite model is not enabled")

        rag = queryRetrieval(session=session)
        stream = stream_answer(
            rag=rag, 
            question=query.question,
            username=current_user.username,
            rewrite_model=query.rewrite_model,
            generation_model=query.generation_model,
            provider=query.provider,
            id=query.id
        )
        return StreamingResponse(stream, media_type="text/plain")

    except HTTPException:
        raise
    
    except Exception as e:
        generate_logs(error=e,endpoint="/response_generation/answer")
        raise HTTPException(status_code=500, detail="Internal server error") from e
