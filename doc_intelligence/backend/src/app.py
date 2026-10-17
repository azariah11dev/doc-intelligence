from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from src.services.model_dependencies.database import engine
from src.services.model_dependencies.database import Base, engine

from src.endpoints.contacts import contact_router
from src.endpoints.documents import upload_router
from src.endpoints.response_generation import response_generation
from src.endpoints.user_auth import user_auth_router
from src.endpoints.chat_history import chat_router


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    yield

app = FastAPI(title="Doc Intelligence", version="1.0", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"]
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": request.headers.get("origin", "*")}
    )

@app.get("/")
def root():
    return {
        "message": "Welcome to Doc Intelligence API!",
        "Access endpoint test at": "http://localhost:8000/docs"
    }

app.include_router(contact_router)
app.include_router(upload_router)
app.include_router(response_generation)
app.include_router(user_auth_router)
app.include_router(chat_router)