# CLAUDE.md – agent instructions for this repo

## What this is
A proof-of-concept product catalogue (take-home assignment) that must grow into a real product, not be thrown away.
- Client: React + TypeScript (Vite) in `frontend/`
- Backend: Node.js + TypeScript + NestJS 12 (ES modules) in `backend/`
- Product data: Fake Store API (https://fakestoreapi.com), reached ONLY from the backend
- No database in this PoC (see PLAN.md for why)

Read PLAN.md for the full plan, assumptions and build order before making changes.

## Architecture rules (do not break these)
- The client never calls Fake Store (or any product source) directly. All product data goes through the backend `/api`. The one exception is product images: the browser loads them from the image URLs the data source returns (Fake Store's image host today; see DECISIONS.md).
- The backend reads product data only through the `ProductRepository` interface (`backend/src/products/product.repository.ts`).
  Fake Store is one implementation, bound to the `PRODUCT_REPOSITORY` token in `products.module.ts`. A database must be addable by writing a new class and changing that one provider line.
- Email goes only through the `EmailSender` interface (`backend/src/enquiries/email-sender.ts`), bound to the `EMAIL_SENDER` token in `enquiries.module.ts`. SMTP (Mailpit locally) is one implementation.
- "Top rated" rules live in one place: `TopRatedPolicy` (`backend/src/products/top-rated.policy.ts`). Never re-implement ranking in routes or the client.
- Use NestJS dependency injection with Symbol tokens for interfaces (`PRODUCT_REPOSITORY`, `EMAIL_SENDER`, `APP_CONFIG`, `HTTP_FETCH`). Tests swap them with `overrideProvider`.
- Keep Nest simple: one module per feature (`ProductsModule`, `EnquiriesModule`) plus a global `ConfigModule`. No unnecessary layers.
- `setupApp(app)` in `backend/src/setup-app.ts` sets the `/api` prefix and the global ValidationPipe; used by `main.ts` and the e2e tests.
- In the frontend, `frontend/src/api/client.ts` is the only file that calls the backend. Pages never call `fetch` directly.
- Styling is plain CSS with variables in `frontend/src/styles.css`, so a designer can restyle without touching components.

## Conventions
- TypeScript strict mode in both apps. No `any` unless a comment explains why.
- Validate all request input with DTOs + class-validator (global ValidationPipe with whitelist + forbidNonWhitelisted). Never trust the client.
- No secrets in code. Config comes from env vars; document every var in `.env.example`.
- Errors: throw Nest built-in exceptions (`NotFoundException`, `ServiceUnavailableException`…) so the API returns JSON `{ statusCode, message, error }`, where `message` is a list of strings for validation errors (400) and a single string otherwise. Write those messages for people: the client shows 400 and 503 messages as-is, and a friendly fixed message for everything else, never a stack trace.
- Enquiry emails are plain text only (no HTML built from user input).
- Organise by feature (`products/`, `enquiries/`), not by type. Keep functions small and clearly named.

## Tests
- Backend: Vitest + Supertest + `@nestjs/testing` (NestJS 12 is ESM-only; Vitest is what its official starter uses). Tests live in `backend/test/`. Unit-test services with a fake `ProductRepository` and fake `EmailSender`. Never hit the real Fake Store API in tests.
- Frontend: Vitest + React Testing Library. Mock the API client; test what the user sees.
- Run `npm run lint` and `npm test` in `backend/` and `frontend/` before every commit. CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build for both apps on every push and PR.
- The main boundaries above (network calls, concrete implementations, ranking, the Fake Store URL) are enforced by ESLint (`no-restricted-imports` / `no-restricted-globals` / `no-restricted-syntax` in each app's `eslint.config.js`). Don't silence them; change the design or discuss it.

## Working agreement
- Plan before coding; show the plan and wait for approval on anything not already in PLAN.md.
- State assumptions; add new ones to DECISIONS.md.
- Log AI moments as they happen in `notes/ai-log.md` (it feeds AI_USAGE.md): key prompts that shaped the solution, and every time the AI got something wrong, what it was and how it was caught. Add a dated, one-to-three-line entry right away; don't reconstruct the log at the end.
- Small commits with clear messages, on the `feature/product-catalogue` branch. Open a PR into `main` and leave it open.
- Never commit `docs/brief.pdf`, `docs/interviewer-notes.md`, or any `.env` file.
