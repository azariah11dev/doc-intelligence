from fastapi import APIRouter,UploadFile, File, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
from sqlalchemy import select, func
import os
import uuid

from src.schemas.contacts_schema import ContactInfo
from src.models.contactsdb import ContactHistory
from src.models.ticketdb import Tickets
from src.services.model_dependencies.session_maker import get_async_session

contact_router = APIRouter(prefix="/contact", tags=["contact"])

# ---------------------------------------------------------------------------------------
# GET
#----------------------------------------------------------------------------------------
@contact_router.get("/open_tickets")
async def open_tickets(session: AsyncSession = Depends(get_async_session)):
    try:
        logs = select(Tickets).where(
            (Tickets.status == None) | (func.lower(Tickets.status) != "completed")
        )

        result = await session.execute(logs)
        rows = result.scalars().all()

        return [
            {
                "id": r.id,
                "username": r.username,
                "email": r.email,
                "subject": r.subject,
                "description": r.description,
                "priority": r.priority,
                "status": r.status,
                "filepath": r.filepath,
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@contact_router.get("/all_tickets")
async def all_tickets(session: AsyncSession = Depends(get_async_session)):
    try:
        data = select(Tickets).order_by(Tickets.date.desc())
        result = await session.execute(data)
        rows = result.scalars().all()

        return [
            {
                "id": r.id,
                "username": r.username,
                "email": r.email,
                "subject": r.subject,
                "description": r.description,
                "priority": r.priority,
                "status": r.status,
                "filepath": r.filepath
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------------------
# PUT
#----------------------------------------------------------------------------------------
@contact_router.put("/update_status")
async def update_status(
    ticket_id: uuid.UUID,
    new_status: str,
    session: AsyncSession = Depends(get_async_session)
):
    try:
        stmt = select(Tickets).where(Tickets.id == ticket_id)
        result = await session.execute(stmt)
        ticket = result.scalar_one_or_none()

        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        ticket.status = new_status
        await session.commit()
        await session.refresh(ticket)

        return {"message": "Status updated"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ---------------------------------------------------------------------------------------
# POST
#----------------------------------------------------------------------------------------
def attached_file(file: UploadFile | None) -> str | None:
    if file is None:
        return None

    base_dir = Path(__file__).resolve().parent.parent / "models" / "tickets"
    base_dir.mkdir(parents=True, exist_ok=True)

    filename = file.filename.replace(" ", "_")
    file_path = base_dir / filename

    with open(file_path, "wb") as f:
        f.write(file.file.read())

    return str(file_path)

@contact_router.post("/ticket")
async def submit_ticket(
    username: str = Form(...),
    email: str = Form(...),
    subject: str | None = Form(None),
    description: str | None = Form(None),
    priority: str | None = Form(None),
    file: UploadFile | None = File(None),
    session: AsyncSession = Depends(get_async_session)
):
    try:
        file_path = attached_file(file)

        log = Tickets(
            username=username,
            email=email,
            subject=subject,
            description=description,
            priority=priority,
            status="open",
            filepath=file_path
        )

        session.add(log)
        await session.commit()
        await session.refresh(log)

        return {"message": "ticket submitted"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
