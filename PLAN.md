# Plan – Product Catalogue PoC

Spec source: the assignment brief (kept privately at `docs/brief.pdf`). This plan records the decisions made before building.

## Goal
A small, well-structured PoC that meets the five acceptance criteria and is clearly ready to grow:
the product data source, the look and feel, and the email provider are all expected to change.
Time-box: 2–3 hours of build. Judgement and clarity matter more than feature count.

## Stack (and why)
| Layer | Choice | Why |
|---|---|---|
| Client | React + TypeScript (Vite, React Router) | Brief prefers TypeScript; my strongest client stack; no simulator setup |
| Backend | Node.js 22 + TypeScript + NestJS 12 (ES modules) | Brief's "Node.js (TypeScript preferred)" – NestJS runs on Node/Express. Modules + dependency injection make the swappable data source and email provider explicit; my production experience (Edvoy) |
| Validation | class-validator DTOs + global ValidationPipe | Built into the Nest way of working; rejects unknown fields |
| Email | Nodemailer over SMTP → Mailpit locally | No paid service or account for the reviewer; Mailpit shows sent mail in a browser |
| Tests | Vitest + Supertest + `@nestjs/testing` (backend), Vitest + React Testing Library (frontend) | One runner for both apps. NestJS 12 ships only as ES modules; its official starter moved from Jest to Vitest, and Jest needs experimental flags for ESM |
| Lint | ESLint, with restricted-syntax/import rules for the architecture rules | Enforces "no direct Fake Store in the client" and "pages never call `fetch`" in code, visible to reviewers |
| CI | GitHub Actions: lint, type-check, tests for both apps on every PR | ~15 lines; the PR shows green checks; proves the tests run outside my machine |
| Run | Docker Compose: frontend (nginx) + backend + Mailpit | One command: `docker compose up`. README also documents a no-Docker path (`npm run dev` in each app + Mailpit binary) |
| Database | None | Not needed by the brief (products from Fake Store, enquiries go to email). Repository interface makes adding Postgres a one-line wiring change |

## API (backend, prefix `/api`)
| Method & path | Returns |
|---|---|
| GET `/api/health` | `{ status: "ok" }` (used by the `HEALTHCHECK` in `backend/Dockerfile`, which Compose waits on) |
| GET `/api/products/featured` | The 5 owner-chosen "top rated" products |
| GET `/api/products/search?q=term` | Products with a word in title, description or category that starts with the term (case-insensitive); 400 if empty |
| GET `/api/products/:id` | One product; 400 if `id` is not a positive integer (`ProductIdParams` DTO, validated as text); 404 if unknown |
| GET `/api/categories` | List of category names |
| GET `/api/categories/:category` | `{ category, topRated: Product[], others: Product[] }`; 404 if unknown. `:category` is URL-encoded (names contain spaces and apostrophes, e.g. `men's clothing`) |
| POST `/api/enquiries` | Validates, emails the sales inbox, returns `{ message: "Thank you…" }` (201) |

Route order in `ProductsController`: `featured` and `search` are declared before `:id`.

