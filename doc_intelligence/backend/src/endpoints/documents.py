from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from sqlalchemy import select
from pathlib import Path
import uuid
import os
import re

from src.schemas.file_magic_schema import detect_mime_type, validate_file_size, validate_file_type
from src.models.documentdb import Document
from src.models.deldocdb import DeletedVectors, DeletedDocument
from src.services.model_dependencies.session_maker import get_async_session
from src.services.rag.extraction import DocumentExtractor
from src.services.rag.semantic_chunker import SemanticChunker
from src.schemas.document_schema import DelDoc
from src.services.auth.jwt_dependency import get_current_user
from src.models.usersdb import Users

upload_router = APIRouter(prefix="/upload", tags=["upload"])

def get_base_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "models" / "files"
# ---------------------------------------------------------------------------------------
# GET
#----------------------------------------------------------------------------------------
@upload_router.get("/recent_files")
def recent_files():
    try:
        base_dir = get_base_dir()

        if not base_dir.exists():
            return []

        # Collect all files
        all_files = [p for p in base_dir.glob("**/*") if p.is_file()]

        # Sort by modification time (newest first)
        all_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)

        # Return top 5 as strings
        return [str(p) for p in all_files[:5]]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@upload_router.get("/files")
def get_files():
    try:
        base_dir = get_base_dir()

        if not base_dir.exists():
            return {}

        all_files = [
            str(path)
            for path in base_dir.rglob("*")
            if path.is_file()
        ]

        return {
            "files": all_files,
            "count": len(all_files)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    
@upload_router.get("/audit_trail")
async def retrieve_files(session: AsyncSession = Depends(get_async_session)):
    try:
        result = select(Document).order_by(Document.upload_ts.desc())
        rows = (await session.execute(result)).scalars().all()

        return [
            {
                "id": row.id,
                "upload_filename": row.upload_filename,
                "saved_filename": row.saved_filename,
                "file_type": row.file_type,
                "file_size": row.file_size,
                "action": row.action,
                "upload_ts": row.upload_ts.strftime("%d-%m-%Y"),
                "status": row.status,
                "error": row.error
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------------------
# POST
#----------------------------------------------------------------------------------------
class VersioningError(Exception):
    """Raised when get_versioned_path fails to compute versioning metadata."""
    pass

async def get_versioned_path(
    document_id: uuid.UUID,
    collection_name: str,
    file_name: str,
    session: AsyncSession,
) -> dict:
    try:
        storage = SemanticChunker(session=session)

        base_dir = get_base_dir()
        base_dir.mkdir(parents=True, exist_ok=True)

        stem, ext = os.path.splitext(file_name)

        # Normalize version suffix
        match = re.match(r"^(.*)_v(\d+)$", stem)
        name = match.group(1) if match else stem

        pattern = re.compile(rf"^{re.escape(name)}_v(\d+){re.escape(ext)}$")

        existing_versions = []
        for file in base_dir.iterdir():
            if not file.is_file():
                continue
            m = pattern.match(file.name)
            if m:
                existing_versions.append(int(m.group(1)))

        last_version = max(existing_versions) if existing_versions else None
        last_version_name = f"{name}_v{last_version}{ext}" if last_version else None

        action = None

        if last_version_name:
            # delete vectors for last version
            action = await storage.delete_vectors_by_source(
                collection_name=collection_name,
                file_name=last_version_name,
            )

            # log deletion
            vector = DeletedVectors(
                id=document_id,
                upload_filename=file_name,
                saved_filename=last_version_name,
                file_path=str(base_dir / last_version_name),
                collection_name=collection_name,
                reason=f"automatic deletion of last version {last_version}",
            )

            session.add(vector)
            # DO NOT commit here — let caller commit

        next_version = (last_version or 0) + 1
        next_version_name = f"{name}_v{next_version}{ext}"

        return {
            "last_version_name": last_version_name,
            "path": str(base_dir / next_version_name),
            "file_name": next_version_name,
            "action": action,
        }

    except Exception as e:
        raise VersioningError(
            f"Versioning failed for file '{file_name}' in collection '{collection_name}': {e}"
        ) from e


@upload_router.post("/documents")
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
        doc_id = uuid.uuid4()
        collection_name = "doc_intelligence"

        # Versioned path + Qdrant cleanup
        saved_file = await get_versioned_path(
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
            "id": str(doc_id),
            "filename": saved_file["file_name"],
            "file_type": magic_type,
            "file_size": file_size,
            "status": "UPLOADED",
            "vector_management": saved_file["action"]
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------------------
# DELETE
#----------------------------------------------------------------------------------------
@upload_router.delete("/delete_document")
async def document_deletion(
    data: DelDoc,
    session: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user)
):
    try:
        # Only Admins can delete Documents
        if current_user.role != "Admin":
            raise HTTPException(status_code=403, detail="Not authorized.")
        
        # 1. Fetch document
        stmt = select(Document).where(Document.file_path == data.file_path)
        result = (await session.execute(stmt)).scalars().first()

        if not result:
            raise HTTPException(status_code=404, detail="Document not found")

        # Extract metadata
        id = result.id
        upload_filename = result.upload_filename
        saved_filename = result.saved_filename
        file_path = result.file_path
        collection_name = "doc_intelligence"

        # 2. Delete vectors
        storage = SemanticChunker(session=session)
        await storage.delete_vectors_by_source(
            collection_name=collection_name,
            file_name=saved_filename,
        )

        # 3. Log deletion
        vector = DeletedVectors(
            id=id,
            upload_filename=upload_filename,
            saved_filename=saved_filename,
            file_path=file_path,
            collection_name=collection_name,
            reason=f"User: {data.username}, Deletion reason: {data.reason}",
        )

        rem_doc = DeletedDocument(
            id=id,
            upload_filename=upload_filename,
            saved_filename=saved_filename,
            file_path=file_path,
            collection_name=collection_name,
            deleted_by=data.username,
            reason=data.reason,
        )

        session.add(vector)
        session.add(rem_doc)

        # 4. Commit everything atomically
        await session.commit()

        # 5. Delete file from disk
        if os.path.isfile(data.file_path):
            os.remove(data.file_path)
        else:
            raise FileNotFoundError(f"No file at {file_path}")

        return {"status": "deleted", "id": str(id)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
