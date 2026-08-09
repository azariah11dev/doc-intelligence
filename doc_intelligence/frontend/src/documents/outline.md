# RAG Document Intelligence Assistant — Build Outline

## 0. Project Objective

Build a production-minded, full-stack RAG application that allows users to:

- Upload private business documents.
- Process and index those documents.
- Ask natural-language questions about the knowledge base.
- Receive answers grounded in retrieved source material.
- See the documents/pages/chunks supporting each answer.
- Maintain conversation history.
- Refuse or qualify answers when sufficient evidence is unavailable.
- Evaluate retrieval and answer quality using a reproducible test set.

This is a portfolio/reference implementation, not a production healthcare or enterprise deployment.

Primary goal:

> Demonstrate that I understand how to build a reliable RAG system rather than simply connect an LLM to a vector database.

---

# 1. Core Technology Stack

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy or SQLModel
- Pytest
- HTTP client for external APIs

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

## Database

- PostgreSQL
- pgvector

## AI

- OpenAI API
- Embedding model
- LLM
- Optional local embedding/model experimentation

## Infrastructure

- Docker
- Docker Compose
- Environment-based configuration

## Document Processing

Initial supported formats:

- PDF
- DOCX
- TXT

Do not expand the format list until the core pipeline is stable.

---

# 2. High-Level Architecture

The system should conceptually follow:

Documents
    ↓
Upload
    ↓
Validation
    ↓
Text Extraction
    ↓
Normalization
    ↓
Chunking
    ↓
Metadata Generation
    ↓
Embedding Generation
    ↓
PostgreSQL + pgvector
    ↓
User Question
    ↓
Query Processing
    ↓
Vector Retrieval
    ↓
Relevance Filtering / Reranking
    ↓
Context Construction
    ↓
LLM
    ↓
Grounded Answer
    ↓
Citations + Sources
    ↓
User

Supporting systems:

- Authentication
- Conversation history
- Document management
- Evaluation
- Logging
- Error handling
- Testing
- Configuration

---

# 3. Application Requirements

## 3.1 Authentication

Implement basic authentication.

Required capabilities:

- User registration
- User login
- Password hashing
- Token/session handling
- Protected API routes
- Protected frontend routes
- Logout
- Basic user identity

Do not build enterprise SSO or complex RBAC for V1.

---

# 4. Document Management

## 4.1 Document Upload

Users should be able to:

- Upload documents.
- See upload progress/status.
- View uploaded documents.
- Delete documents.
- See processing status.

Supported:

- PDF
- DOCX
- TXT

Validate:

- File type
- File size
- Empty files
- Corrupt files

---

## 4.2 Document Lifecycle

Documents should have explicit states.

Example:

- UPLOADED
- PROCESSING
- READY
- FAILED

Store:

- Filename
- File type
- File size
- Upload timestamp
- Processing timestamp
- Status
- Error information where applicable

---

## 4.3 Document Processing

Pipeline:

1. Receive document.
2. Validate document.
3. Store document metadata.
4. Extract text.
5. Preserve source information.
6. Normalize extracted text.
7. Split into logical sections where possible.
8. Generate chunks.
9. Generate embeddings.
10. Store chunks and embeddings.
11. Mark document READY.

Failure at any stage should produce a meaningful failure state rather than silently succeeding.

---

# 5. Text Extraction

## PDF

Extract:

- Text
- Page number
- Document metadata where useful

Preserve enough information to later cite:

> Document name + page + relevant passage

Handle:

- Empty pages
- Poorly formatted PDFs
- Multi-page content
- Extraction failures

OCR is optional for V1.

If OCR is added, treat it as a separate processing path.

---

## DOCX

Extract:

- Paragraphs
- Headings where possible
- Tables if practical

Preserve section information.

---

## TXT

Read raw text while preserving meaningful structure.

---

# 6. Text Normalization

Before chunking:

- Remove unnecessary whitespace.
- Normalize line breaks.
- Remove obvious extraction artifacts.
- Preserve headings.
- Preserve page boundaries.
- Preserve useful document structure.
- Avoid destroying meaningful formatting.

The goal is not to aggressively clean everything.

The goal is to make the text retrieval-friendly while preserving source context.

---

# 7. Chunking System

Implement a deliberate chunking strategy.

Do not simply split every document into arbitrary character counts.

