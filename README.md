# RAG Backend Service

A production-oriented **Retrieval-Augmented Generation (RAG) backend** built with **FastAPI, Qdrant, PostgreSQL, and multiple LLM providers**.

The service handles the complete RAG workflow:

**Document ingestion → text extraction → chunking → embeddings → vector storage → semantic retrieval → query rewriting → LLM generation → streaming response → audit logging**

The architecture separates ingestion, retrieval, and generation into modular service layers, making the system easier to extend and maintain.

---

## Features

### 📄 Document Ingestion

* Upload PDF, DOCX, TXT, and other supported file types
* Automatic file storage under `models/files/`
* File metadata extraction:

  * Filename
  * File type
  * File size
  * Upload timestamp
* Database-backed audit trail
* File validation
* Safe directory creation and path handling

### 🧩 Chunking & Embeddings

* Text extraction from uploaded documents
* Configurable text chunking
* Embedding generation using the configured embedding model
* Vector storage in Qdrant
* Chunk metadata for retrieval traceability
* Source tracking using `source:chunk_index`

### 🔎 Semantic Retrieval

* Query rewriting before retrieval
* Qdrant vector search
* Top-k chunk retrieval
* Context assembly for LLM generation
* Retrieval source tracking

### 🤖 Multi-Provider LLM Generation

The backend provides a unified interface for multiple LLM providers:

| Provider      | Example Models                  |
| ------------- | ------------------------------- |
| **OpenAI**    | GPT-4o, GPT-4o-mini             |
| **Anthropic** | Claude 3.5 Sonnet               |
| **Google**    | Gemini 2.0 Flash, Gemini Pro    |
| **Ollama**    | Llama 3.1, Mistral, Phi-3, etc. |

Additional capabilities:

* Streaming responses
* Provider-specific model routing
* Unified generation interface
* Local Ollama model for query rewriting
* Optional local LLM inference

### 📝 Chat Logging

Each RAG interaction can be logged for analytics and traceability, including:

* Original question
* Rewritten question
* Retrieved context sources
* Final response
* Timestamp
* Username

---

## Architecture

The backend is organized around three primary stages:

```text
                    ┌─────────────────┐
                    │     Document    │
                    │      Upload     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Text Extraction │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Chunking    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Embeddings   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Qdrant      │
                    │  Vector Storage │
                    └─────────────────┘


User Query
    │
    ▼
┌─────────────────┐
│ Query Rewriting │
│    (Ollama)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Embedding    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Qdrant Search   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Context Assembly│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Provider   │
│ OpenAI / Claude │
│ Google / Ollama │
└────────┬────────┘
         │
         ▼
   Streaming Answer
```

---

## API Endpoints

### Document Management

| Method | Endpoint              | Description                     |
| ------ | --------------------- | ------------------------------- |
| `GET`  | `/upload/files`       | List stored documents           |
| `GET`  | `/upload/audit_trail` | View document ingestion history |

### RAG Generation

| Method | Endpoint                      | Description                                   |
| ------ | ----------------------------- | --------------------------------------------- |
| `POST` | `/response_generation/answer` | Generate a RAG answer with streaming          |
| `...`  | `/response_generation/...`    | Additional retrieval and generation utilities |

---

## Project Structure

```text
backend/
│
├── services/
│   ├── rag/
│   │   ├── retrieval_engine.py      # RAG pipeline
│   │   ├── chunker.py               # Text chunking logic
│   │   ├── embeddings.py            # Embedding generation
│   │   └── ingestion.py             # Document ingestion
│   │
│   ├── model_dependencies/
│   │   ├── session_maker.py         # Database session factory
│   │   └── clients.py               # LLM provider clients
│   │
│   └── utils/
│       └── file_utils.py            # File validation and path helpers
│
├── routers/
│   ├── upload_router.py             # File ingestion and audit endpoints
│   └── response_generation.py       # RAG answer endpoint
│
├── schemas/
│   ├── env_schema.py                # Environment configuration
│   └── response_gen.py              # Request/response schemas
│
├── models/
│   ├── files/                       # Uploaded documents
│   └── document.py                  # SQLAlchemy document model
│
└── main.py                          # FastAPI application entrypoint
```

