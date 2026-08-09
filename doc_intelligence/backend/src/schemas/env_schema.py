from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

_env_path = Path(__file__).parent
while not (_env_path / ".env").exists() and _env_path != _env_path.parent:
    _env_path = _env_path.parent

print(f"Loading .env from: {_env_path / '.env'}")  # remove after confirming

class Settings(BaseSettings):
    DATABASE_URL: Optional[str] = None
    SECRET_KEY: str | None = None
    ALGORITHM: str | None = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int | None = None

    class Config:
        env_file = str(_env_path / ".env")
        env_file_encoding = "utf-8"

settings = Settings()