from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
import uuid
import os
import re

from schemas.file_magic_schema import detect_mime_type, validate_file_size, validate_file_type
from models.documentdb import Document
from services.model_dependencies.session_maker import get_async_session
from services.rag.extraction import DocumentExtractor
from services.rag.semantic_chunker import SemanticChunker

upload_router = APIRouter(prefix="/upload", tags=["upload"])

# ---------------------------------------------------------------------------------------
# GET
#----------------------------------------------------------------------------------------


# ---------------------------------------------------------------------------------------
# POST
#----------------------------------------------------------------------------------------
def get_versioned_path(
    document_id: str,
    collection_name: str,
    file_name: str,
    session: AsyncSession,
) -> dict:
    """
    Determine the next versioned filename and return:
    - last_version_name: the most recent version stored (or None)
    - file_name: the new version to create
    - path: full path for the new version
    """
    storage = SemanticChunker(session=session)

    base_dir = os.path.join(os.path.dirname(__file__), "..", "models", "files")
    os.makedirs(base_dir, exist_ok=True)

    name, ext = os.path.splitext(file_name)

    # Pattern: myfile_v1.pdf, myfile_v2.pdf, etc.
    pattern = re.compile(rf"^{re.escape(name)}_v(\d+){re.escape(ext)}$")

    existing_versions = []
    versioned_files = []

    for f in os.listdir(base_dir):
        match = pattern.match(f)
        if match:
            version = int(match.group(1))
            existing_versions.append(version)
            versioned_files.append(f)

    # Determine last version
    if existing_versions:
        last_version = max(existing_versions)
        last_version_name = f"{name}_v{last_version}{ext}"
    else:
        last_version = None
        last_version_name = None

    # Delete vectors for the last version (if any)
    if last_version_name:
        action = storage.delete_vectors_by_source(
            document_id=document_id,
            collection_name=collection_name,
            file_name=last_version_name,
        )

    # Determine next version
    next_version = (last_version or 0) + 1
    next_version_name = f"{name}_v{next_version}{ext}"

    return {
        "last_version_name": last_version_name,
        "path": os.path.join(base_dir, next_version_name),
        "file_name": next_version_name,
        "action": action
    }

@upload_router.post("/")
async def upload_document(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_async_session),
):
    try:
        # Read file contents
        contents = await file.read()
        file_size = len(contents)

        # Validate size and type
        validate_file_size(file_size)
        magic_type = detect_mime_type(contents)
        validate_file_type(magic_type, file.filename)

        # IDs and collection
        doc_id = str(uuid.uuid4())
        collection_name = "documents"

        # Versioned path + Qdrant cleanup
        saved_file = get_versioned_path(
            document_id=doc_id,
            collection_name=collection_name,
            file_name=file.filename,
            session=session,
        )

        # Persist file to disk
        with open(saved_file["path"], "wb") as f:
            f.write(contents)

        # Create DB row first (so status can be updated by extractor/chunker)
        doc = Document(
            id=doc_id,
            upload_filename=file.filename,
            saved_filename=saved_file["file_name"],
            file_type=magic_type,
            file_size=file_size,
            file_path=saved_file["path"],
            action=saved_file["action"],
            upload_ts=datetime.now(timezone.utc),
            status="UPLOADED",
            error=None,
        )

        session.add(doc)
        await session.commit()

        # Extract + chunk + ingest
        # Adjust constructor args for DocumentExtractor as needed
        doc_extract = DocumentExtractor(
            document_id=doc_id,
            file_name=saved_file["file_name"],
            file_path=saved_file["path"],
            session=session,
        )

        await doc_extract.extract_text(
            collection_name=collection_name,
            mime_type=magic_type,
        )

        return {
            "id": doc_id,
            "filename": saved_file["file_name"],
            "file_type": magic_type,
            "file_size": file_size,
            "status": "UPLOADED",
            "vector_management": saved_file["action"]
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------------------
# DELETE
#----------------------------------------------------------------------------------------

