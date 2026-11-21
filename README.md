# Product Catalogue PoC

A proof of concept for a product catalogue that customers can browse and search, and send an enquiry from. It is built as a foundation to grow, not a throwaway: the product data source, the look and feel, and the email provider can each be changed in one place.

- **Client:** React 19 + TypeScript (Vite)
- **Backend:** Node.js 22 + TypeScript + NestJS 12
- **Product data:** [Fake Store API](https://fakestoreapi.com), fetched **only by the backend**
- **Email:** SMTP; locally every email is caught by [Mailpit](https://mailpit.axllent.org)

More detail: [DECISIONS.md](DECISIONS.md) (assumptions, cuts, how it grows, what's next) · [AI_USAGE.md](AI_USAGE.md) (how AI was used) · [PLAN.md](PLAN.md) (the plan it was built from).

## Run it (one command)

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/), or Docker Engine with Compose v2.24 or newer. Nothing else needs installing, and no accounts or API keys are needed. Ports **8080** and **8025** must be free.

```bash
git clone https://github.com/kumbarsachin67gmail/officeworks-catalogue.git
cd officeworks-catalogue
git checkout feature/product-catalogue   # the code lives on this branch until the PR is merged
docker compose up --build
```

The first run takes about 3 minutes (it downloads base images and builds both apps). Then open:

| What | Where |
|---|---|
| The catalogue | http://localhost:8080 |
| The sales inbox (every enquiry email lands here) | http://localhost:8025 |

Stop with `Ctrl+C`, then `docker compose down`.

No `.env` file is needed. To change a setting, copy `.env.example` to `.env` and uncomment the line (see [Configuration](#configuration)).

## Try the acceptance criteria

| # | Criterion | How to check it |
|---|---|---|
| 1 | Home page shows the 5 chosen "top rated" products | Open http://localhost:8080: the "Top rated" section under the banner. The owner's choice is `FEATURED_PRODUCT_IDS` (default `1,5,9,13,17`). Category rows below it are extra browsing |
| 2 | Category page shows top rated, then more products | Click a category (e.g. *men's clothing*): "Top rated" first, then "More in this category" |
| 3 | Search shows only matching products | Type `men` in the search bar and click **Search**: only men's clothing, no women's |
| 4 | Clicking a tile opens the product page | Click any product tile |
| 5 | Enquiry emails the sales inbox and says "Thank you" | On a product, click **Enquire**, fill in name and email, click **Send enquiry**. Then see the email at http://localhost:8025 |

## Configuration

Every setting is optional and documented in [`.env.example`](.env.example). The ones most worth knowing:

| Variable | Default | What it does |
|---|---|---|
| `FEATURED_PRODUCT_IDS` | `1,5,9,13,17` | The owner's "top rated" products for the home page, in order |
| `CATEGORY_TOP_RATED_COUNT` | `3` | How many "top rated" products a category page shows |
| `SALES_INBOX_EMAIL` | `sales@example.com` | Where enquiries are sent |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Mailpit | Point at a real SMTP relay (for example Amazon SES SMTP) |
| `FAKE_STORE_BASE_URL` | `https://fakestoreapi.com` | The product source |

Invalid values stop the backend at startup with a clear message, rather than failing on a later request.

## Run without Docker

You need Node.js 22+ and Mailpit (`brew install mailpit`, or see [Mailpit's install guide](https://mailpit.axllent.org/docs/install/)). Use three terminals:

```bash
mailpit
```

```bash
cd backend && npm ci && npm run start:dev
```

```bash
cd frontend && npm ci && npm run dev
```

Open http://localhost:5173. Vite forwards `/api` to the backend on port 3000, and emails appear at http://localhost:8025. The backend also reads a `.env` in `backend/` or the repo root, if there is one.

## Tests and checks

Run these in `backend/` and in `frontend/`:

```bash
npm test            # Vitest: backend 102 tests, frontend 31
npm run lint        # ESLint, including the architecture rules below
npm run typecheck   # TypeScript strict
```

The tests never call the real Fake Store API. [GitHub Actions](.github/workflows/ci.yml) runs lint, type check, tests and a production build for both apps on every push and pull request.

## How it fits together

```
Browser ──> nginx :8080 ──/api──> NestJS backend ──> ProductRepository ──> Fake Store API
            (static React app)                   └─> EmailSender ──────> SMTP (Mailpit locally)
```

- **One origin for the browser.** nginx (or Vite in development) serves the app and forwards `/api`, so the backend needs no CORS. Product images are the one exception: the browser loads them from the image URLs the data returns (see DECISIONS.md).
- **Swappable data source.** The backend reads products only through the `ProductRepository` interface. Fake Store is one implementation, chosen on one line in `products.module.ts`. A shared contract test checks any implementation.
- **Swappable email provider.** Email goes only through `EmailSender`; SMTP is one implementation, chosen in `enquiries.module.ts`.
- **One place for "top rated".** `TopRatedPolicy` holds the ranking rules.
- **Restylable.** All styling is in `frontend/src/styles.css`, driven by CSS variables.
- **Rules that can't silently erode.** ESLint fails the build if code bypasses these boundaries. Examples: `fetch` outside `api/client.ts`, a Fake Store URL in the client, or importing a concrete implementation outside its module.

### API (`/api`)

| Method & path | Returns |
|---|---|
| `GET /api/health` | `{ status: "ok" }` |
| `GET /api/products/featured` | The owner's chosen products, in order |
| `GET /api/products/search?q=term` | Products with a word starting with the term (400 if blank or over 100 characters) |
| `GET /api/products/:id` | One product (400 for a malformed id, 404 if unknown) |
| `GET /api/categories` | Category names, sorted |
| `GET /api/categories/:category` | `{ category, topRated, others }` (404 if unknown) |
| `POST /api/enquiries` | `{ productId, name, email, phone?, message? }` → 201 `{ message }`; 400, 404, or 503 if email can't be sent |

Errors are JSON `{ statusCode, message, error }`. The client turns them into friendly messages and never shows a stack trace.

### Layout

```
backend/src/   config/ products/ enquiries/   (one folder per feature) + setup-app.ts, main.ts
backend/test/  unit, contract and Supertest end-to-end tests with fakes
frontend/src/  api/client.ts (only file that calls the backend), pages/, components/, hooks/, styles.css
frontend/test/ React Testing Library tests through the real UI, API client mocked
notes/         working notes: AI log, time log, end-to-end verification, AI review findings
```

## Why this stack

| Choice | Why |
|---|---|
| **React + TypeScript** (Vite, React Router) | The brief prefers TypeScript; my strongest client stack; no simulator to set up for the reviewer |
| **Node.js + TypeScript with NestJS** | The brief's "Node.js (TypeScript preferred)". Nest's modules and dependency injection make the swappable data source and email provider explicit: change one provider line. I have used it in production |
| **class-validator DTOs** | Every request is validated, and unknown fields are rejected |
| **SMTP + Mailpit** | Works with any provider later (SES, SendGrid), and needs no paid service or account for the reviewer |
| **Vitest** (both apps) | One test runner. NestJS 12 ships as ES modules and its official starter uses Vitest |
| **Docker Compose** | One command for the reviewer. The images are standard containers, ready for AWS (ECS/Fargate) |
| **No database** | The brief doesn't need one: products come from Fake Store and enquiries go by email. The repository interface is where a database plugs in |

## Time spent

About 3¼ hours of wall-clock time in one session on 20 Nov 2026, against a 2–3 hour time-box. That includes roughly 30–60 minutes of machine setup (installing Docker and tooling). See the breakdown in [AI_USAGE.md](AI_USAGE.md#time-spent).
