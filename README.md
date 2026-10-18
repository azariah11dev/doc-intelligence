# Document Intelligence — Retrieval-Augmented Generation (RAG)

A full-stack document intelligence application built with **FastAPI, Next.js, Qdrant, PostgreSQL, and multiple LLM providers**. The system transforms uploaded documents into searchable knowledge sources and uses retrieval-augmented generation to produce context-grounded answers.

The application implements an end-to-end RAG pipeline, including document ingestion, text extraction, chunking, embedding generation, vector storage, semantic retrieval, query rewriting, LLM generation, streaming responses, and audit logging.

The project emphasizes modular backend services, provider abstraction, document traceability, and maintainable application architecture.

## Key Features

### Document Ingestion and Management

- Upload supported document formats, including PDF, DOCX, and TXT.
- Extract text and prepare documents for indexing.
- Store uploaded files in `models/files/`.
- Capture file metadata, including filename, file type, size, and upload timestamp.
- Validate uploaded files and handle storage paths safely.
- Maintain database-backed document ingestion audit trails.

### Chunking and Vector Storage

- Split extracted text into configurable chunks.
- Generate embeddings using the configured embedding model.
- Store vectors and associated metadata in Qdrant.
- Preserve source references and chunk indices for retrieval traceability.
- Support semantic search over indexed document content.

### Retrieval-Augmented Generation

- Optionally rewrite user queries before retrieval.
- Convert queries into embeddings for vector search.
- Retrieve the most relevant document chunks from Qdrant.
- Assemble retrieved content into context for the generation model.
- Track retrieved sources to support document-level traceability.
- Ground generated responses in retrieved document context.

### Multi-Provider LLM Integration

A unified generation interface separates provider-specific logic from the core RAG workflow.

| Provider | Example models |
|---|---|
| OpenAI | GPT-4o, GPT-4o-mini |
| Anthropic | Claude 3.5 Sonnet |
| Google | Gemini models |
| Ollama | Locally hosted models, including Llama and Mistral families |

