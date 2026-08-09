from pydantic import BaseModel

class ContactInfo(BaseModel):
    name: str
    email: str
    message: str