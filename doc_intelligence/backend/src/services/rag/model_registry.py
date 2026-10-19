from threading import Lock

from fastembed import SparseTextEmbedding
from sentence_transformers import CrossEncoder, SentenceTransformer

_model_lock = Lock()
_embedding_models: dict[str, SentenceTransformer] = {}
_reranker_models: dict[str, CrossEncoder] = {}
_sparse_models: dict[str, SparseTextEmbedding] = {}


def get_embedding_model(model_name: str) -> SentenceTransformer:
    with _model_lock:
        model = _embedding_models.get(model_name)
        if model is None:
            model = SentenceTransformer(model_name)
            _embedding_models[model_name] = model
        return model


def get_reranker_model(model_name: str) -> CrossEncoder:
    with _model_lock:
        model = _reranker_models.get(model_name)
        if model is None:
            model = CrossEncoder(model_name)
            _reranker_models[model_name] = model
        return model


def get_sparse_model(model_name: str) -> SparseTextEmbedding:
    with _model_lock:
        model = _sparse_models.get(model_name)
        if model is None:
            model = SparseTextEmbedding(model_name=model_name)
            _sparse_models[model_name] = model
        return model