Provider availability depends on the current application configuration. See [LLM Provider Configuration](#llm-provider-configuration) for details.

Additional capabilities include:

- Streaming generated responses.
- Provider-specific model routing.
- A common interface for model generation.
- Optional local inference through Ollama.
- Local query rewriting when enabled.

### Interaction Logging and Traceability

The application supports logging RAG interactions for debugging, analytics, and traceability.

Logged information can include:

- Original user question.
- Rewritten query.
- Retrieved context sources.
- Generated response.
- Timestamp.
- Associated username.

The exact information recorded depends on the configured logging implementation.

---

## Architecture

The application separates document ingestion, retrieval, and generation into distinct stages.

### Document Ingestion Pipeline

```text
Document Upload
      |
      v
File Validation
      |
      v
Text Extraction
      |
      v
Text Chunking
      |
      v
Embedding Generation
      |
      v
Qdrant Vector Storage
```

Uploaded documents are processed into searchable chunks. The resulting vectors and metadata are stored in Qdrant, while uploaded files and associated records are maintained by the application's storage and database layers.

### Query and Generation Pipeline

```text
User Question
      |
      v
Optional Query Rewriting
      |
      v
Query Embedding
      |
      v
Qdrant Semantic Search
      |
      v
Top-K Chunk Retrieval
      |
      v
Context Assembly
      |
      v
LLM Provider
      |
      v
Streaming Response
      |
      v
Interaction Logging
```

The retrieval and generation stages use separate service layers, allowing individual components to be modified without tightly coupling the entire pipeline to a particular LLM provider.

---

## Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Backend API | FastAPI | API endpoints and backend services |
| Frontend | Next.js, React, TypeScript | User interface and chat experience |
| Vector database | Qdrant | Embedding storage and semantic retrieval |
| Relational database | PostgreSQL | Structured application data and logging |
| Embeddings | Sentence Transformers | Document and query vector generation |
| LLM integration | OpenAI, Anthropic, Google, Ollama | Query processing and response generation |
| Containers | Docker Compose | Local service orchestration |
| Streaming | Backend streaming endpoints | Incremental delivery of generated answers |

Specific versions, models, and deployment settings depend on the project's configuration.

---

## API Overview

The following endpoints expose document management and response-generation functionality.

### Document Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/upload/files` | Retrieve the list of stored documents |
| `GET` | `/upload/audit_trail` | Retrieve document ingestion audit records |

### Response Generation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/response_generation/answer` | Generate a RAG response with streaming support |
| `POST` | `/response_generation/...` | Additional response-generation functionality, depending on the implementation |

For the complete request and response schemas, consult the backend API documentation and the relevant route definitions.

---

## RAG Pipeline Details

### 1. Document Ingestion

Documents are uploaded, validated, and stored before being processed into searchable text.

The ingestion pipeline extracts document content, splits it into chunks, generates embeddings, and stores the resulting vectors in Qdrant alongside relevant metadata.

Source references use the following general format:

```text
source:chunk_index
```

This helps associate retrieved chunks with their originating documents and positions within the indexed content.

### 2. Query Rewriting

When query rewriting is enabled, the user's question is passed through a lightweight local Ollama model before retrieval.

The rewriting prompt is designed to normalize the query without answering it:

```text
Correct grammar and spelling only.
Do not answer the question.
```

When query rewriting is disabled, the original question proceeds directly to retrieval.

### 3. Semantic Retrieval

The query is converted into an embedding and used to search the Qdrant vector collection.

```text
Query
  |
  v
Query Embedding
  |
  v
Vector Similarity Search
  |
  v
Top-K Relevant Chunks
  |
  v
Context Assembly
```

The retrieved chunks and their source metadata are assembled into a context for the generation model.

Retrieval quality depends on factors such as the embedding model, chunking strategy, query formulation, and retrieval configuration.

### 4. Context-Grounded Prompt Construction

The generation stage receives the assembled context alongside the user's question.

The prompt follows this general structure:

```text
You are a helpful assistant. Use ONLY the context below to answer the question.

Context:
<retrieved chunks>

Question:
<rewritten query>

Answer:
```

This instructs the model to base its answer on the retrieved material rather than relying solely on its pretrained knowledge. Prompt instructions alone, however, do not guarantee that every response will be fully grounded or free from hallucinations.

### 5. LLM Generation and Streaming

The frontend allows the user to select an available model. The backend routes generation requests through a shared provider interface.

Conceptually, the supported provider identifiers are:

```python
provider = "openai" | "claude" | "google" | "ollama"
```

Actual provider availability is determined by the current frontend configuration, backend implementation, and required credentials.

Generated responses can be streamed to the frontend as they become available.

---

## LLM Provider Configuration

### Current Provider Availability

The current frontend configuration blocks the OpenAI, Anthropic, and Google providers. Ollama is the currently enabled option.

To re-enable the other providers:

1. Open `frontend/src/app/(protected)/chat/page.tsx` within the `doc_intelligence` project directory.
2. Locate the provider restriction in the model-selection handler.
3. Review the conditional that blocks the `claude`, `google`, and `openai` provider identifiers.
4. Remove or revise the restriction so requests can reach the intended backend provider.
5. Configure the appropriate API credentials in the backend `.env` file.
6. Verify the backend provider integrations and run the relevant frontend tests before using the providers.

The restriction is currently implemented in a block similar to:

```tsx
// Just comment out this block or you can modify it by removing providers you want to use
if (
    model_provider[model] === "claude" ||
    model_provider[model] === "google" ||
    model_provider[model] === "openai"
) {
    alert(
        `model provider ${model_provider[model]} is not currently connected try ollama model: qwen3.8:27b`
    );
    return;
}
```
**Reference:** Feel free to take a look at the frontend readme to find were model configuration is located

**Important:** Removing this frontend restriction does not automatically configure or validate the corresponding backend integrations. Ensure that the provider implementation, model identifiers, credentials, and streaming behavior are configured correctly.

For Ollama, install and run Ollama locally, pull a compatible model, and ensure the backend can reach the Ollama service. The model identifier shown in the frontend restriction is an example of the currently suggested configuration; verify that the exact model tag exists in your Ollama installation.

Keep API keys in environment variables. Do not commit `.env` files containing secrets to version control.

---

## Project Structure

The repository is organized into backend and frontend components, with separate documentation for running the services and managing local infrastructure.

```text
backend/
├── doc_intelligence/
│   ├── backend/
│   │   └── document/
│   │       ├── README.md
│   │       ├── docker.txt
│   │       └── postgres.txt
│   │
│   └── frontend/
│       └── src/
│           └── documents/
│               ├── README.md
│               ├── tailwind_guide.txt
│               └── users.json
│
└── runWindows.ps1
```

### Key Files

| File | Purpose |
|---|---|
| `backend/document/README.md` | Backend setup, dependencies, environment configuration, and startup instructions |
| `backend/document/docker.txt` | Docker commands for local infrastructure |
| `backend/document/postgres.txt` | PostgreSQL setup and operational commands |
| `frontend/src/documents/README.md` | Frontend setup, dependencies, and startup instructions |
| `frontend/src/documents/tailwind_guide.txt` | Tailwind CSS reference notes |
| `frontend/src/documents/users.json` | Sample user data, if required by the configured application |
| `runWindows.ps1` | Windows startup script for the application |

---

## Running the Application

Startup instructions are maintained alongside the relevant components to keep this overview focused on architecture and functionality.

### 1. Start Infrastructure

Use the commands documented in:

- `backend/document/docker.txt` for Docker-based services.
- `backend/document/postgres.txt` for PostgreSQL setup and operations.

Start the required infrastructure before launching the application services.

### 2. Start the Backend

Follow `backend/document/README.md` for backend dependencies, environment variables, and API startup commands.

Before starting the backend, verify that:

- PostgreSQL is available and correctly configured.
- Qdrant is running and reachable.
- Required environment variables are configured.
- The embedding model and any required model files are accessible.
- Ollama or the selected external LLM provider is available.

### 3. Start the Frontend

Follow `frontend/src/documents/README.md` for frontend dependency installation, environment configuration, and development-server commands.

Ensure that the frontend is configured to communicate with the correct backend API URL.

### 4. Start Using the Windows Launcher

The repository also includes `runWindows.ps1`, intended to simplify application startup on Windows.

Review the script and its prerequisites before running it. Use the individual component instructions if you need to troubleshoot a service or start components separately.

**Recommended startup order:** Infrastructure → Backend → Frontend.

---

## Future Improvements

Potential improvements to the current implementation include:

- [ ] API rate limiting and request throttling.
- [ ] Response caching and retrieval optimization.
- [ ] End-to-end visualization of ingestion, retrieval, and generation traces.
- [ ] Expanded observability inspired by tools such as LangSmith.
- [ ] Additional operational controls for production deployments.

---

## Project Goals

This project explores the engineering challenges involved in building a modular document intelligence system, including:

- Designing an end-to-end RAG workflow.
- Integrating vector search with relational data storage.
- Supporting multiple LLM providers through an abstraction layer.
- Delivering generated responses through streaming APIs.
- Maintaining document provenance and interaction logs.
- Separating service responsibilities to support future extension and testing.

The goal is to provide a maintainable foundation for applications that need to search, retrieve, and generate answers from private or domain-specific document collections.