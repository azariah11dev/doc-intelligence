from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from typing import List
import numpy as np
import json
import httpx


class RAGQueryEngine:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        self.embedder = SentenceTransformer(model_name)
        self.qdrant = QdrantClient("localhost", port=6333)

    # ---------------------------
    # 1. Embed user query
    # ---------------------------
    def embed_query(self, query: str) -> List[float]:
        return self.embedder.encode(query, normalize_embeddings=True).tolist()

    # ---------------------------
    # 2. Retrieve top-k chunks
    # ---------------------------
    def retrieve(self, query_vector: List[float], top_k: int = 5):
        search_result = self.qdrant.search(
            collection_name="documents",
            query_vector=query_vector,
            limit=top_k
        )
        return search_result

    # ---------------------------
    # 3. Build context window
    # ---------------------------
    def build_context(self, results):
        context_blocks = []
        for r in results:
            text = r.payload["text"]
            context_blocks.append(text)

        return "\n\n".join(context_blocks)

    # ---------------------------
    # 4. Generate answer using LLM
    # ---------------------------
    async def generate_answer(self, question: str, context: str):
        prompt = f"""
You are a RAG system. Use ONLY the context below to answer.

Context:
{context}

Question:
{question}

Answer with citations by chunk_index.
"""

        # Example using OpenAI-compatible API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:11434/v1/chat/completions",
                json={
                    "model": "phi3",
                    "messages": [{"role": "user", "content": prompt}]
                }
            )

        return response.json()["choices"][0]["message"]["content"]

    # ---------------------------
    # Unified RAG Query
    # ---------------------------
    async def query(self, question: str, top_k: int = 5):
        # Step 1: embed query
        q_vec = self.embed_query(question)

        # Step 2: retrieve chunks
        results = self.retrieve(q_vec, top_k=top_k)

        # Step 3: build context
        context = self.build_context(results)

        # Step 4: generate answer
        answer = await self.generate_answer(question, context)

        return {
            "answer": answer,
            "context": context,
            "chunks": [r.payload for r in results]
        }
