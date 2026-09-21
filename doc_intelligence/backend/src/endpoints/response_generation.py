from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.services.rag.retrieval_engine import queryRetrieval
from src.schemas.response_gen import QueryRequest
from src.services.model_dependencies.session_maker import get_async_session

response_generation = APIRouter(prefix="/response_generation", tags=["response_generation"])

async def stream_answer(
    rag: queryRetrieval, 
    question: str,
    username: str,
    rewrite_model: str,
    generation_model: str,
    provider: str
):
    try:
        async for chunk in rag.answer(
            query=question,
            username=username,
            rewrite_model=rewrite_model,
            generation_model=generation_model,
            provider=provider,
        ):
            yield chunk
    except Exception as exc:
        yield f"\n\n[Error generating answer: {exc}]"


@response_generation.post("/answer")
async def response_generator(
     query: QueryRequest,
     session: AsyncSession = Depends(get_async_session)
):
    try:
        rag = queryRetrieval(session=session)
        stream = stream_answer(
            rag=rag, 
            question=query.question,
            username=query.username,
            rewrite_model=query.rewrite_model,
            generation_model=query.generation_model,
            provider=query.provider
        )
        return StreamingResponse(stream, media_type="text/plain")

    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}") from e