Consider:

- Paragraph boundaries
- Headings
- Sections
- Page boundaries
- Target chunk size
- Chunk overlap
- Metadata preservation

Each chunk should contain enough information to stand alone when possible.

Each chunk should retain metadata such as:

- Document ID
- Document filename
- Chunk ID
- Chunk index
- Page number
- Section
- Source location
- Character/token count
- Any useful document metadata

---

# 8. Embedding Generation

Implement an embedding service abstraction.

Responsibilities:

- Accept text.
- Generate embeddings.
- Handle API errors.
- Handle retries where appropriate.
- Avoid unnecessary duplicate embedding calls.
- Return a predictable embedding format.

The embedding provider should be replaceable.

Do not tightly couple the entire application to one embedding provider.

---

# 9. Vector Storage

Use:

- PostgreSQL
- pgvector

Store:

- Chunk text
- Chunk metadata
- Embedding vector
- Document relationship

The database should support semantic similarity search.

Design the retrieval layer so a dedicated vector database could be introduced later without rewriting the entire application.

---

# 10. Retrieval Pipeline

The retrieval pipeline should be explicit and independently testable.

Basic flow:

Question
    ↓
Query preprocessing
    ↓
Query embedding
    ↓
Vector similarity search
    ↓
Top-K candidates
    ↓
Relevance filtering / reranking
    ↓
Final context

---

## 10.1 Query Processing

Consider:

- Conversation context
- Query normalization
- Follow-up questions
- Ambiguous queries

Do not over-engineer query rewriting initially.

---

## 10.2 Vector Search

Implement:

- Similarity search
- Configurable Top-K
- Minimum relevance threshold
- Metadata filtering where useful

Example:

Retrieve 10–20 candidates.

Then reduce to the most relevant context.

---

## 10.3 Relevance Filtering / Reranking

The system should not blindly pass every retrieved chunk to the LLM.

Possible approaches:

- Similarity threshold
- Cross-encoder reranker
- LLM-based relevance evaluation
- Combination of retrieval score and metadata

Start simple.

Add complexity only if evaluation demonstrates that retrieval needs improvement.

---

# 11. Context Construction

Build the final context supplied to the LLM.

Each context item should contain:

- Source document
- Page
- Section
- Chunk text
- Retrieval score if useful

Avoid unnecessary context.

The goal is:

> Maximum useful evidence with minimum irrelevant information.

---

# 12. LLM Generation

Implement an LLM service abstraction.

Responsibilities:

- Construct prompts.
- Supply retrieved context.
- Include conversation context where appropriate.
- Generate answer.
- Handle API failures.
- Handle rate limits.
- Support configurable model settings.

The LLM should not be responsible for retrieving information itself.

Keep retrieval and generation logically separate.

---

# 13. Grounding / Anti-Hallucination Strategy

This is a major project requirement.

The model should be instructed to:

- Answer using supplied context.
- Avoid unsupported claims.
- Distinguish evidence from inference.
- State when information is unavailable.
- Cite supporting sources.
- Avoid pretending to know information outside the knowledge base.

Important:

Do not rely solely on the system prompt.

The application should also enforce evidence thresholds.

---

# 14. Unknown / Unsupported Questions

Implement explicit handling for questions that cannot be answered.

Flow:

Question
    ↓
Retrieve evidence
    ↓
Is sufficient evidence available?
    ├── YES → Generate grounded answer
    └── NO  → Refuse / state insufficient evidence

Example response:

> I couldn't find enough information in the provided documents to answer that reliably.

This behavior should be tested.

---

# 15. Citations and Sources

Every grounded answer should expose supporting sources where applicable.

A citation should ideally contain:

- Document name
- Page number
- Section
- Relevant passage
- Source/chunk identifier

Example:

Employee Handbook.pdf
Page 14
PTO Policy

The UI should allow the user to inspect the source context.

The citation should map back through:

Answer
    ↓
Message
    ↓
Source
    ↓
Chunk
    ↓
Document

---

# 16. Conversation System

Implement:

- Create conversation
- Rename conversation
- List conversations
- Retrieve conversation
- Delete conversation
- Send message
- Store assistant response
- Store sources used for response

Conversation history should support follow-up questions.

Example:

User:
> How much PTO do employees receive?

Assistant:
> Employees receive 15 days...

