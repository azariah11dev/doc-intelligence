from pydantic import BaseModel

class QueryRequest(BaseModel):
    question: str
    username: str
    rewrite_model: str
    generation_model: str
    provider: str
