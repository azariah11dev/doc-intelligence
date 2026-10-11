from sentence_transformers import SentenceTransformer, CrossEncoder
from qdrant_client.models import ScoredPoint
from qdrant_client import QdrantClient
from typing import List, Literal, AsyncIterator, Dict
import os
from typing import List
from fastembed import SparseTextEmbedding
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import iterate_in_threadpool
from sqlalchemy import select
import uuid
from sqlalchemy.sql import func
import json

from qdrant_client.models import (
    Fusion,
    FusionQuery,
    Prefetch,
    SparseVector,
)

from src.services.rag.llm import GenerationModel
from src.models.user_querydb import Conversation, ChatMessage, MessageContext
from src.schemas.env_schema import settings

qdrant_url = settings.QDRANT_URL or os.getenv("QDRANT_URL")
qdrant = QdrantClient(url=qdrant_url, check_compatibility=False)

class queryRetrieval:
    def __init__(
        self,
        session: AsyncSession,
        model_name: str = "BAAI/bge-m3",
        reranker_name: str = "BAAI/bge-reranker-base",
        collection_name: str = "doc_intelligence",
        dense_vector_name: str = "dense",
        sparse_vector_name: str = "sparse"
    ):
        self.model = SentenceTransformer(model_name)
        self.reranker = CrossEncoder(reranker_name)
        self.collection_name = collection_name
        self.dense_vector_name = dense_vector_name
        self.sparse_vector_name = sparse_vector_name
        self.qdrant = qdrant
        self._sparse_encoder = None
        self.session = session

    # Chat logs
    async def chat_logs(
        self, 
        id: str | uuid.UUID | None,
        username: str, 
        query: str, 
        response: str,
        rephrase: str,
        context: str
    ) -> None:

        conversation_id = uuid.UUID(str(id)) if id else uuid.uuid4()
        convo = select(Conversation).where(Conversation.id == conversation_id)
        convo_result = await self.session.execute(convo)
        conversation = convo_result.scalar_one_or_none()

        if conversation is None:
            conversation = Conversation(
                id=conversation_id,
                username=username,
            )
            self.session.add(conversation)
            await self.session.flush()

        chat = ChatMessage(
            conversation_id=conversation_id,
            query=query,
            response=response,
            rephrase=rephrase
        )

        self.session.add(chat)
        await self.session.flush()  # ensures chat.id is available

        sources = MessageContext(
            message_id=chat.id,
            context=context
        )
        self.session.add(sources)
        # Update conversation timestamp
        conversation.last_updated = func.now()

        await self.session.commit()

    # Sparse encoder
    @property
    def sparse_encoder(self):
        if self._sparse_encoder is None:
            self._sparse_encoder = SparseTextEmbedding(model_name="Qdrant/bm25")
        return self._sparse_encoder

    def embed_sparse_query(self, text: str) -> SparseVector:
        emb = next(iter(self.sparse_encoder.query_embed(text)))
        return SparseVector(indices=emb.indices.tolist(), values=emb.values.tolist())

    # Dense embedding
    def embed_query(self, query: str) -> List[float]:
        return self.model.encode(query, normalize_embeddings=True).tolist()

    # Hybrid search
    def hybrid_search(self, query: str, limit: int = 10, prefetch_limit: int = 50, query_filter=None):
        dense_vec = self.embed_query(query)
        sparse_vec = self.embed_sparse_query(query)

        result = self.qdrant.query_points(
            collection_name=self.collection_name,
            prefetch=[
                Prefetch(
                    query=dense_vec, 
                    using=self.dense_vector_name, 
                    limit=prefetch_limit, 
                    filter=query_filter
                ),
                Prefetch(
                    query=sparse_vec, 
                    using=self.sparse_vector_name, 
                    limit=prefetch_limit, 
                    filter=query_filter
                )
            ],
            query=FusionQuery(fusion=Fusion.RRF),
            limit=limit,
            with_payload=True,
        )
        return result.points

    # Rerank
    def rerank(self, query: str, results: List[ScoredPoint], top_k: int = 5):
        if not results:
            return []

        pairs = [[query, r.payload["text"]] for r in results]
        scores = self.reranker.predict(pairs, batch_size=32)

        reranked = sorted(zip(results, scores), key=lambda x: x[1], reverse=True)
        return reranked[:top_k]

    # Retrieval orchestrator
    def retrieve(self, query: str, k: int = 10):
        query = query.strip()

        candidates = self.hybrid_search(query, limit=k)
        top_docs = self.rerank(query=query, results=candidates)

        return [
            {
                "text": doc.payload["text"],
                "source": doc.payload.get("source"),
                "chunk_count": doc.payload.get("chunk_count"),
                "score": float(score),
                "id": doc.id,
            }
            for doc, score in top_docs
        ]

    def _format_sources(self, retrieved: List[dict]) -> dict:
        if not retrieved:
            return {
                "postgres": "Sources: none",
                "output": "Sources: none"
            }

        grouped: Dict[str, List[str]] = {}

        for doc in retrieved:
            source = doc.get("source") or "unknown source"
            chunk_count = doc.get("chunk_count")
            grouped.setdefault(source, [])
            if chunk_count is not None:
                grouped[source].append(str(chunk_count))

        # Build detailed parts (for DB)
        detailed_parts = []
        for source, chunks in grouped.items():
            if chunks:
                detailed_parts.append(f"{source} ({'; '.join(chunks)})")
            else:
                detailed_parts.append(source)

        # Build simplified parts (for user output)
        simple_parts = list(grouped.keys())

        return {
            "postgres": "Sources: " + "; ".join(detailed_parts),
            "output": "Sources: " + "; ".join(simple_parts)
        }

    # Generation orchestrator
    async def answer(
        self,
        id: str | None,
        query: str,
        username: str,
        rewrite_model: str,
        generation_model: str,
        provider: Literal["ollama", "openai", "claude", "google"] = "ollama",
    ) -> AsyncIterator[str]:
        generation = GenerationModel(
            rewrite_model=rewrite_model,
            generation_model=generation_model,
        )

        if not id:
            id = uuid.uuid4()

        # 1. Rephrase
        if rewrite_model:
            rewritten_query = generation.rephrase_query(query)
            rephrase = rewritten_query
        else:
            rewritten_query = query
            rephrase = None

         # 2. Retrieve
        retrieved = self.retrieve(rewritten_query)

        # Single-line, grouped citation string — used both for the
        # response the user sees and the context that gets logged.
        sources_line = self._format_sources(retrieved)
        context_text = "\n\n".join(doc["text"] for doc in retrieved)

        prompt = generation.build_prompt(query=rewritten_query, context=context_text)

        # 3. Pick a token stream (sync iterator of str)
        if provider == "ollama":
            token_iter = generation.generate_ollama_stream(prompt)
        elif provider == "openai":
            token_iter = generation.generate_openai(prompt)
        elif provider == "claude":
            token_iter = generation.generate_claude(prompt)
        elif provider == "google":
            token_iter = generation.generate_gemini(prompt)
        else:
            raise ValueError(f"Unknown provider: {provider}")

        # 4. Stream tokens out, collecting them for the log
        chunks: list[str] = []
        async for chunk in iterate_in_threadpool(token_iter):
            chunks.append(chunk)
            yield chunk

        # 4b. Attach sources as a trailing line on the response itself,
        # not just in the DB log, so the citation is actually visible
        # to whoever is reading the answer.
        try:
            if token_iter:
                trailing = f"\n{sources_line.get("output")}"
                chunks.append(trailing)
                yield trailing
        except Exception as e:
            if not token_iter:
                raise ConnectionError(f"Ollama server error due to: {e}")
        finally:
            # I need to pass on conversation ID for conversation history
            # but can't display this show up in chat
            yield json.dumps({"meta": {"conversation_id": str(id)}})

        # 5. Runs after the last token
        await self.chat_logs(
            id=id,
            username=username,
            query=query,
            rephrase=rephrase,
            response="".join(chunks),
            context=sources_line.get("postgres"),
        )