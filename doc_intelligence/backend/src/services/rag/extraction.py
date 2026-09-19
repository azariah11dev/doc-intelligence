import re
import unicodedata
from docx import Document as DocxDocument
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextBoxHorizontal, LTTextLineHorizontal, LTChar

from src.models.documentdb import Document
from src.services.rag.semantic_chunker import SemanticChunker

class DocumentExtractor:
    def __init__(
        self, 
        document_id: str,
        file_name: str, 
        file_path: str,
        session: AsyncSession
    ):
        self.session = session
        self.document_id = document_id
        self.file_name = file_name
        self.file_path = file_path

    async def update_document_status(self, status: str, error: str = None):
        query = select(Document).where(Document.id == self.document_id)
        result = (await self.session.execute(query)).scalars().first()

        if not result:
            raise ValueError(f"Document not found: {self.document_id}")

        result.status = status
        result.error = error

        await self.session.commit()
        await self.session.refresh(result)

    # ---------------------------
    # PDF Extraction (pypdf)
    # ---------------------------
    async def extract_pdf_pdfminer(self) -> str:
        try:
            sections = []
            current_section = []
            last_font_size = None
        
            for page_layout in extract_pages(self.file_path):
                for element in page_layout:
                    if isinstance(element, LTTextBoxHorizontal):
                        for line in element:
                            if isinstance(line, LTTextLineHorizontal):
                                text = line.get_text().strip()
                                if not text:
                                    continue
        
                                # Detect font size
                                font_sizes = [
                                    char.size for char in line if isinstance(char, LTChar)
                                ]
                                avg_font = sum(font_sizes) / len(font_sizes) if font_sizes else 0
        
                                # Heuristic: headings have larger font
                                if last_font_size and avg_font > last_font_size * 1.3:
                                    # Start new section
                                    if current_section:
                                        sections.append("\n".join(current_section))
                                        current_section = []
        
                                current_section.append(text)
                                last_font_size = avg_font
        
            if current_section:
                sections.append("\n".join(current_section))
        
            return sections

        except Exception as e:
            await self.update_document_status("FAILED", f"PDF extraction failed (pypdf): {e}")
            raise RuntimeError(f"PDF extraction failed (pypdf): {e}")

    # ---------------------------
    # DOCX Extraction
    # ---------------------------
    async def extract_docx(self) -> str:
        try:
            doc = DocxDocument(self.file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            return "\n\n".join(paragraphs)
        
        except Exception as e:
            await self.update_document_status("FAILED", f"DOCX extraction failed: {e}")
            raise RuntimeError(f"DOCX extraction failed: {e}")

    # ---------------------------
    # TXT Extraction
    # ---------------------------
    async def extract_txt(self) -> str:
        try:
            with open(self.file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
            
        except Exception as e:
            await self.update_document_status("FAILED", f"TXT extraction failed: {e}")
            raise RuntimeError(f"TXT extraction failed: {e}")

    # ---------------------------
    # Normalization
    # ---------------------------
    def normalize_text(self, text: str) -> str:
        text = unicodedata.normalize("NFKC", text)
        text = re.sub(r"[\x00-\x1F\x7F]", " ", text)
        text = re.sub(r"\n{2,}", "\n", text)
        text = re.sub(r"[ ]{2,}", " ", text)
        return text.strip()

    # ---------------------------
    # Unified Dispatcher
    # ---------------------------
    async def extract_text(self, collection_name: str, mime_type: str) -> dict:

        # Mark as processing BEFORE extraction
        await self.update_document_status("PROCESSING")

        if mime_type == "application/pdf":
            raw = await self.extract_pdf_pdfminer()
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            raw = await self.extract_docx()
        elif mime_type == "text/plain":
            raw = await self.extract_txt()
        else:
            raise RuntimeError(f"Unsupported MIME type: {mime_type}")

        text = self.normalize_text(raw)
        chunker = SemanticChunker(session=self.session)

        await chunker.ingest_into_qdrant(
            collection_name=collection_name,
            document_text=text,
            file_name=self.file_name,
            document_id_for_status=self.document_id
        )

        return {"message": f"storage successful for {self.document_id}"}
