from datetime import datetime, timedelta, timezone
from jose import jwt
import os

from schemas.env_schema import settings

SECRET_KEY = settings.SECRET_KEY or os.getenv("SECRET_KEY")
ALGORITHM = settings.ALGORITHM or os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES or os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)