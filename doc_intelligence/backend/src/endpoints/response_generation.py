from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Iterator
from sqlalchemy.ext.asyncio import AsyncSession

from src.services.rag.retrieval_engine import queryRetrieval
from src.schemas.response_gen import QueryRequest
from src.services.model_dependencies.session_maker import get_async_session

response_generation = APIRouter(prefix="/response_generation", tags=["response_generation"])

def stream_answer(
    rag: queryRetrieval, 
    question: str,
    username: str,
    rewrite_model: str,
    generation_model: str,
    provider: str
) -> Iterator[str]:
    try:
        # rag.answer returns a string, so yield it once
        result = rag.answer(
            query=question,
            username=username,
            rewrite_model=rewrite_model,
            generation_model=generation_model,
            provider=provider
        )
        yield result

    except Exception as exc:
        raise RuntimeError(f"Error generating answer: {exc}") from exc


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
