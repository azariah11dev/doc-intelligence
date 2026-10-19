import threading
from types import SimpleNamespace
from uuid import uuid4

import pytest
from qdrant_client.models import SparseVector

from src.services.rag import model_registry
from src.services.rag import retrieval_engine
from src.services.rag.retrieval_engine import queryRetrieval
from src.services.rag.semantic_chunker import SemanticChunker


def test_model_instances_are_cached(monkeypatch):
    created = {"embedding": [], "reranker": [], "sparse": []}

    class FakeSentenceTransformer:
        def __init__(self, model_name):
            created["embedding"].append(model_name)

    class FakeCrossEncoder:
        def __init__(self, model_name):
            created["reranker"].append(model_name)

    class FakeSparseTextEmbedding:
        def __init__(self, model_name):
            created["sparse"].append(model_name)

    monkeypatch.setattr(model_registry, "SentenceTransformer", FakeSentenceTransformer)
    monkeypatch.setattr(model_registry, "CrossEncoder", FakeCrossEncoder)
    monkeypatch.setattr(model_registry, "SparseTextEmbedding", FakeSparseTextEmbedding)

    model_name = f"test-{uuid4()}"
    reranker_name = f"test-reranker-{uuid4()}"
    sparse_name = f"test-sparse-{uuid4()}"

    embedding_first = model_registry.get_embedding_model(model_name)
    reranker_first = model_registry.get_reranker_model(reranker_name)
    sparse_first = model_registry.get_sparse_model(sparse_name)

    assert model_registry.get_embedding_model(model_name) is embedding_first
    assert model_registry.get_reranker_model(reranker_name) is reranker_first
    assert model_registry.get_sparse_model(sparse_name) is sparse_first
    assert created == {
        "embedding": [model_name],
        "reranker": [reranker_name],
        "sparse": [sparse_name],
    }


def test_rag_service_constructors_do_not_load_models(monkeypatch):
    def unexpected_model_load(*args, **kwargs):
        pytest.fail("Model should not be loaded while constructing a RAG service")

    monkeypatch.setattr(model_registry, "SentenceTransformer", unexpected_model_load)
    monkeypatch.setattr(model_registry, "CrossEncoder", unexpected_model_load)
    monkeypatch.setattr(model_registry, "SparseTextEmbedding", unexpected_model_load)

    SemanticChunker(session=None)
    queryRetrieval(session=None)


@pytest.mark.asyncio
async def test_answer_runs_rewrite_and_retrieval_in_worker_threads(monkeypatch):
    main_thread = threading.get_ident()
    worker_threads = {}

    class FakeGenerationModel:
        def __init__(self, **kwargs):
            pass

        def rephrase_query(self, query):
            worker_threads["rewrite"] = threading.get_ident()
            return query

        def build_prompt(self, **kwargs):
            return "prompt"

        def generate_ollama_stream(self, prompt):
            return iter(["answer"])

    monkeypatch.setattr(retrieval_engine, "GenerationModel", FakeGenerationModel)

    service = queryRetrieval(session=None)

    def retrieve(query):
        worker_threads["retrieve"] = threading.get_ident()
        return []

    async def chat_logs(**kwargs):
        pass

    monkeypatch.setattr(service, "retrieve", retrieve)
    monkeypatch.setattr(service, "chat_logs", chat_logs)

    async for _ in service.answer(
        id=None,
        query="question",
        username="user",
        rewrite_model="rewrite",
        generation_model="generation",
    ):
        pass

    assert worker_threads["rewrite"] != main_thread
    assert worker_threads["retrieve"] != main_thread


@pytest.mark.asyncio
async def test_ingestion_runs_chunking_and_embeddings_in_worker_threads():
    main_thread = threading.get_ident()
    worker_threads = {}
    chunker = SemanticChunker(session=None)

    def record_worker(name, result):
        worker_threads[name] = threading.get_ident()
        return result

    chunker.semantic_chunk = lambda text: record_worker("chunking", ["chunk"])
    chunker.ensure_hybrid_collection = lambda name: record_worker("collection", None)
    chunker.embed_batch = lambda texts: record_worker("dense", [[0.1]])
    chunker.embed_sparse_batch = lambda texts: record_worker(
        "sparse",
        [SparseVector(indices=[1], values=[0.5])],
    )
    chunker.qdrant = SimpleNamespace(
        upsert=lambda **kwargs: record_worker("upsert", None)
    )

    await chunker.ingest_into_qdrant(
        collection_name="test",
        document_text="content",
        file_name="document.txt",
    )

    assert set(worker_threads) == {"chunking", "collection", "dense", "sparse", "upsert"}
    assert all(thread_id != main_thread for thread_id in worker_threads.values())
