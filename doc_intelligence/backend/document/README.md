# Backend

FastAPI service for authentication, document ingestion, retrieval-augmented chat, conversation history and support tickets.

## Requirements

- Python 3.13 and [uv](https://docs.astral.sh/uv/)
- Docker (PostgreSQL 16 and Qdrant)
- [Ollama](https://ollama.com) for local generation and query rewriting
- `libmagic` on Linux/macOS (`apt install libmagic1` / `brew install libmagic`); Windows uses `python-magic-bin` automatically

## Setup (backend on your machine, databases in Docker)

```bash
cp .env.example .env
docker compose up -d postgres qdrant
uv sync
uv run python main.py
```

The API is at http://localhost:8000 and the interactive docs at http://localhost:8000/docs.

Because the backend runs on your machine here, edit `.env` so the hostnames point at `localhost` instead of Docker service names:

```env
DATABASE_URL=postgresql+asyncpg://postgres:<your password>@localhost:5432/DocIntelligenceDB
QDRANT_URL=http://localhost:6333
OLLAMA_HOST=http://localhost:11434
```

Tables are created automatically at startup.

## Configuration

Settings are read from `.env` (see `.env.example`).

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | yes | JWT signing key. Generate one with `openssl rand -hex 32` |
| `ALGORITHM` | yes | JWT algorithm, `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | yes | Token lifetime in minutes |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | yes | Used by Docker Compose to create the database |
| `DATABASE_URL` | yes | Async SQLAlchemy URL (`postgresql+asyncpg://...`). Keep the password in sync with `POSTGRES_PASSWORD` |
| `QDRANT_URL` | yes | Qdrant HTTP endpoint |
| `OLLAMA_HOST` | for local LLMs | Ollama endpoint |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` | optional | Only needed if you enable those providers |

Never commit `.env`; it is git-ignored.

## Models

Models download on first use, a few GB in total:

- Embeddings: `BAAI/bge-m3` (dense) plus a fastembed sparse model
- Reranker: `BAAI/bge-reranker-base`
- Ollama: `ollama pull qwen2.5:3b` for query rewriting, and the chat model you select in the UI (default `qwen3.8:27b`)

## Create your first Admin

Registration always creates a `User`, and only an Admin can promote others, so promote the first account in the database:

```bash
docker exec -it DocIntelligenceDB_Postgres psql -U postgres -d DocIntelligenceDB \
  -c "UPDATE users SET role='Admin' WHERE username='<your username>';"
```

Log out and back in so the UI picks up the new role. Admins can upload and delete documents, list users, and change roles.

## Running everything in Docker

```bash
docker compose up -d --build
```

This also starts the `app` service on port 8000. In this mode the `.env.example` hostnames (`postgres`, `qdrant`) are correct, and the compose file sets the container's `OLLAMA_HOST` to `http://host.docker.internal:11435`, overriding the value in `.env`. If your Ollama listens on its default port 11434, change that line in `docker-compose.yml`.

Useful Docker and psql commands are in `document/docker.txt` and `document/postgres.txt`.

## API overview

Full schemas are in `/docs`. "Auth" shows what the code enforces today.

| Group | Endpoint | Auth |
|---|---|---|
| Auth | `POST /auth/register`, `POST /auth/login` | none |
| | `GET /auth/all_users`, `PUT /auth/assign_role`, `DELETE /auth/delete_user` | Admin |
| Documents | `POST /upload/documents` (PDF, DOCX, TXT; max 10 MB) | none |
| | `GET /upload/files`, `/upload/recent_files`, `/upload/audit_trail`, `/upload/files/view/{filename}` | none |
| | `DELETE /upload/delete_document` | Admin |
| Chat | `POST /response_generation/answer` (streamed `text/plain`) | none |
| | `GET /chat/conversations`, `/chat/conversation/{id}` | none |
| Tickets | `POST /contact/ticket`, `POST /contact/`, `GET /contact/open_tickets`, `/all_tickets`, `PUT /contact/update_status` | none |

`POST /response_generation/answer` takes:

```json
{
  "question": "What does the contract say about termination?",
  "username": "alex",
  "rewrite_model": "qwen2.5:3b",
  "generation_model": "qwen3.8:27b",
  "provider": "ollama",
  "id": null
}
```

Set `rewrite_model` to `null` to skip query rewriting. `id` is an existing conversation ID, or `null` to start one. The stream is the answer text, then a `Sources: ...` line, then a final JSON chunk `{"meta": {"conversation_id": "..."}}` that the frontend strips out.

## How the code is organized

```text
src/
├── app.py                  FastAPI app, CORS, router registration
├── endpoints/              Routes: user_auth, documents, response_generation, chat_history, contacts
├── models/                 SQLAlchemy tables (users, documents, deleted docs, conversations, tickets)
│   └── files/              Uploaded documents are saved here
├── schemas/                Pydantic request models, env settings, file validation
└── services/
    ├── auth/               JWT creation and the get_current_user dependency
    ├── model_dependencies/ Engine and async session
    └── rag/
        ├── extraction.py       Text extraction (pypdf / pdfminer / python-docx)
        ├── semantic_chunker.py Section- and table-aware chunking, Qdrant writes
        ├── retrieval_engine.py Hybrid search, RRF, reranking, source formatting, chat logging
        └── llm.py              Prompt builders and provider clients
```

## Tests

```bash
uv run pytest
```

The suite uses in-memory SQLite and needs no Postgres, Qdrant or Ollama. CI runs it with `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM` and `ACCESS_TOKEN_EXPIRE_MINUTES` set; locally your `.env` provides them. Tests cover auth, documents, chat history, contacts and response generation.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Connection refused on port 5432 or 6333 | Containers are not running; check `docker ps` and run `docker compose up -d postgres qdrant` |
| `could not translate host name "postgres"` | You are running on your machine but `.env` still uses Docker hostnames; switch to `localhost` (see Setup) |
| `ImportError: failed to find libmagic` | Install `libmagic` (see Requirements) |
| First upload or chat is very slow | Embedding and reranker models are downloading and loading; this happens on every request until models are loaded once at startup |
| `docker compose` cannot find `Dockerfile` on Linux/macOS | The compose file says `Dockerfile` but the file is named `dockerfile`; set `dockerfile: dockerfile` in the `app` service |
| Query rewrite or chat returns an Ollama error | Check `OLLAMA_HOST` and that the models are pulled (`ollama list`) |