User:
> What about after two years?

The system should understand the follow-up while grounding the answer in the knowledge base.

---

# 17. Chat Interface

Frontend should include:

## Main Chat

- Message history
- User messages
- Assistant messages
- Loading state
- Error state
- Streaming response if implemented
- Source/citation display
- Input box
- Submit action

## Conversation Sidebar

- Conversation list
- New conversation
- Rename
- Delete
- Active conversation

## Sources

Show:

- Source document
- Page
- Section
- Relevant excerpt

---

# 18. Document Management Interface

Frontend should allow:

- Upload document
- View documents
- See processing status
- See document metadata
- Delete document
- Identify failed processing
- Retry processing if appropriate

Example statuses:

- Processing
- Ready
- Failed

---

# 19. Basic Admin / Management Interface

Keep this intentionally simple.

Useful capabilities:

- View documents
- View processing status
- Delete documents
- View basic system statistics
- Inspect failed processing jobs
- Trigger reprocessing

Do not build a complex enterprise administration system.

---

# 20. API Design

The FastAPI backend should expose clean REST endpoints.

Suggested categories:

## Authentication

- POST /auth/register
- POST /auth/login
- POST /auth/logout
- GET /auth/me

## Documents

- POST /documents
- GET /documents
- GET /documents/{id}
- DELETE /documents/{id}
- POST /documents/{id}/reprocess

## Conversations

- POST /conversations
- GET /conversations
- GET /conversations/{id}
- PATCH /conversations/{id}
- DELETE /conversations/{id}

## Messages

- POST /conversations/{id}/messages
- GET /messages/{id}
- GET /messages/{id}/sources

## Health

- GET /health

Exact route naming can be adjusted during implementation.

---

# 21. Database Design

Minimum conceptual entities:

## Users

- ID
- Email
- Password hash
- Created timestamp

## Documents

- ID
- User ID
- Filename
- File type
- File size
- Status
- Created timestamp
- Updated timestamp
- Error information

## Document Chunks

- ID
- Document ID
- Chunk index
- Content
- Embedding
- Page number
- Section
- Metadata

## Conversations

- ID
- User ID
- Title
- Created timestamp
- Updated timestamp

## Messages

- ID
- Conversation ID
- Role
- Content
- Created timestamp

## Message Sources

- ID
- Message ID
- Chunk ID
- Retrieval score
- Citation metadata

Use foreign keys and appropriate indexes.

---

# 22. Error Handling

Handle errors explicitly.

Examples:

- Invalid document
- Unsupported file
- Extraction failure
- Embedding API failure
- LLM API failure
- Database failure
- Vector search failure
- Authentication failure
- Rate limiting
- Empty knowledge base
- No relevant retrieval results

Errors should:

- Be logged.
- Return useful API responses.
- Avoid leaking secrets.
- Avoid exposing internal stack traces to users.

---

# 23. Configuration

Use environment variables for:

- LLM API key
- Embedding configuration
- Database URL
- Authentication secret
- Application environment
- Model names
- Retrieval settings
- Chunking settings
- Top-K
- Relevance threshold

Provide a safe example environment file.

Never commit secrets.

---

# 24. Logging

Implement structured/logical application logging for:

- Document processing
- Processing failures
- Retrieval
- LLM calls
- API errors
- Authentication events
- Evaluation runs

Do not log sensitive document contents unnecessarily.

---

# 25. Testing

Use Pytest.

## Unit Tests

Test:

- Text normalization
- Chunking
- Metadata generation
- Embedding service behavior
- Retrieval logic
- Context construction
- Prompt construction
- Unknown-answer logic
- Citation mapping

## Integration Tests

Test:

- Document upload
- Processing
- Database persistence
- Retrieval
- Chat request
- Source persistence

## End-to-End Test

Test:

Upload document
    ↓
Process document
    ↓
Ask question
    ↓
Retrieve context
    ↓
Generate answer
    ↓
Verify citation

---

# 26. RAG Evaluation Framework

This is a key differentiator.

Create a reproducible evaluation dataset.

Each evaluation case should contain:

- Question
- Expected answer
- Expected source document
- Expected relevant chunk(s)
- Question type
- Whether an answer should exist

Example question categories:

1. Direct factual question
2. Multi-step question
3. Follow-up question
4. Question requiring multiple documents
5. Ambiguous question
6. Unsupported question
7. Similar-but-incorrect information
8. Edge case

