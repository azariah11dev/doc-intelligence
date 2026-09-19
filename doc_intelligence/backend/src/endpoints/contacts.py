from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.contacts_schema import ContactInfo
from src.models.contactsdb import ContactHistory
from src.services.model_dependencies.session_maker import get_async_session

contact_router = APIRouter(prefix="/contact", tags=["contact"])

# ---------------------------------------------------------------------------------------
# POST
#----------------------------------------------------------------------------------------
@contact_router.post("/")
async def contact(
    payload: ContactInfo,
    session: AsyncSession = Depends(get_async_session)
    ):

    try:
        entry = ContactHistory(
            username = payload.name,
            email = payload.email,
            message = payload.message
        )

        session.add(entry)
        await session.commit()
        await session.refresh(entry)

        return {"report" : f"Report created by {payload.name}"}
    
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))