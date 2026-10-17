# Backend Run Instructions

## Prerequisites

- Python 3.13
- PostgreSQL
- Docker
- UV package manager

---

## 1. Clone Repository

```bash
git clone <repository-url>
cd doc_intelligence
cd backend
```

---

## 2. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

Update values as needed:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=DocIntelligenceDB

JWT_SECRET_KEY=your_secret_key

OLLAMA_HOST=http://host.docker.internal:11435
```
ollama default is internal:11435 but if port is taken you'll have to create your own in environment variables

---

## 3. Install Dependencies

Using UV:

```bash
uv sync
```

Activate virtual environment:

### Windows

```bash
.venv\Scripts\activate
```

### Linux / macOS

```bash
source .venv/bin/activate
```

---

## 4. Build Images

Using Docker:

```bash
docker docker compose up --build
```

Verify database is running:

```bash
docker ps
```

--

## 5. Start Docker

Using Docker:

```bash
docker compose up
```

Verify database is running:

```bash
docker ps
```

---

## 6. Run Backend

From project root:
```bash
uv run main.py
```
or

```bash
uvicorn src.app:app --reload
```

Server will be available at:

```text
http://localhost:8000
```

---

## 7. API Documentation

Swagger UI:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

---

# Running Tests

Run all tests:

```bash
uv run pytest
```

Run with verbose output:

```bash
uv run pytest -v
```

Run a specific test file:

```bash
uv run pytest tests/test_documents.py
```

---


# Project Structure

```text
backend/
├── .dockerignore
├── .env.example
├── .python-version
├── docker-compose.yml
├── dockerfile
├── document/
│   ├── docker.txt
│   ├── postgres.txt
│   └── README.md
├── main.py
├── pyproject.toml
├── src/
│   ├── __init__.py
│   ├── app.py
│   ├── endpoints/
│   │   ├── __init__.py
│   │   ├── chat_history.py
│   │   ├── contacts.py
│   │   ├── documents.py
│   │   ├── response_generation.py
│   │   └── user_auth.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── contactsdb.py
│   │   ├── deldocdb.py
│   │   ├── documentdb.py
│   │   ├── files/
│   │   │   └── __init__.py
│   │   ├── qdrant_control.ipynb
│   │   ├── ticketdb.py
│   │   ├── user_querydb.py
│   │   └── usersdb.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth_schema.py
│   │   ├── contacts_schema.py
│   │   ├── document_schema.py
│   │   ├── env_schema.py
│   │   ├── file_magic_schema.py
│   │   └── response_gen.py
│   └── services/
│       ├── __init__.py
│       ├── auth/
│       │   ├── __init__.py
│       │   ├── jwt_dependency.py
│       │   └── jwt_handler.py
│       ├── model_dependencies/
│       │   ├── __init__.py
│       │   ├── database.py
│       │   └── session_maker.py
│       └── rag/
│           ├── __init__.py
│           ├── extraction.py
│           ├── llm.py
│           ├── retrieval_engine.py
│           └── semantic_chunker.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_chat_history.py
│   ├── test_contacts.py
│   ├── test_documents.py
│   ├── test_response_generation.py
│   └── test_user_auth.py
└── uv.lock
```

---

# Troubleshooting

## PostgreSQL Connection Error

Verify:

```bash
docker ps
```

and confirm PostgreSQL container is running.

---

## Qdrant Connection Error

Verify:

```bash
docker ps
```

and ensure Qdrant is reachable at:

```text
http://localhost:6333
```

---

## Missing Dependencies

Reinstall dependencies:

```bash
uv sync
```

---

## Test Failures

Clear pytest cache:

```bash
uv run pytest --cache-clear
```

Run tests again:

```bash
uv run pytest -v
```