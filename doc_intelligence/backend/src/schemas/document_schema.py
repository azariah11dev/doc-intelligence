from pydantic import BaseModel
from uuid import UUID

class DelDoc(BaseModel):
    document_id: UUID
    reason: str