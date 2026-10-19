# Frontend

Next.js 16 / React 19 / TypeScript / Tailwind app for chatting with your documents, managing uploads, and handling support tickets.

## Requirements

- Node 20+ and npm
- The backend running on http://localhost:8000 (see [backend/README.md](../backend/README.md))

## Setup

```bash
npm ci
npm run dev        # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Jest unit tests (`__tests__/`) |
| `npm run test:e2e` | Playwright end-to-end tests (`tests/`) |

`eslint.config.mjs` exists, but there is no `lint` script yet. Add `"lint": "eslint"` to `package.json` if you want one.

## Configuration

Set `NEXT_PUBLIC_API_URL` in `.env.local` (see `.env.example`) to point the
frontend at your backend. API calls use a shared helper that attaches the bearer
token and redirects to `/login` on unauthorized responses. Protected file
previews are fetched with the token and opened as blob URLs.

Set `CORS_ORIGINS` in the backend environment to the comma-separated frontend
origins you deploy from.

## Routes

| Group | Routes |
|---|---|
| Public (`src/app/(public)`) | `/`, `/about`, `/features`, `/contacts`, `/demo`, `/login`, `/signup` |
| Protected (`src/app/(protected)`) | `/dashboard`, `/documents`, `/chat`, `/chat_history`, `/ticket`, `/submitted_tickets`, `/view_all`, `/user-roles` |

Admin-only pages such as `/user-roles` rely on the role the backend returns at login. Real enforcement is on the backend.

## Auth

Login stores `access_token`, `username`, `role` and `email` in `localStorage`; the sidebar's logout clears them. Chat also uses `conversation_id` and `open_conversation_id` to resume conversations from history.

## Changing the chat models

- **Model list and provider mapping:** `src/app/(protected)/comps/model_provider.json` (`"model name": "ollama" | "openai" | "claude" | "google"`).
- **Default model and rewrite model:** `useState("qwen3.8:27b")` and `REWRITE_MODEL = "qwen2.5:3b"` at the top of `chat/page.tsx`. "Accuracy mode" turns query rewriting on or off.
- **Enabling OpenAI / Anthropic / Gemini:** the `chat/page.tsx` handler currently shows an alert and returns for those providers. Remove that block and set the matching API key in the backend `.env`. The non-Ollama backend adapters have not been verified end to end.

## Tests

**Jest + React Testing Library** (`__tests__/`): component and page tests with mocked `fetch` and `localStorage`. Config is `jest.config.cjs` (it ignores `tests/`).

```bash
npm test
npx jest __tests__/public/LoginPage.test.tsx
npm test -- --watch
```

**Playwright** (`tests/`): browser tests that start `npm run dev` automatically. `tests/fixtures/authenticated.ts` sets a fake `access_token` and mocks the file and conversation endpoints, so no backend is needed.

```bash
npx playwright install
npm run test:e2e
npx playwright test --ui
npx playwright show-report
```

CI runs Jest and Playwright on every push (see `.github/workflows/ci.yml`).

## Project structure

```text
frontend/
├── src/app/
│   ├── (public)/          Landing, auth, about, features, contacts, demo (+ navBar)
│   ├── (protected)/       Chat, documents, dashboard, history, tickets, roles (+ sideBar, layout)
│   │   └── comps/         sideBar.tsx, model_provider.json
│   ├── layout.tsx
│   └── globals.css
├── __tests__/             Jest tests (components, protected, public)
├── tests/                 Playwright specs and fixtures
├── public/                Images and logo
└── jest.config.cjs, playwright.config.ts, tailwind.config.js, next.config.js
```

## Notes

`src/documents/users.json` holds sample accounts with plaintext passwords. Don't reuse those credentials anywhere real, and consider removing the file from the repo.