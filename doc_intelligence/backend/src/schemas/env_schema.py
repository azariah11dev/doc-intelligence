from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

_env_path = Path(__file__).parent
while not (_env_path / ".env").exists() and _env_path != _env_path.parent:
    _env_path = _env_path.parent

print(f"Loading .env from: {_env_path / '.env'}")  # remove after confirming

class Settings(BaseSettings):
    SECRET_KEY: str | None = None
    ALGORITHM: str | None = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int | None = None

    POSTGRES_USER: str | None = None
    POSTGRES_PASSWORD: str | None = None
    POSTGRES_DB: str | None = None

    DATABASE_URL: Optional[str] = None
    QDRANT_URL: Optional[str] = None
    OLLAMA_HOST: Optional[str] = None

    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None

    class Config:
        env_file = str(_env_path / ".env")
        env_file_encoding = "utf-8"

settings = Settings()