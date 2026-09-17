from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
import uuid
import os

from schemas.file_magic_schema import detect_mime_type, validate_file_size, validate_file_type
from models.documentdb import Document
from services.model_dependencies.session_maker import get_async_session

upload_router = APIRouter(prefix="/upload", tags=["upload"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "models", "uploads")

def get_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    return UPLOAD_DIR

# ---------------------------------------------------------------------------------------
# GET
#----------------------------------------------------------------------------------------


# ---------------------------------------------------------------------------------------
# POST
#----------------------------------------------------------------------------------------
@upload_router.post("/")
async def upload_document(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_async_session)
):
    try:
        contents = await file.read()
        file_size = len(contents)

        validate_file_size(file_size)

        magic_type = detect_mime_type(contents)
        validate_file_type(magic_type, file.filename)

        doc_id = str(uuid.uuid4())

        upload_dir = get_dir()
        save_path = os.path.join(upload_dir, f"{doc_id}_{file.filename}")

        with open(save_path, "wb") as f:
            f.write(contents)

        doc = Document(
            id=doc_id,
            filename=file.filename,
            file_type=magic_type,
            file_size=file_size,
            file_path=save_path,
            upload_ts=datetime.now(timezone.utc),
            status="UPLOADED",
            error=None
        )

        session.add(doc)
        await session.commit()

        return {
            "id": doc_id,
            "filename": file.filename,
            "file_type": magic_type,
            "file_size": file_size,
            "status": "UPLOADED"
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------------------
# DELETE
#----------------------------------------------------------------------------------------