---

# 27. Retrieval Evaluation

Measure whether retrieval finds the required evidence.

Potential metrics:

- Hit@K
- Recall@K
- Precision@K
- MRR where appropriate

Start with a small understandable metric set.

Example:

> Did the expected source appear in the top 5 retrieved chunks?

---

# 28. Answer Evaluation

Evaluate:

- Correctness
- Groundedness
- Completeness
- Unsupported claims

Do not claim perfect objective evaluation.

Use a combination of:

- Deterministic checks where possible
- Reference answers
- LLM-as-judge where appropriate
- Manual review for the final portfolio dataset

---

# 29. Citation Evaluation

Test:

- Was a citation provided?
- Does the citation point to a retrieved chunk?
- Does the cited chunk actually support the answer?
- Is the document/page information correct?

---

# 30. Unknown Question Evaluation

Include questions where the answer does not exist.

Measure:

> How often does the system correctly refuse rather than hallucinate?

This is one of the most important tests in the project.

---

# 31. Evaluation Report

Create a reproducible evaluation command/script.

Example output:

RAG Evaluation
--------------

Total Cases: 50

Retrieval Hit@5: XX%
Answer Accuracy: XX%
Citation Accuracy: XX%
Unsupported Question Refusal: XX%

Failures:
- Case 07
- Case 19
- Case 34

The numbers must come from actual tests.

Do not manufacture performance statistics.

---

# 32. Retrieval Improvement Experiments

Document experiments rather than simply implementing one approach.

Possible comparisons:

## Experiment A

Basic vector search

## Experiment B

Different chunk sizes

## Experiment C

Different overlap

## Experiment D

Higher/lower Top-K

## Experiment E

Similarity threshold

## Experiment F

Reranking

Compare results using the evaluation dataset.

Goal:

> Demonstrate that retrieval decisions are based on measurement rather than intuition.

---

# 33. Performance / Cost Considerations

Track or discuss:

- Embedding cost
- LLM cost
- Number of retrieved chunks
- Prompt size
- Response latency
- Document processing time

Avoid unnecessary LLM calls.

Cache or reuse embeddings where appropriate.

Do not optimize prematurely.

---

# 34. Security Basics

Implement reasonable application-level protections.

Consider:

- Password hashing
- Authentication
- Authorization
- Input validation
- File type validation
- File size limits
- API key protection
- SQL injection prevention through ORM/query parameters
- Prompt injection awareness
- Sensitive data handling
- Secure environment variables

For document-grounded systems, explicitly consider:

> A document can contain instructions intended to manipulate the model.

Treat retrieved document text as data, not trusted instructions.

---

# 35. Prompt Injection Awareness

Include a basic defensive strategy.

The system should distinguish:

- System instructions
- User question
- Retrieved document content

Retrieved documents should not be allowed to override system behavior.

Create at least one test document containing malicious/instruction-like text and evaluate the system's behavior.

This is a valuable portfolio demonstration.

---

# 36. Docker

Create a reproducible local environment.

Conceptually:

Application
    ↓
Docker Compose
    ├── Next.js
    ├── FastAPI
    └── PostgreSQL + pgvector

The project should be startable with a simple documented command.

---

# 37. API Documentation

Use FastAPI's generated documentation.

Ensure endpoints have:

- Descriptions
- Request models
- Response models
- Error responses
- Authentication requirements

The API should be understandable without reading the implementation.

---

# 38. README

The README should include:

## Project Overview

What problem does it solve?

## Why RAG?

Why not simply send entire documents to an LLM?

## Architecture

Include architecture diagram.

## Features

List actual implemented features.

## RAG Pipeline

Explain:

Documents
→ Processing
→ Chunking
→ Embeddings
→ Vector Search
→ Retrieval
→ Context
→ LLM
→ Answer + Sources

## Evaluation

Show actual results.

## Technical Decisions

Explain:

- Why FastAPI
- Why PostgreSQL + pgvector
- Why chosen LLM
- Why chosen embedding model
- Why chosen chunking strategy
- Why chosen retrieval strategy

## Running Locally

Clear setup instructions.

## Limitations

Be honest.

## Future Improvements

Separate future work from implemented functionality.

---

# 39. Architecture Diagram

