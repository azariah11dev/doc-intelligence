from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from services.model_dependencies.database import create_db_and_tables

from endpoints.contacts import contact_router
from endpoints.documents import upload_router
from endpoints.response_generation import response_generation
from endpoints.user_auth import user_auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
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
        "message": "Welcome to Doc Intelligence API!"
    }

app.include_router(contact_router)
app.include_router(upload_router)
app.include_router(response_generation)
app.include_router(user_auth_router)