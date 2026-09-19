import re
import uuid
import os
from typing import List, Optional, Sequence

from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    Modifier,
    PointStruct,
    SparseIndexParams,
    SparseVector,
    SparseVectorParams,
    VectorParams,
    Filter,
    FieldCondition,
    MatchValue,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.documentdb import Document
from src.schemas.env_schema import settings
from fastembed import SparseTextEmbedding

qdrant_url = settings.QDRANT_URL or os.getenv("QDRANT_URL")
qdrant = QdrantClient(url=qdrant_url, check_compatibility=False)

SECTION_PATTERNS = [
    r"^Chapter\b",
    r"^Section\b",
    r"^##\s+",
    r"^\d+\.\s+",
]

class SemanticChunker:
    def __init__(
        self,
        session: AsyncSession,
        model_name: str = "BAAI/bge-m3",
        max_chunk_size: int = 2000,
        overlap_ratio: float = 0.15,
        dense_vector_name: str = "dense",
        sparse_vector_name: str = "sparse",
    ) -> None:
        self.session = session
        self.qdrant = qdrant
        self.dense_vector_name = dense_vector_name
        self.sparse_vector_name = sparse_vector_name

        self.model = SentenceTransformer(model_name)
        self.max_chunk_size = max_chunk_size
        self.overlap_chars = int(max_chunk_size * overlap_ratio)

        self.compiled_patterns: Sequence[re.Pattern] = [
            re.compile(p, re.MULTILINE) for p in SECTION_PATTERNS
        ]

        # Cache embedding dimension once
        try:
            self.vector_dim = self.model._first_module().get_output_dim()
        except Exception:
            self.vector_dim = len(self.model.encode("probe"))

        self._sparse_encoder: Optional[SparseTextEmbedding] = None

    # ------------------------------------------------------------------
    # Document status
    # ------------------------------------------------------------------
    async def update_document_status(
        self,
        document_id: str,
        status: str,
        error: Optional[str] = None,
    ) -> None:
        query = select(Document).where(Document.id == document_id)
        result = (await self.session.execute(query)).scalars().first()

        if not result:
            raise ValueError(f"Document not found: {document_id}")

        result.status = status
        result.error = error

        await self.session.commit()
        await self.session.refresh(result)

    # ------------------------------------------------------------------
    # Naive character-based splitter (fallback)
    # ------------------------------------------------------------------
    def naive_split(self, text: str) -> List[str]:
        chunks: List[str] = []
        step = self.max_chunk_size - self.overlap_chars

        for i in range(0, len(text), step):
            chunk = text[i : i + self.max_chunk_size]
            chunks.append(chunk)

        return chunks

    # ------------------------------------------------------------------
    # Table detection
    # ------------------------------------------------------------------
    def is_table(self, text: str) -> bool:
        """
        Detects whether a block of text is a table.
        Works for:
        - Markdown tables
        - Tabular PDF extractions
        - Whitespace-aligned tables
        """

        # Markdown table
        if "|" in text and "---" in text:
            return True

        # Tab-separated rows
        if "\t" in text:
            return True

        # Multiple aligned columns (common in 10-K financials)
        lines = text.split("\n")
        if len(lines) >= 3:
            col_counts = [len(re.split(r"\s{2,}", ln)) for ln in lines if ln.strip()]
            if sum(c > 1 for c in col_counts) >= 3:
                return True

        return False

    # ------------------------------------------------------------------
    # Table splitting
    # ------------------------------------------------------------------
    def chunk_table(self, table_text: str) -> List[str]:
        """
        Chunk a table while preserving row integrity.
        Handles:
        - Markdown tables
        - Tab-separated tables
        - Whitespace-aligned tables
        - Large financial tables (10-K)
        """

        lines = [ln.rstrip() for ln in table_text.split("\n") if ln.strip()]
        if not lines:
            return []

        full_table = "\n".join(lines)
        if len(full_table) <= self.max_chunk_size:
            return [full_table]

        chunks: List[str] = []
        current_rows: List[str] = []
        current_len = 0

        for row in lines:
            row_len = len(row)

            if current_len + row_len > self.max_chunk_size and current_rows:
                chunks.append("\n".join(current_rows))
                current_rows = []
                current_len = 0

            current_rows.append(row)
            current_len += row_len

        if current_rows:
            chunks.append("\n".join(current_rows))

        return chunks

    # ------------------------------------------------------------------
    # Paragraph / sentence splitting
    # ------------------------------------------------------------------
    def split_paragraph(self, paragraph: str) -> List[str]:
        paragraph = paragraph.strip()
        if not paragraph:
            return []

        # If this paragraph is actually a table, delegate
        if self.is_table(paragraph):
            return self.chunk_table(paragraph)

        if len(paragraph) <= self.max_chunk_size:
            return [paragraph]

        sentences = re.split(r"(?<=[.!?])\s+", paragraph)

        if len(sentences) > 1:
            result: List[str] = []
            current: List[str] = []
            current_len = 0

            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue

                if len(sentence) > self.max_chunk_size:
                    result.extend(self.naive_split(sentence))
                    continue

                if current_len + len(sentence) > self.max_chunk_size and current:
                    result.append(" ".join(current))
                    current = []
                    current_len = 0

                current.append(sentence)
                current_len += len(sentence)

            if current:
                result.append(" ".join(current))

            return result

        return self.naive_split(paragraph)

    # ------------------------------------------------------------------
    # Section splitting
    # ------------------------------------------------------------------
    def split_into_sections(self, text: str) -> List[str]:
        text = text.strip()
        if not text:
            return []

        # If the whole block is a table, don't try to section it
        if self.is_table(text):
            return [text]

        indices: List[int] = []

        for pattern in self.compiled_patterns:
            for match in pattern.finditer(text):
                indices.append(match.start())

        if not indices:
            return [text] if text else []

        indices = sorted(set(indices))
        sections: List[str] = []

        for i in range(len(indices)):
            start = indices[i]
            end = indices[i + 1] if i + 1 < len(indices) else len(text)
            section = text[start:end].strip()
            if section:
                sections.append(section)

        return sections

    # ------------------------------------------------------------------
    # Semantic chunking with fixed character overlap
    # ------------------------------------------------------------------
    def semantic_chunk(self, text: str) -> List[str]:
        text = text.strip()
        if not text:
            return []

        sections = self.split_into_sections(text)
        if not sections:
            sections = [text]

        chunks: List[str] = []

        for section in sections:
            section = section.strip()
            if not section:
                continue

            # If section is a table, chunk as table and append directly
            if self.is_table(section):
                table_chunks = self.chunk_table(section)
                chunks.extend(table_chunks)
                continue

            # Otherwise treat as paragraphs
            flat_paragraphs: List[str] = []
            paragraphs = section.split("\n\n")
            for p in paragraphs:
                flat_paragraphs.extend(self.split_paragraph(p))

            if not flat_paragraphs:
                continue

            current: List[str] = []
            current_len = 0

            for p in flat_paragraphs:
                p = p.strip()
                if not p:
                    continue

                if current_len + len(p) > self.max_chunk_size and current:
                    chunk_text = "\n\n".join(current)
                    chunks.append(chunk_text)

                    # Character-based overlap from tail of chunk
                    if self.overlap_chars > 0 and len(chunk_text) > self.overlap_chars:
                        overlap_tail = chunk_text[-self.overlap_chars :]
                        current = [overlap_tail]
                        current_len = len(overlap_tail)
                    else:
                        current = []
                        current_len = 0

                current.append(p)
                current_len += len(p)

            if current:
                chunks.append("\n\n".join(current))

        return chunks

    # ------------------------------------------------------------------
    # Batch embedding
    # ------------------------------------------------------------------
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        vectors = self.model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
            batch_size=64,
        )
        return vectors.tolist()

    # ------------------------------------------------------------------
    # Sparse embedding
    # ------------------------------------------------------------------
    @property
    def sparse_encoder(self) -> SparseTextEmbedding:
        if self._sparse_encoder is None:
            self._sparse_encoder = SparseTextEmbedding(model_name="Qdrant/bm25")
        return self._sparse_encoder

    def embed_sparse_batch(self, texts: Sequence[str]) -> List[SparseVector]:
        return [
            SparseVector(indices=emb.indices.tolist(), values=emb.values.tolist())
            for emb in self.sparse_encoder.embed(list(texts))
        ]

    # ------------------------------------------------------------------
    # Collection management
    # ------------------------------------------------------------------
    def ensure_hybrid_collection(self, collection_name: str) -> None:
        if self.qdrant.collection_exists(collection_name):
            self._assert_hybrid_schema(collection_name)
            return

        self.qdrant.create_collection(
            collection_name=collection_name,
            vectors_config={
                self.dense_vector_name: VectorParams(
                    size=self.vector_dim,
                    distance=Distance.COSINE,
                ),
            },
            sparse_vectors_config={
                self.sparse_vector_name: SparseVectorParams(
                    index=SparseIndexParams(on_disk=False),
                    modifier=Modifier.IDF,
                ),
            },
        )

    def _assert_hybrid_schema(self, collection_name: str) -> None:
        info = self.qdrant.get_collection(collection_name)
        params = info.config.params

        dense = params.vectors
        if not isinstance(dense, dict) or self.dense_vector_name not in dense:
            raise RuntimeError(
                f"Collection '{collection_name}' has no named vector "
                f"'{self.dense_vector_name}'. It was probably created with the old "
                f"dense-only schema and must be recreated + re-ingested."
            )

        sparse = params.sparse_vectors or {}
        if self.sparse_vector_name not in sparse:
            raise RuntimeError(
                f"Collection '{collection_name}' has no sparse vector "
                f"'{self.sparse_vector_name}'. Recreate it to enable hybrid search."
            )

    # ------------------------------------------------------------------
    # Qdrant ingestion
    # ------------------------------------------------------------------
    async def ingest_into_qdrant(
        self,
        collection_name: str,
        document_text: str,
        file_name: str,
        batch_size: int = 256,
        document_id_for_status: Optional[str] = None,
    ) -> None:
        if not document_text or not document_text.strip():
            return

        try:
            chunks = self.semantic_chunk(document_text)
            if not chunks:
                return

            self.ensure_hybrid_collection(collection_name)

            total_chunks = len(chunks)

            for start in range(0, total_chunks, batch_size):
                batch_chunks = chunks[start : start + batch_size]

                dense_vectors = self.embed_batch(batch_chunks)
                sparse_vectors = self.embed_sparse_batch(batch_chunks)

                points: List[PointStruct] = []
                for offset, (chunk, dense_vec, sparse_vec) in enumerate(
                    zip(batch_chunks, dense_vectors, sparse_vectors)
                ):
                    idx = start + offset
                    points.append(
                        PointStruct(
                            id=str(uuid.uuid4()),
                            vector={
                                self.dense_vector_name: dense_vec,
                                self.sparse_vector_name: sparse_vec,
                            },
                            payload={
                                "text": chunk,
                                "source": file_name,
                                "chunk_count": f"{idx} out of {total_chunks}",
                                "chunk_index": idx,
                                "total_chunk_count": total_chunks,
                            },
                        )
                    )

                self.qdrant.upsert(collection_name=collection_name, points=points)

            if document_id_for_status:
                await self.update_document_status(
                    document_id=document_id_for_status,
                    status="SUCCESS",
                    error=None,
                )

        except Exception as e:
            if document_id_for_status:
                await self.update_document_status(
                    document_id=document_id_for_status,
                    status="FAILED",
                    error=str(e),
                )
            raise RuntimeError(f"Failed to store chunks in Qdrant: {e}") from e

    # ------------------------------------------------------------------
    # Delete by source
    # ------------------------------------------------------------------
    async def delete_vectors_by_source(self, collection_name: str, file_name: str):
        """
        Delete all Qdrant points where payload['source'] == file_name.
        """
        try:
            delete_filter = Filter(
                must=[
                    FieldCondition(
                        key="source",
                        match=MatchValue(value=file_name),
                    )
                ]
            )

            self.qdrant.delete(
                collection_name=collection_name,
                points_selector=delete_filter,
            )
            return f"Successfully deleted stored chunks with source {file_name}"

        except Exception as e:
            raise RuntimeError(
                f"Failed to delete stored chunks with source {file_name} in Qdrant due to {e}"
            )
