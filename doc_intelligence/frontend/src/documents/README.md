# Doc Intelligence Frontend

# Project Structure

```text
frontend/
├── __tests__/
│   ├── components/
│   │   ├── Navbar.test.tsx
│   │   └── SideBar.test.tsx
│   ├── protected/
│   │   ├── Chat.test.tsx
│   │   ├── ChatHistory.test.tsx
│   │   ├── Dashboard.test.tsx
│   │   ├── Documents.test.tsx
│   │   ├── SubmittedTickets.test.tsx
│   │   ├── TicketPage.test.tsx
│   │   ├── UserRolesPage.test.tsx
│   │   └── ViewAll.test.tsx
│   └── public/
│       ├── AboutPage.test.tsx
│       ├── ContactPage.test.tsx
│       ├── DemoPage.test.tsx
│       ├── FeaturesPage.test.tsx
│       ├── LandingPage.test.tsx
│       ├── LoginPage.test.tsx
│       └── SignUpPage.test.tsx
├── eslint.config.mjs
├── jest.config.ts
├── jest.setup.ts
├── next.config.js
├── package.json
├── package-lock.json
├── playwright.config.ts
├── public/
│   ├── aboutPage.jpg
│   ├── authPage.jpg
│   ├── contactsPage.jpg
│   ├── featuresPage.jpg
│   ├── landingPage.jpg
│   └── logo.png
├── src/
│   ├── app/
│   │   ├── (protected)/
│   │   │   ├── chat/
│   │   │   │   └── page.tsx
│   │   │   ├── chat_history/
│   │   │   │   └── page.tsx
│   │   │   ├── comps/
│   │   │   │   ├── model_provider.json
│   │   │   │   └── sideBar.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── documents/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── submitted_tickets/
│   │   │   │   └── page.tsx
│   │   │   ├── ticket/
│   │   │   │   └── page.tsx
│   │   │   ├── user-roles/
│   │   │   │   └── page.tsx
│   │   │   └── view_all/
│   │   │       └── page.tsx
│   │   ├── (public)/
│   │   │   ├── about/
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   └── navBar.tsx
│   │   │   ├── contacts/
│   │   │   │   └── page.tsx
│   │   │   ├── demo/
│   │   │   │   └── page.tsx
│   │   │   ├── features/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── page.tsx
│   │   │   └── signup/
│   │   │       └── page.tsx
│   │   ├── globals.css
│   │   └── layout.tsx
│   └── documents/
│       ├── outline.md
│       ├── tailwind_guide.txt
│       └── users.json
├── tailwind.config.js
├── tests/
│   ├── components/
│   │   ├── navbar.spec.ts
│   │   └── sidebar.spec.ts
│   ├── protected/
│   │   ├── chat-history.spec.ts
│   │   ├── chat-page.spec.ts
│   │   ├── dashboard.spec.ts
│   │   ├── documents.spec.ts
│   │   ├── submitted-tickets.spec.ts
│   │   ├── ticket-page.spec.ts
│   │   ├── user-roles.spec.ts
│   │   └── view-all.spec.ts
│   └── public/
│       ├── about-page.spec.ts
│       ├── contact-page.spec.ts
│       ├── demo-page.spec.ts
│       ├── features-page.spec.ts
│       ├── landing-page.spec.ts
│       ├── login-page.spec.ts
│       └── signup-page.spec.ts
└── tsconfig.json
```

---

# Prerequisites

Install:

- Node.js 20+
- npm 10+

Verify installation:

```bash
node -v
npm -v
```

---

# Installation

Clone the repository and install dependencies:

```bash
npm install
```

---

# Running the Application

Development mode:

```bash
npm run dev
```

Application URL:

