# Frontend

Next.js 16, React 19, TypeScript, and Tailwind application for document
question-answering, document management, and support tickets.

## Requirements

- Node.js 20+ and npm
- The backend API running at the URL configured by `NEXT_PUBLIC_API_URL`
  (see the [backend guide](../../../backend/document/README.md))

## Setup

Run these commands from `doc_intelligence/frontend`, the frontend project root
(the parent of `src/documents`):

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. The checked-in `.env.example` points to
`http://localhost:8000`. If the backend is deployed elsewhere, set
`NEXT_PUBLIC_API_URL` in `.env.local` to its base URL and configure the
backend's `CORS_ORIGINS` to include the frontend origin.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |
| `npm test -- --runInBand` | Run Jest unit tests |
| `npm run test:e2e` | Run Playwright browser tests |

Jest tests are in `__tests__/`; Playwright specs are in `tests/`.

## Routes

| Group | Routes |
|---|---|
| Public | `/`, `/about`, `/features`, `/contacts`, `/demo`, `/login`, `/signup` |
| Authenticated application | `/dashboard`, `/documents`, `/chat`, `/chat_history`, `/ticket`, `/submitted_tickets`, `/view_all`, `/user-roles` |

The backend enforces authorization. Ticket-review, user-management, and
document-deletion actions require an Admin account; hiding or showing a UI
control is not the security boundary.

## API authentication

API calls use the shared helper in `src/lib/api.ts`. It builds URLs from
`NEXT_PUBLIC_API_URL`, attaches the bearer token stored as `access_token`, and
clears local storage and redirects to `/login` when the API returns 401.
Protected file previews and ticket attachments are fetched with the token and
opened as blob URLs, rather than navigating directly to a URL that cannot
carry the Authorization header.

Login stores the access token and display information (`username`, `role`, and
`email`) in local storage. Conversation IDs are stored there to resume chat
history; logout clears the stored session data.

## Chat models

The model selector and provider mapping are in
`src/app/(protected)/comps/model_provider.json`. Ollama is the provider
currently connected in the chat UI. The default chat model is
`qwen3.8:27b`; accuracy mode optionally rewrites the question with
`qwen2.5:3b`. Both models must be available in Ollama and allowed by the
backend's `ENABLED_MODELS` setting. Other providers are listed in the selector
but the UI currently displays an unavailable-provider notice rather than
sending those requests.

## Tests

Jest uses React Testing Library and mocked API responses:

```powershell
npm test -- --runInBand
npx jest --runInBand --runTestsByPath __tests__/protected/Chat.test.tsx
```

Playwright starts the Next.js development server automatically. The shared
authenticated fixture supplies a test token and intercepts API requests, so
the browser suite does not require a running backend:

```powershell
npx playwright install
npm run test:e2e
npx playwright test --ui
npx playwright show-report
```

CI runs Jest and Playwright on pushes and pull requests; see
[`../../../../.github/workflows/ci.yml`](../../../../.github/workflows/ci.yml).

## Project structure

```text
frontend/
├── src/app/
│   ├── (public)/          Landing, authentication, about, features, contact, demo
│   └── (protected)/       Dashboard, documents, chat, history, tickets, user roles
├── src/lib/api.ts         API URL, bearer authentication, 401 handling, file previews
├── __tests__/             Jest tests
├── tests/                 Playwright specs and fixtures
└── public/                Static images and other public assets
```
