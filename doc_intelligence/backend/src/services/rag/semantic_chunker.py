import re
import nltk
from typing import List
from sentence_transformers import SentenceTransformer, util
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.documentdb import Document

nltk.download("punkt")

# Global Qdrant client (correct)
qdrant = QdrantClient("localhost", port=6333)


class SemanticChunker:
    SECTION_PATTERNS = [
        r"^Chapter\b",
        r"^Section\b",
        r"^##\s+",
        r"^\d+\.\s+"
    ]

    def __init__(self, model_name="all-MiniLM-L6-v2", threshold=0.55, session: AsyncSession = None):
        self.model = SentenceTransformer(model_name)
        self.threshold = threshold
        self.session = session
        self.compiled_patterns = [re.compile(p, re.MULTILINE) for p in self.SECTION_PATTERNS]

    # ---------------------------
    # Update document status
    # ---------------------------
    async def update_document_status(self, document_id: str, status: str, error: str = None):
        query = select(Document).where(Document.id == document_id)
        result = (await self.session.execute(query)).scalars().first()

        if not result:
            raise ValueError("Document not found")

        result.status = status
        result.error = error

        await self.session.commit()
        await self.session.refresh(result)

    # ---------------------------
    # Section splitting
    # ---------------------------
    def split_into_sections(self, text: str) -> List[str]:
        indices = []

        for pattern in self.compiled_patterns:
            for match in pattern.finditer(text):
                indices.append(match.start())

        if not indices:
            return []

        indices = sorted(indices)
        sections = []

        for i in range(len(indices)):
            start = indices[i]
            end = indices[i + 1] if i + 1 < len(indices) else len(text)
            section = text[start:end].strip()
            if section:
                sections.append(section)

        return sections

    # ---------------------------
    # Semantic chunking
    # ---------------------------
    def chunk(self, text: str) -> List[str]:
        sentences = nltk.sent_tokenize(text)

        if not sentences:
            return []

        embeddings = self.model.encode(sentences, convert_to_tensor=True)

        chunks = []
        current = [sentences[0]]

        for i in range(1, len(sentences)):
            sim = util.cos_sim(embeddings[i], embeddings[i - 1]).item()

            if sim < self.threshold:
                chunks.append(" ".join(current))
                current = [sentences[i]]
            else:
                current.append(sentences[i])

        if current:
            chunks.append(" ".join(current))

        return chunks

    # ---------------------------
    # Embedding
    # ---------------------------
    def embed(self, texts: List[str]) -> List[List[float]]:
        return self.model.encode(texts, normalize_embeddings=True).tolist()

    # ---------------------------
    # Store in Qdrant
    # ---------------------------
    async def store_chunks_qdrant(self, doc_id: str, chunks: list, embeddings: list):
        try:
            points = []

            for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                points.append(
                    PointStruct(
                        id=f"{doc_id}_{i}",
                        vector=emb,
                        payload={
                            "document_id": doc_id,
                            "chunk_index": i,
                            "text": chunk
                        }
                    )
                )

            await qdrant.upsert(collection_name="documents", points=points)

            await self.update_document_status(doc_id, "READY")
            
        except Exception as e:
            await self.update_document_status(doc_id, "FAILED", str(e))
            raise RuntimeError(f"Failed to store chunks in Qdrant: {e}")

    # ---------------------------
    # Unified pipeline
    # ---------------------------
    async def unified_run(self, text: str, doc_id: str):
        sections = self.split_into_sections(text)

        if not sections:
            sections = [text]

        all_chunks = []
        for sec in sections:
            all_chunks.extend(self.chunk(sec))

        embeddings = self.embed(all_chunks)

        await self.store_chunks_qdrant(doc_id, all_chunks, embeddings)

        return {
            "chunks": all_chunks,
            "embeddings": embeddings
        }