---

# RAG Pipeline

## 1. Query Rewriting

Before retrieval, the user's query is passed through a lightweight local Ollama model.

The rewriting prompt instructs the model to:

```text
Correct grammar and spelling only.
Do not answer the question.
```

The goal is to normalize the query while preserving the user's original intent.

---

## 2. Retrieval

The rewritten query is converted into an embedding and used to search Qdrant.

```text
Rewritten Query
       │
       ▼
   Embedding
       │
       ▼
 Qdrant Vector Search
       │
       ▼
   Top-K Chunks
       │
       ▼
 Context Assembly
```

The retrieved chunks are combined into the context passed to the generation model.

Each retrieved chunk maintains source information for traceability.

---

## 3. Prompt Construction

The assembled context is provided to the generation model using a constrained prompt:

```text
You are a helpful assistant. Use ONLY the context below to answer the question.

Context:
<retrieved chunks>

Question:
<rewritten query>

Answer:
```

This separates the retrieved source material from the user's question and instructs the model to ground its response in the retrieved context.

---

## 4. LLM Generation

The user can select the provider used to generate the final response.

```python
provider = "openai" | "claude" | "google" | "ollama"
```

Streaming responses are supported across the configured providers.

The backend uses a unified generation interface so the rest of the RAG pipeline does not need to be tightly coupled to a specific LLM provider.

---

## 5. Logging

RAG interactions are logged for traceability and analytics.

A typical interaction records:

```text
Original Question
        │
        ▼
Rewritten Question
        │
        ▼
Retrieved Sources
        │
        ▼
Generated Response
        │
        ▼
Timestamp + User
```

---

# Environment Variables

Create an environment configuration containing the required credentials and service settings.

```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

OLLAMA_HOST=http://localhost:11434

QDRANT_URL=
QDRANT_API_KEY=

DATABASE_URL=
```

Provider-specific API keys are only required when using the corresponding provider.

---

# Installation

## 1. Install Dependencies

```bash
pip install -r requirements.txt
```

## 2. Start the FastAPI Server

```bash
uvicorn main:app --reload
```

The API will be available at:

```text
http://localhost:8000
```

FastAPI's interactive documentation is available at:

```text
http://localhost:8000/docs
```

---

## 3. Start Qdrant

For a local Qdrant instance:

```bash
docker run -p 6333:6333 qdrant/qdrant
```

Qdrant will be available at:

```text
http://localhost:6333
```

---

## 4. Start Ollama

Ollama is used for local query rewriting and is optional if the application is configured differently.

Start the Ollama server:

```bash
ollama serve
```

Then make sure the required model is available locally.

For example:

```bash
ollama pull llama3.1:8b-instruct
```

---

# API Usage

## Generate a RAG Answer

### Request

```http
POST /response_generation/answer
```

### Example Request Body

```json
{
  "question": "What is SOP-104?",
  "username": "alex",
  "rewrite_model": "llama3.1:8b-instruct",
  "generation_model": "gpt-4o-mini",
  "provider": "openai"
}
```

The endpoint returns the generated response as a stream.

---

## List Uploaded Files

```http
GET /upload/files
```

Returns the documents currently stored by the backend.

---

## Get Audit Trail

```http
GET /upload/audit_trail
```

Returns document ingestion history recorded by the application.

---

# Design Principles

### Provider Abstraction

LLM providers are accessed through a unified interface, allowing the application to switch between cloud and local models without restructuring the RAG pipeline.

### Separation of Concerns

The backend separates:

* Document ingestion
* Text processing
* Embedding generation
* Vector retrieval
* Prompt construction
* LLM generation
* Logging

This keeps individual components easier to test and replace.

### Local-First Components

Ollama can be used for local inference, allowing lightweight processing such as query rewriting to run without an external API.

### Traceability

Document metadata, chunk indexes, retrieved sources, and chat history provide visibility into how information moves through the RAG pipeline.

---

# Future Improvements

Planned improvements include:
* [ ] Rate limiting
* [ ] Response caching
* [ ] Full retrieval and generation trace visualization
* [ ] LangSmith-style observability

---
