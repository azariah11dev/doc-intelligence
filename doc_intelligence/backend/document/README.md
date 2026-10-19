# Backend

FastAPI service for authentication, document ingestion, retrieval-augmented
chat, conversation history, and support tickets.

Run the commands below from `doc_intelligence/backend`, the parent directory
of this README, unless a command says otherwise.

## Requirements

- Python 3.13 and [uv](https://docs.astral.sh/uv/)
- Docker Compose for PostgreSQL 16 and Qdrant
- [Ollama](https://ollama.com) for local query rewriting and answer generation
- `libmagic` on Linux/macOS (`apt install libmagic1` / `brew install libmagic`);
  Windows uses `python-magic-bin`

## Configure the environment

Copy the backend-root `.env.example` to `.env` and set a unique, strong
`SECRET_KEY` and database password. All JWT settings, `CORS_ORIGINS`,
`ENABLED_PROVIDERS`, `ENABLED_MODELS`, and rate limits are required at startup.
Provider API keys are optional unless using the corresponding provider.

```powershell
Copy-Item .env.example .env
```

Keep connection hostnames consistent with where the backend runs:

| Service | Backend runs in Docker | Backend runs on your machine |
|---|---|---|
| PostgreSQL | `postgres` | `localhost` |
| Qdrant | `qdrant` | `localhost` |
| Ollama on the host | `host.docker.internal` | `localhost` |

For Docker, the example `DATABASE_URL` and `QDRANT_URL` use the Docker service
names. If the backend runs directly on your machine, change them to:

```env
DATABASE_URL=postgresql+asyncpg://postgres:<your password>@localhost:5432/DocIntelligenceDB
QDRANT_URL=http://localhost:6333
OLLAMA_HOST=http://localhost:11434
```

When Ollama runs on the host and the backend runs in Docker, use
`OLLAMA_HOST=http://host.docker.internal:11434` (or the port Ollama listens
on). Do not use `127.0.0.1` for the host Ollama server inside the backend
container: that address refers to the container itself.

## Run the backend and services

### Everything in Docker

From this directory:

```powershell
docker compose up -d --build
```

The API listens on http://localhost:8000. OpenAPI docs are at
http://localhost:8000/docs. The database tables are created at startup. The
embedding and reranking models are also warmed at startup; the first start
downloads them if needed and can take several minutes before the API is ready.

### Backend on your machine, databases in Docker

After configuring `.env` for `localhost`:

```powershell
docker compose up -d postgres qdrant
uv sync
uv run python main.py
```

## Configuration

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | JWT signing key; use a unique random value |
| `ALGORITHM` | Yes | JWT algorithm, normally `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Yes | Token lifetime in minutes |
| `CORS_ORIGINS` | Yes | Comma-separated allowed frontend origins |
| `ENABLED_PROVIDERS` | Yes | Comma-separated generation provider allowlist |
| `ENABLED_MODELS` | Yes | Comma-separated `provider:model` allowlist; include rewrite models |
| `LOGIN_RATE_LIMIT` | Yes | SlowAPI login limit, e.g. `5/minute` |
| `REGISTER_RATE_LIMIT` | Yes | SlowAPI registration limit, e.g. `5/minute` |
| `ANSWER_RATE_LIMIT` | Yes | SlowAPI answer-generation limit, e.g. `10/minute` |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | For Docker Compose | Credentials and database name used by the Postgres service |
| `DATABASE_URL` | Yes | Async SQLAlchemy database URL |
| `QDRANT_URL` | Yes | Qdrant HTTP endpoint |
| `OLLAMA_HOST` | For Ollama | Ollama server URL |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` | Optional | Credentials for the corresponding provider adapters |

The example model allowlist enables Ollama with `qwen3.8:27b` and
`qwen2.5:3b`. Change the allowlist and pull the corresponding models in Ollama
when selecting different models. Never commit `.env`; it is git-ignored.

## Models and performance

The backend process shares cached model instances, warmed during FastAPI
startup:

- Dense embeddings: `BAAI/bge-m3`
- Reranker: `BAAI/bge-reranker-base`
- Sparse embeddings: `Qdrant/bm25`
- Text generation and optional query rewriting: Ollama models configured in
  `ENABLED_MODELS`

Retrieval and query rewriting are synchronous model/network operations, so the
async RAG flow runs them in a worker thread rather than blocking the event loop.

## Create your first Admin

Run this once against the database configured in `.env`:

```powershell
uv run python -m src.bootstrap_admin admin admin@example.com
```

The command prompts for a password and refuses to create an Admin if one
already exists. To run it in the Docker app container instead:

```powershell
docker compose exec app uv run python -m src.bootstrap_admin admin admin@example.com
```

Public registration creates regular User accounts. Admins can review tickets,
delete documents, list users, and change roles.

## API and authorization

All data routes require a bearer token except `POST /auth/register`,
`POST /auth/login`, and the public contact form `POST /contact/`. Ticket review,
user management, and document deletion require an Admin role.

| Group | Endpoint | Access |
|---|---|---|
| Authentication | `POST /auth/register`, `POST /auth/login` | Public |
| User management | `GET /auth/all_users`, `PUT /auth/assign_role`, `DELETE /auth/delete_user` | Admin |
| Documents | `POST /upload/documents` (PDF, DOCX, TXT; max 10 MB), `GET /upload/files`, `/upload/recent_files`, `/upload/audit_trail`, `/upload/files/view/{filename}` | Authenticated |
| Documents | `DELETE /upload/delete_document` | Admin |
| Answers | `POST /response_generation/answer` | Authenticated |
| Chat history | `GET /chat/conversations`, `/chat/conversation/{id}` | Authenticated; users see their own, Admin can read any |
| Ticket submission | `POST /contact/ticket` | Authenticated; username and email come from the token |
| Ticket review | `GET /contact/open_tickets`, `/contact/all_tickets`, `PUT /contact/update_status`, `GET /contact/tickets/files/{filename}` | Admin |
| Public contact | `POST /contact/` | Public |

`POST /response_generation/answer` accepts a question, optional rewrite model,
generation model, provider, and optional conversation ID:

```json
{
  "question": "What does the contract say about termination?",
  "rewrite_model": "qwen2.5:3b",
  "generation_model": "qwen3.8:27b",
  "provider": "ollama",
  "id": null
}
```

Questions are limited to 2,000 characters. Set `rewrite_model` to `null` to
skip rewriting. The provider and `provider:model` pair must be enabled in the
backend allowlists. The answer is streamed as plain text with file-level
sources and conversation metadata.

The interactive API schema is available at `/docs`.

## Tests

From this directory:

```powershell
uv sync
uv run pytest
```

Tests use an in-memory SQLite database and do not need running Postgres,
Qdrant, or Ollama. They do need the required settings; CI supplies these via
the workflow environment. The suite covers authentication and authorization,
documents, conversation history, tickets, response generation, and the model
registry.

## Logs

Endpoint errors logged through the application error logger are written to
`src/models/error_logs/errors.log`. This local log is git-ignored. Unhandled
application errors are also emitted to the server logs; for Docker, view them
with:

```powershell
docker compose logs -f app
```

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Settings validation fails at startup | Check that all required variables listed above are set in `.env` or the process environment |
| Connection refused on port 5432 or 6333 | Start Postgres and Qdrant with `docker compose up -d postgres qdrant` |
| Could not translate host name `postgres` or `qdrant` | The backend is running on your machine; use `localhost` in `.env` |
| Ollama connection refused in Docker | Set `OLLAMA_HOST` to `http://host.docker.internal:<Ollama port>`, not `127.0.0.1`; verify Ollama is listening on that port |
| API is not ready after starting the container | Check `docker compose logs -f app`; model downloads and warmup occur before startup completes |
| `ImportError: failed to find libmagic` | Install `libmagic` (Linux/macOS) or ensure the Windows environment installed `python-magic-bin` |
