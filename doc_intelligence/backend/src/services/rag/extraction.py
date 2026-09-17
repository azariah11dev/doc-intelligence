import re
import unicodedata
from pypdf import PdfReader
from pdfminer.high_level import extract_text as pdfminer_extract
from docx import Document as DocxDocument
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.documentdb import Document


class DocumentExtractor:
    def __init__(self, document_id: str, session: AsyncSession):
        self.session = session
        self.document_id = document_id

    async def update_document_error(self, status: str, error: str):
        query = select(Document).where(Document.id == self.document_id)
        result = (await self.session.execute(query)).scalars().first()

        if not result:
            raise ValueError("Document not found")

        result.status = status
        result.error = error

        await self.session.commit()
        await self.session.refresh(result)

        return result

    # ---------------------------
    # PDF Extraction (pypdf)
    # ---------------------------
    async def extract_pdf_pypdf(self, path: str) -> str:
        try:
            reader = PdfReader(path)
            text = []

            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)

            return "\n".join(text)

        except Exception as e:
            await self.update_document_error("FAILED", f"PDF extraction failed (pypdf): {e}")
            raise RuntimeError(f"PDF extraction failed (pypdf): {e}")

    # ---------------------------
    # PDF Extraction (pdfminer)
    # ---------------------------
    async def extract_pdf_pdfminer(self, path: str) -> str:
        try:
            return pdfminer_extract(path)
        except Exception as e:
            await self.update_document_error("FAILED", f"PDF extraction failed (pdfminer): {e}")
            raise RuntimeError(f"PDF extraction failed (pdfminer): {e}")

    # ---------------------------
    # DOCX Extraction
    # ---------------------------
    async def extract_docx(self, path: str) -> str:
        try:
            doc = DocxDocument(path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            return "\n".join(paragraphs)
        except Exception as e:
            await self.update_document_error("FAILED", f"DOCX extraction failed: {e}")
            raise RuntimeError(f"DOCX extraction failed: {e}")

    # ---------------------------
    # TXT Extraction
    # ---------------------------
    async def extract_txt(self, path: str) -> str:
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            await self.update_document_error("FAILED", f"TXT extraction failed: {e}")
            raise RuntimeError(f"TXT extraction failed: {e}")

    # ---------------------------
    # Normalization
    # ---------------------------
    async def normalize_text(self, text: str) -> str:
        text = unicodedata.normalize("NFKC", text)
        text = re.sub(r"[\x00-\x1F\x7F]", " ", text)
        text = re.sub(r"\n{2,}", "\n", text)
        text = re.sub(r"[ ]{2,}", " ", text)
        return text.strip()

    # ---------------------------
    # Unified Dispatcher
    # ---------------------------
    async def extract_text(self, path: str, mime_type: str) -> str:
        if mime_type == "application/pdf":
            raw = await self.extract_pdf_pypdf(path)
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            raw = await self.extract_docx(path)
        elif mime_type == "text/plain":
            raw = await self.extract_txt(path)
        else:
            raise RuntimeError(f"Unsupported MIME type: {mime_type}")

        return await self.normalize_text(raw)
