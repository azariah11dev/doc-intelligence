from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
from sqlalchemy import select, func
import uuid

from src.schemas.contacts_schema import ContactInfo
from src.models.contactsdb import ContactHistory
from src.models.ticketdb import Tickets
from src.services.model_dependencies.session_maker import get_async_session
from src.services.auth.jwt_dependency import get_current_user
from src.models.usersdb import Users
from src.schemas.file_magic_schema import MAX_FILE_SIZE, validate_file_size
from src.services.utils.error_logger import generate_logs


contact_router = APIRouter(
    prefix="/contact",
    tags=["contact"],
    dependencies=[Depends(get_current_user)],
)
public_contact_router = APIRouter(prefix="/contact", tags=["contact"])

# ---------------------------------------------------------------------------------------
# normal: GET, dynamic: GET at the bottom
#----------------------------------------------------------------------------------------
@contact_router.get("/open_tickets")
async def open_tickets(
    session: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user),
):
    try:
        if current_user.role != "Admin":
            raise HTTPException(status_code=403, detail="Not authorized.")

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
                "filepath": Path(r.filepath).name if r.filepath else None,
            }
            for r in rows
        ]

    except HTTPException:
        raise
    except Exception as e:
        generate_logs(error=e,endpoint="/contact/open_tickets")
        raise HTTPException(status_code=500, detail="Internal server error") from e


@contact_router.get("/all_tickets")
async def all_tickets(
    session: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user),
):
    try:
        if current_user.role != "Admin":
            raise HTTPException(status_code=403, detail="Not authorized.")

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
                "filepath": Path(r.filepath).name if r.filepath else None
            }
            for r in rows
        ]

    except HTTPException:
        raise
    except Exception as e:
        generate_logs(error=e,endpoint="/contact/all_tickets")
        raise HTTPException(status_code=500, detail="Internal server error") from e

# ---------------------------------------------------------------------------------------
# PUT
#----------------------------------------------------------------------------------------
@contact_router.put("/update_status")
async def update_status(
    ticket_id: uuid.UUID,
    new_status: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user),
):
    try:
        if current_user.role != "Admin":
            raise HTTPException(status_code=403, detail="Not authorized.")

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
        generate_logs(error=e,endpoint="/contact/update_status")
        raise HTTPException(status_code=500, detail="Internal server error") from e
    
# ---------------------------------------------------------------------------------------
# POST
#----------------------------------------------------------------------------------------
def get_base_dir():
    return Path(__file__).resolve().parent.parent / "models" / "tickets"

async def attached_file(file: UploadFile | None) -> str | None:
    if file is None:
        return None

    if file.size is not None:
        validate_file_size(file.size)
    contents = await file.read(MAX_FILE_SIZE + 1)
    validate_file_size(len(contents))

    base_dir = get_base_dir()
    base_dir.mkdir(parents=True, exist_ok=True)

    original_name = Path(file.filename or "").name
    filename = f"{uuid.uuid4().hex}{Path(original_name).suffix[:20]}"
    file_path = base_dir / filename

    with file_path.open("wb") as f:
        f.write(contents)

    return str(file_path)

@contact_router.post("/ticket")
async def submit_ticket(
    subject: str | None = Form(None),
    description: str | None = Form(None),
    priority: str | None = Form(None),
    file: UploadFile | None = File(None),
    session: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user),
):
    try:
        file_path = await attached_file(file)

        log = Tickets(
            username=current_user.username,
            email=current_user.email,
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

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        generate_logs(error=e,endpoint="/contact/ticket")
        raise HTTPException(status_code=500, detail="Internal server error") from e


@public_contact_router.post("/")
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
        generate_logs(error=e,endpoint="/contact/")
        raise HTTPException(status_code=500, detail="Internal server error") from e

# ---------------------------------------------------------------------------------------
# dynamic: GET at the bottom
#----------------------------------------------------------------------------------------
@contact_router.get("/tickets/files/{filename}")
def view_ticket_attachment(
    filename: str,
    current_user: Users = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized.")

    base_dir = get_base_dir().resolve()
    if Path(filename).name != filename or filename in {".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = (base_dir / filename).resolve()
    if file_path.parent != base_dir or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        filename=filename,
        content_disposition_type="inline",
    )