Create at least one polished diagram showing:

User
    ↓
Next.js
    ↓
FastAPI
    ├── Authentication
    ├── Document API
    ├── Chat API
    └── Evaluation
          ↓
    RAG Pipeline
          ├── Retrieval
          ├── Context Builder
          └── LLM
          ↓
    PostgreSQL + pgvector

Document ingestion should also be shown.

Use the same architecture diagram in:

- README
- Portfolio
- YouTube
- LinkedIn carousel
- Proposal

---

# 40. Demo Dataset

Create a realistic fictional business knowledge base.

Do not use sensitive real-world documents.

Possible domain:

- Employee handbook
- Benefits guide
- PTO policy
- Safety procedures
- Remote work policy
- Expense policy
- Onboarding guide

This makes the demo immediately understandable.

---

# 41. Demo Scenarios

The final demo should deliberately include:

## Scenario 1 — Correct Answer

Ask a question clearly answered by the documents.

Show:

- Answer
- Citation
- Source passage

## Scenario 2 — Follow-Up

Ask a related follow-up question.

Show conversation context.

## Scenario 3 — Multi-document Question

Require information from more than one source.

## Scenario 4 — Unsupported Question

Ask something not present.

Show refusal.

## Scenario 5 — Similar Information

Ask something where the knowledge base contains related but different information.

Demonstrate that the system does not blindly infer.

## Scenario 6 — Prompt Injection

Ask a malicious document to instruct the model to ignore system rules.

Demonstrate defensive behavior.

---

# 42. YouTube Walkthrough

Target length:

8–15 minutes.

Structure:

1. Problem
2. Why basic RAG isn't enough
3. Finished demo
4. Architecture
5. Document ingestion
6. Chunking
7. Embeddings
8. Retrieval
9. Relevance filtering
10. LLM generation
11. Citations
12. Unknown-question handling
13. Evaluation
14. Prompt injection test
15. Results
16. Lessons learned

Main story:

> I didn't want to build another chatbot. I wanted to build a system where users can trust where the answer came from.

---

# 43. Short-Form Content

Create several independent clips.

## Short 1

"I deliberately asked my AI something it didn't know."

Show refusal.

## Short 2

"An AI answer is much more useful when it can prove where it came from."

Show citation.

## Short 3

"Why retrieving more documents can make RAG worse."

Show retrieval comparison.

## Short 4

"I tested my RAG system instead of trusting the demo."

Show evaluation.

## Short 5

"I built an AI that answers questions from private business documents."

Show transformation:

Documents → Question → Answer + Source

Shorts should focus on transformations and problems, not code tutorials.

---

# 44. LinkedIn Case Study

Use the project as a business/engineering case study.

Possible structure:

1. Problem
2. Why basic chatbot approaches fail
3. Architecture
4. Retrieval strategy
5. Hallucination handling
6. Evaluation
7. Results
8. Lessons

Focus on:

- Accuracy
- Trust
- Traceability
- Business usefulness

Avoid excessive implementation detail.

---

# 45. LinkedIn Carousel

Suggested slides:

1. I built a RAG assistant that knows when it doesn't know.
2. The business problem.
3. Why normal LLM chat isn't enough.
4. Document ingestion pipeline.
5. How retrieval works.
6. How citations work.
7. How unsupported questions are handled.
8. How I evaluated the system.
9. What I learned.
10. GitHub / demo / video.

---

# 46. X Thread

Possible structure:

1. "I built a document-grounded RAG system. Here's what actually mattered."
2. Problem
3. Architecture
4. Chunking decision
5. Retrieval strategy
6. Hallucination handling
7. Citations
8. Evaluation
9. Failure discovered
10. Demo/GitHub

---

# 47. Reddit Showcase

Do not frame it as:

> Look at my AI chatbot.

Frame it as an engineering discussion.

Example angle:

> "I built a RAG system and tested different retrieval strategies instead of assuming vector search was enough. Here's what changed and what didn't."

Include:

- Architecture
- Evaluation methodology
- Interesting failure
- Tradeoffs
- Request for technical feedback

---

# 48. Dev.to Article

Technical title:

> Building a Reliable RAG Pipeline with FastAPI and PostgreSQL

Focus on:

- Architecture
- Retrieval
- Chunking
- Evaluation
- Failure handling

Include code selectively.

---

