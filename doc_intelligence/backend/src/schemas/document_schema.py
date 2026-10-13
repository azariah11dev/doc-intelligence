from pydantic import BaseModel

class DelDoc(BaseModel):
    file_path: str
    username: str
    reason: str