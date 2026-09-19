from sentence_transformers import SentenceTransformer, CrossEncoder
from qdrant_client.models import ScoredPoint
from qdrant_client import QdrantClient
from typing import List, Literal
import os
from typing import List
from fastembed import SparseTextEmbedding
from sqlalchemy.ext.asyncio import AsyncSession

from qdrant_client.models import (
    Fusion,
    FusionQuery,
    Prefetch,
    SparseVector,
)

from src.services.rag.llm import GenerationModel
from src.schemas.env_schema import settings
from src.models.user_querydb import ChatHistory

qdrant_url = settings.QDRANT_URL or os.getenv("QDRANT_URL")
qdrant = QdrantClient(url=qdrant_url, check_compatibility=False)

class queryRetrieval:
    def __init__(
        self,
        session: AsyncSession,
        model_name: str = "BAAI/bge-m3",
        reranker_name: str = "BAAI/bge-reranker-base",
        collection_name: str = "documents",
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
        username: str, 
        query: str, 
        rephrase: str,
        response: str,
        context: str
    ) -> None:
        
        logging = ChatHistory(
            username=username,
            query=query,
            rephrase=rephrase,
            response=response,
            context=context
        )

        self.session.add(logging)
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
                "chunk_index": doc.payload.get("chunk_index"),
                "score": float(score),
                "id": doc.id,
            }
            for doc, score in top_docs
        ]

    # Generation orchestrator
    async def answer(
        self, 
        query: str, 
        username: str,
        rewrite_model: str,
        generation_model: str,
        provider: Literal["ollama", "openai", "claude", "google"] = "ollama"
    ) -> str: 

        try:
            generation = GenerationModel(
                rewrite_model=rewrite_model,
                generation_model=generation_model
            )

            # 1. Rephrase
            rewritten_query = generation.rephrase_query(query)

            # 2. Retrieve
            retrieved = self.retrieve(rewritten_query)

            # 3. Build context source
            context_source = "\n".join(
                f"{doc['source']}:{doc['chunk_count']}"
                for doc in retrieved
            )

            # 4. Build context text
            context_text = "\n\n".join(doc["text"] for doc in retrieved)

            # 5. Build prompt
            prompt = generation.build_prompt(
                query=rewritten_query,
                context=context_text,
            )

            # 6. Provider routing
            if provider == "openai":
                final_response = generation.generate_openai(prompt)
            elif provider == "claude":
                final_response = generation.generate_claude(prompt)
            elif provider == "ollama":
                final_response = generation.generate_ollama(prompt)
            elif provider == "google":
                final_response = generation.generate_gemini(prompt)
            else:
                raise ValueError(f"Unknown provider: {provider}")

            # 7. Log chat
            await self.chat_logs(
                username=username,
                query=query,
                rephrase=rewritten_query,
                response=final_response,
                context=context_source
            )

            return final_response

        except Exception as e:
            raise RuntimeError(f"Generation failed: {e}") from e