## Assumptions (to record in DECISIONS.md)
1. **"Top rated" on the home page** = the 5 products the owner chose, set by `FEATURED_PRODUCT_IDS` in env (default `1,5,9,13,17`), shown in that order. Unknown IDs are skipped and logged as a warning.
2. **Category "top rated"** = the owner's chosen products in that category first, then filled up to `CATEGORY_TOP_RATED_COUNT` (default 3) by highest customer rating. Ties are broken by rating count (higher first), then by product id (lower first), so the order is deterministic. Everything else in the category is listed under "More in this category". No product appears twice.
3. **Search** is case-insensitive and done on the backend. A product matches if any word in its title, description or category *starts with* the term (so "men" matches "men's clothing" but not "women's clothing"). Plain substring matching would make "men" return women's clothing, which breaks "only see products that have text matching". Empty term = validation error. Max 100 characters. Regex special characters in the term are escaped.
4. **Enquiry form fields:** name (required, one line, ≤100), email (required, valid, ≤254), phone (optional, digits, spaces and + ( ) -, 6–20 characters), message (optional, ≤2000). Product ID is sent automatically from the product page. Unknown fields are rejected.
5. **Enquiry email:** plain text to `SALES_INBOX_EMAIL`, reply-to set to the customer, subject `New enquiry: <product title>`. The product must exist (404 otherwise). If sending fails → 503 with a friendly message.
6. **Fake Store availability:** the whole catalogue (~20 products) is loaded once and cached in memory for 5 minutes (`PRODUCT_CACHE_TTL_MS`); concurrent requests share one fetch; each fetch has a timeout (`FAKE_STORE_TIMEOUT_MS`, default 5000) so a hang becomes a failure instead of a stuck request; if Fake Store fails after a successful load, stale data is served and the next refresh is tried after 30 s (`RETRY_AFTER_FAILURE_MS`); if it never loaded → 503.
7. Prices are shown as given by Fake Store (USD), labelled as USD. No currency conversion.
8. No login, cart, checkout, pagination, admin UI or i18n in the PoC.
9. **Same origin, no CORS:** all API calls go to `/api` on the page's own origin. Vite's dev proxy (dev) and nginx (Docker) forward them to the backend, so the backend does not enable CORS. Product images are the exception: they load from the image URLs the backend returns (Fake Store's image host today).

## Folder structure
```
backend/src/
  config/ app-config.ts, config.module.ts   (env vars → typed config, APP_CONFIG token)
  products/ product.ts, product.repository.ts (interface + PRODUCT_REPOSITORY token),
            http-fetch.ts (HTTP_FETCH token, so tests fake the network),
            in-memory-queries.ts (lookups/search shared by in-memory repositories),
            product-id.params.ts (`:id` validated as text),
            fake-store.repository.ts (+cache, timeout), top-rated.policy.ts, products.service.ts,
            products.controller.ts, search-query.dto.ts, products.module.ts
            [optional] fixture.repository.ts + fixtures/products.json (PRODUCT_SOURCE=fixture)
  enquiries/ create-enquiry.dto.ts, email-sender.ts (interface + EMAIL_SENDER token),
             smtp-email-sender.ts, enquiries.service.ts, enquiries.controller.ts, enquiries.module.ts
  app.module.ts         (imports Config, Products, Enquiries; health.controller.ts)
  describe-error.ts     (log line with an error's cause chain)
  setup-app.ts          (/api prefix + ValidationPipe, shared with tests)
  main.ts               (bootstrap only; no CORS – see assumption 9)
backend/test/           (unit + Supertest API tests, Fake Store and SMTP faked)

frontend/src/
  api/client.ts         (only file that calls the backend)
  types/product.ts
  hooks/useAsync.ts     (one loading/error pattern)
  components/ Layout, ProductTile, ProductGrid, EnquiryForm, Status, format.ts (price/rating/URL helpers)
  pages/ HomePage, CategoryPage, SearchPage, ProductPage, NotFoundPage
  styles.css, App.tsx, main.tsx
frontend/test/
frontend/nginx.conf.template (serves the app, proxies /api to the backend; filled in by envsubst at container start)

.github/workflows/ci.yml
docker-compose.yml, .env.example, README.md, DECISIONS.md, AI_USAGE.md, CLAUDE.md
notes/ai-log.md         (running log of key prompts and AI mistakes, source for AI_USAGE.md)
```

## Tests (critical path)
Backend:
- `TopRatedPolicy`: owner picks first, fill by rating, tie-break order, no duplicates, unknown ids skipped, category with fewer products than the count.
- `FakeStoreRepository` (fake `HTTP_FETCH`): caches for the TTL, concurrent calls share one fetch, timeout → failure, stale data served after a later failure, 503 when never loaded.
- Search: word-start matching ("men" ≠ "women's"), case-insensitive, special characters escaped.
- Enquiries service (fake `EmailSender`): plain-text body, reply-to = customer, subject has product title, 404 for unknown product, 503 when sending fails.
- Supertest e2e through `setupApp`: every route's success path plus 400 (empty search, bad id, invalid/unknown enquiry fields), 404 and 503.

Frontend (API client mocked):
- Home shows the 5 featured products.
- Category page shows top rated and "More in this category".
- Search bar → results page shows only matching products; empty state.
- Clicking a tile opens the product page.
- Enquiry form: validation messages, "Thank you" on success, friendly error on failure.

## Build order
0. Prerequisites: install Docker (Docker Desktop, OrbStack or Colima – not installed on this Mac yet); `git init`; create the public GitHub repo with `gh`.
1. Repo setup: `main` with README + .gitignore (ignore `.env*` except `.env.example`); branch `feature/product-catalogue`. Start the time log and `notes/ai-log.md`.
2. Backend: config module → product model + repository interface → Fake Store repository (+cache, timeout) → TopRatedPolicy → service → controller → module → enquiries (DTO, EmailSender, SMTP, service, controller, module) → app module + setup-app → tests.
3. Frontend: types + API client → useAsync → Layout (categories + search bar) → ProductTile/Grid → Home, Category, Search, Product pages → EnquiryForm with "Thank you" state → styles → tests.
4. Tooling: ESLint architecture rules, GitHub Actions CI.
5. Docker: backend Dockerfile, frontend Dockerfile + nginx, docker-compose with Mailpit and a backend healthcheck, `.env.example`.
6. Verify end to end against the real Fake Store API: every acceptance criterion by hand, enquiry email visible in Mailpit (http://localhost:8025). Also test the no-Docker path from the README.
7. AI review pass (code-review / PR-review plugins), fix or consciously reject findings, note them in `notes/ai-log.md`.
8. Docs: README (setup in under 10 minutes, Docker and no-Docker paths, stack choice and why), DECISIONS.md, AI_USAGE.md, time spent. Written after the review so they describe the final code.
9. Push, open PR into `main` with a strong description, leave it open.
10. Optional, only if time allows: `FixtureProductRepository` selected by `PRODUCT_SOURCE=fixture`. Proves the data source is swappable with real code and keeps the demo working if Fake Store is down.

## Out of scope (say so in DECISIONS.md)
Database, auth, cart/checkout, pagination, rate limiting, AWS deployment, final visual design.

## "Next day" ideas (for DECISIONS.md)
- Save enquiries to a database before emailing (no lost leads if email fails), with retry.
- Postgres product repository with full-text search; featured products managed in an admin screen.
- Rate limiting and CAPTCHA on the enquiry form.
- Deploy: backend on AWS ECS/Lambda, frontend on S3 + CloudFront, email via SES.
- CI additions: build the Docker images and run a smoke test against them.

## Deadline
Reply to the recruiter's email with the public GitHub repo link by **Saturday 21 Nov 2026, 12:00 PM IST**.