# 49. Portfolio Case Study

Business-oriented title:

> Document Intelligence Assistant

Sections:

- Problem
- Solution
- Key Features
- Architecture
- Reliability Approach
- Evaluation
- Demo
- Technologies
- Lessons

The portfolio should make the project understandable within 60 seconds.

---

# 50. Upwork Proof Asset

The project should eventually support a proposal statement like:

> I recently built a document-grounded RAG application using Python/FastAPI and PostgreSQL with pgvector. It supports document ingestion, semantic retrieval, citations, conversation history, explicit handling of unsupported questions, and a reproducible evaluation suite for retrieval and answer quality.

Attach:

- GitHub
- YouTube
- Portfolio

Do not claim commercial production experience if this is a portfolio project.

---

# 51. Definition of Done

The project is finished when:

## Application

- [ ] User can register/login.
- [ ] User can upload documents.
- [ ] PDF/DOCX/TXT processing works.
- [ ] Documents are chunked with metadata.
- [ ] Embeddings are generated.
- [ ] Embeddings are stored in pgvector.
- [ ] Questions can be submitted.
- [ ] Relevant chunks are retrieved.
- [ ] Context is passed to the LLM.
- [ ] Answers are generated.
- [ ] Answers include citations.
- [ ] Unsupported questions are handled safely.
- [ ] Conversation history works.
- [ ] Documents can be managed.
- [ ] Basic admin/management functionality exists.

## Engineering

- [ ] API is documented.
- [ ] Configuration is environment-based.
- [ ] Errors are handled.
- [ ] Logging exists.
- [ ] Unit tests exist.
- [ ] Integration tests exist.
- [ ] Docker Compose works.
- [ ] README is complete.

## RAG Quality

- [ ] Evaluation dataset exists.
- [ ] Retrieval metrics are calculated.
- [ ] Answer quality is evaluated.
- [ ] Citation accuracy is evaluated.
- [ ] Unsupported questions are tested.
- [ ] Retrieval experiments are documented.
- [ ] Prompt injection behavior is tested.
- [ ] Actual results are reported.

## Content

- [ ] Architecture diagram completed.
- [ ] YouTube walkthrough recorded.
- [ ] 3–5 short-form videos created.
- [ ] LinkedIn case study created.
- [ ] LinkedIn carousel created.
- [ ] X thread created.
- [ ] Reddit showcase prepared.
- [ ] Dev.to article created.
- [ ] Portfolio page updated.
- [ ] Upwork proof links updated.

---

# 52. Scope Control Rules

This project exists to create:

1. Technical proof
2. Client acquisition assets
3. Content
4. RAG experience

Do not turn it into a startup.

Do not add features simply because they are technically interesting.

Before adding a feature, ask:

> Does this make the RAG system more reliable, demonstrate an important engineering skill, improve the demo, or create a useful sales asset?

If the answer is no:

**Don't build it.**

---

# 53. Priority Order

Build in this order:

### Phase 1 — Working RAG

- Document ingestion
- Chunking
- Embeddings
- pgvector
- Retrieval
- LLM
- Basic answer

### Phase 2 — Trust

- Citations
- Relevance threshold
- Unknown-question handling
- Source inspection

### Phase 3 — Application

- Authentication
- Chat history
- Document management
- Frontend polish

### Phase 4 — Engineering Quality

- Tests
- Error handling
- Logging
- Docker
- API documentation

### Phase 5 — Evaluation

- Evaluation dataset
- Retrieval metrics
- Answer evaluation
- Citation evaluation
- Unsupported question testing
- Retrieval experiments
- Prompt injection testing

### Phase 6 — Presentation

- README
- Architecture diagram
- Portfolio page
- YouTube walkthrough
- Short-form content
- LinkedIn
- X
- Reddit
- Dev.to

### Phase 7 — Sales

Return to Upwork.

Prioritize jobs where:

- RAG is explicitly requested.
- FastAPI/Python is requested.
- Document intelligence is involved.
- Accuracy/citations are important.
- The client has a concrete business use case.
- The portfolio project directly matches the job.

---

# 54. Final Strategic Objective

The finished project should communicate one message:

> **I don't just connect an LLM to a vector database. I understand how to build, test, evaluate, and explain a RAG system that businesses can actually trust.**

That is the skill this project is designed to demonstrate.
