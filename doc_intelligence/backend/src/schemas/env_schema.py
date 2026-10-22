from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

_env_path = Path(__file__).parent
while not (_env_path / ".env").exists() and _env_path != _env_path.parent:
    _env_path = _env_path.parent

class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    POSTGRES_USER: str | None = None
    POSTGRES_PASSWORD: str | None = None
    POSTGRES_DB: str | None = None

    DATABASE_URL: Optional[str] = None
    QDRANT_URL: Optional[str] = None
    OLLAMA_HOST: Optional[str] = None
    OLLAMA_NUM_CTX: int

    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    CORS_ORIGINS: str
    ENABLED_PROVIDERS: str
    ENABLED_MODELS: str
    LOGIN_RATE_LIMIT: str
    REGISTER_RATE_LIMIT: str
    ANSWER_RATE_LIMIT: str

    class Config:
        env_file = str(_env_path / ".env")
        env_file_encoding = "utf-8"

settings = Settings()