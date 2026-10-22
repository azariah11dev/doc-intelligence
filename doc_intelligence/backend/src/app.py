import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.concurrency import run_in_threadpool
from src.services.model_dependencies.database import Base, engine
from src.models.usersdb import Users
from src.services.auth.jwt_dependency import get_current_user
from src.services.rate_limit import limiter
from src.endpoints.contacts import contact_router, public_contact_router
from src.endpoints.documents import upload_router
from src.endpoints.response_generation import response_generation
from src.endpoints.user_auth import user_auth_router
from src.endpoints.chat_history import chat_router
from src.schemas.env_schema import settings
from src.services.rag.model_registry import (
    get_embedding_model,
    get_reranker_model,
    get_sparse_model,
)

logger = logging.getLogger(__name__)


async def create_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("creating tables")
    await create_tables()

    print("loading embedding")
    await run_in_threadpool(get_embedding_model, "BAAI/bge-m3")

    print("loading reranker")
    await run_in_threadpool(get_reranker_model, "BAAI/bge-reranker-base")

    print("loading sparse")
    await run_in_threadpool(get_sparse_model, "Qdrant/bm25")

    yield


app = FastAPI(title="Doc Intelligence", version="1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


cors_origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"]
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled application error for %s %s",
        request.method,
        request.url.path,
        exc_info=(type(exc), exc, exc.__traceback__),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

@app.get("/")
def root(current_user: Users = Depends(get_current_user)):
    return {
        "message": "Welcome to Doc Intelligence API!",
        "Access endpoint test at": "http://localhost:8000/docs"
    }

app.include_router(contact_router)
app.include_router(upload_router)
app.include_router(response_generation)
app.include_router(user_auth_router)
app.include_router(chat_router)
app.include_router(public_contact_router)