```text
http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

---

# Linting

Run ESLint:

```bash
npm run lint
```

---

# Jest Testing

Jest is used for:

- Component testing
- State testing
- Form validation
- Local storage testing
- API mocking

Location:

```text
__tests__/
```

## Run All Jest Tests

```bash
npm test
```

or

```bash
npx jest
```

## Run Specific Test Suite

Example:

```bash
npx jest __tests__/public/LoginPage.test.tsx
```

```bash
npx jest __tests__/protected/Documents.test.tsx
```

## Watch Mode

```bash
npm test -- --watch
```

---

# Playwright Testing

Playwright is used for:

- End-to-end testing
- Navigation testing
- Browser interactions
- Local storage validation
- API route mocking

Location:

```text
tests/
```

## Install Browsers

Run once:

```bash
npx playwright install
```

## Run All E2E Tests

```bash
npx playwright test
```

## Run Single Spec

```bash
npx playwright test tests/public/login-page.spec.ts
```

```bash
npx playwright test tests/protected/chat-page.spec.ts
```

## Run in UI Mode

```bash
npx playwright test --ui
```

## Run in Browser

```bash
npx playwright test --headed
```

## View Test Report

```bash
npx playwright show-report
```

---

# Test Coverage

## Public Pages

### Jest

```text
AboutPage.test.tsx
ContactPage.test.tsx
DemoPage.test.tsx
FeaturesPage.test.tsx
LandingPage.test.tsx
LoginPage.test.tsx
SignUpPage.test.tsx
```

### Playwright

```text
about-page.spec.ts
contact-page.spec.ts
demo-page.spec.ts
features-page.spec.ts
landing-page.spec.ts
login-page.spec.ts
signup-page.spec.ts
```

---

## Protected Pages

### Jest

```text
Chat.test.tsx
ChatHistory.test.tsx
Dashboard.test.tsx
Documents.test.tsx
SubmittedTickets.test.tsx
TicketPage.test.tsx
UserRolesPage.test.tsx
ViewAll.test.tsx
```

### Playwright

```text
chat-page.spec.ts
chat-history.spec.ts
dashboard.spec.ts
documents.spec.ts
submitted-tickets.spec.ts
ticket-page.spec.ts
user-roles.spec.ts
view-all.spec.ts
```

---

## Shared Components

### Jest

```text
Navbar.test.tsx
SideBar.test.tsx
```

### Playwright

```text
navbar.spec.ts
sidebar.spec.ts
```

---

# Jest Configuration

Configuration:

```text
jest.config.ts
```

Global setup:

```text
jest.setup.ts
```

Recommended configuration:

```ts
import "@testing-library/jest-dom";

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

---

# Playwright Configuration

Configuration:

```text
playwright.config.ts
```

Example:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
});
```

---

# Mocking API Requests

## Jest

```ts
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    success: true,
  }),
});
```

## Playwright

```ts
await page.route(
  "**/auth/login",
  async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "token",
      }),
    });
  }
);
```

---

# Local Storage Testing

## Jest

```ts
Storage.prototype.getItem = jest.fn((key) => {
  if (key === "username") return "john";
  return null;
});
```

## Playwright

```ts
await page.addInitScript(() => {
  localStorage.setItem("username", "john");
});
```

---

# Recommended Workflow

## During Development

Run:

```bash
npm run dev
```

In a separate terminal:

```bash
npm test -- --watch
```

---

## Before Commit

Run:

```bash
npm run lint
npm test
npx playwright test
```

---

## Before Pull Request

Verify:

- Build succeeds
- Lint passes
- Jest passes
- Playwright passes

Run:

```bash
npm run build
npm run lint
npm test
npx playwright test
```

---

# Troubleshooting

## Jest Cannot Find Fetch

Mock it:

```ts
global.fetch = jest.fn();
```

## Playwright Navigation Fails

Ensure the Next.js application is running:

```bash
npm run dev
```

before running:

```bash
npx playwright test
```

## Local Storage Issues

Set values before page load:

```ts
await page.addInitScript(() => {
  localStorage.setItem("role", "Admin");
});
```

---

# Architecture

## Public Routes

```text
/
/about
/features
/contacts
/demo
/login
/signup
```

## Protected Routes

```text
/dashboard
/documents
/chat
/chat_history
/ticket
/submitted_tickets
/view_all
/user-roles
```

---

# Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Jest
- React Testing Library
- Playwright

---