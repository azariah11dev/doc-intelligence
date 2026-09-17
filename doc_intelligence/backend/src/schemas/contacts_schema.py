from pydantic import BaseModel

# ---------------------------------------------------------------------------------------
# POST
#----------------------------------------------------------------------------------------
class ContactInfo(BaseModel):
    name: str
    email: str
    message: str