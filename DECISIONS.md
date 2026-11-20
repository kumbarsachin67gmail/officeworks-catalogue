# Decisions and assumptions

The acceptance criteria leave gaps on purpose. This is what I assumed, what I cut, how the design is meant to grow, and what I'd do next. The plan these came from is in [PLAN.md](PLAN.md).

## Assumptions where the criteria were unclear

### Home page: "I have chosen 5 products to be top rated"
- The owner's choice is a list of product ids in config, `FEATURED_PRODUCT_IDS` (default `1,5,9,13,17`), shown in that order. It is a config value, not an admin screen, because there is no database or login in the PoC.
- Ids that don't exist are skipped, and the backend logs one warning, so a typo can't break the home page. Any number of ids works; 5 is the default.

### Category page: "top rated products for that category" and "additional products"
- "Top rated" here means: the owner's chosen products that are in this category come first. The remaining places, up to `CATEGORY_TOP_RATED_COUNT` (default 3), go to the highest customer rating.
  - Ties go to the product with more ratings, then the lower id, so the order never changes between requests.
  - Owner picks are never cut, even if there are more of them than the count.
  - The same `FEATURED_PRODUCT_IDS` list is used for both pages. There is no separate per-category list.
- "Additional products" are everything else in the category, under "More in this category". No product appears twice.
- All of these rules live in one class, `TopRatedPolicy`, so they can change in one place.

### Search: "only products that have text matching that search term"
- A product matches if a word in its **title, description or category starts with the term**, ignoring case.
  - Plain "contains" matching would make `men` return women's clothing (`wo-men`), which breaks "only … matching". So matching is by word start.
  - The term is plain text: `.*` or `(` are not treated as patterns.
- Search runs on the backend. A blank term or one over 100 characters is rejected with 400. The client doesn't send a blank search.
- Search only runs when the Search button is clicked (or Enter is pressed), as the criterion describes. There is no search-as-you-type.

### Enquiry: "complete the form with my contact details"
- **Fields:**
  - name: required, one line, ≤100 characters
  - email: required, valid, ≤254 characters
  - phone: optional, digits, spaces and `+ ( ) -`, 6–20 characters
  - message: optional, ≤2000 characters
- The product id comes from the page. Unknown fields are rejected.
- The email goes to `SALES_INBOX_EMAIL` as **plain text** (no HTML is built from user input). Reply-to is set to the customer, and the subject is `New enquiry: <product title>`.
- "Thank you" is shown only after the email provider accepts the message. If sending fails, the customer sees a friendly "try again" message and the form keeps what they typed.
- The form appears only after clicking **Enquire**, as the criterion describes.

### Product data and availability
- Fake Store has about 20 products and no server-side search, so the backend fetches the whole catalogue once and caches it in memory:
  - The cache stays fresh for 5 minutes.
  - Requests that arrive together share one fetch.
  - Each fetch gives up after 5 s.
  - If a refresh fails, the last good catalogue is served and the next attempt waits 30 s.
  - If nothing has ever loaded, the API answers 503 and the page shows a friendly message with "Try again".
- Fake Store items are mapped into our own `Product` model, and malformed items are skipped and logged. Nothing outside the repository depends on Fake Store's format.
- Prices are shown as Fake Store gives them, in **USD**, labelled as such. There is no currency conversion.

### Product images (the one exception to "everything through the backend")
- All product **data** comes from the backend, but each product's `image` is a URL on Fake Store's image host, and the browser loads it directly.
- I treat these as static assets the data source serves, not as calls to the Fake Store API. The Content-Security-Policy allows images from that one host and nothing else.
- With a real data source, images would come from our own storage (S3 + CloudFront). The alternative now, a backend image proxy, adds code and load for little benefit in a PoC.

## Requirements dropped or simplified, and why

| Dropped or simplified | Why |
|---|---|
| **No database** | Not needed: products come from Fake Store and enquiries go by email. The `ProductRepository` interface is where one plugs in |
| **Enquiries are emailed, not stored** | Meets the criterion. If email is down the customer is told to retry, so the lead isn't lost silently, but it isn't kept either. Storing first is the top "next step" |
| **"Top rated" is set in config, not an admin screen** | No login or database in scope. Changing it means changing one env var and restarting |
| **No login, cart, checkout, pagination or language support** | Not in the criteria. About 20 products need no pagination |
| **No rate limiting or CAPTCHA on the enquiry form** | Out of scope for a local PoC. nginx caps API request bodies at 16 KB, and every field is validated |
| **No AWS deployment** | The brief only asks that infrastructure is AWS-compatible. The images are standard containers, nginx finds the backend through DNS (works on ECS), and SMTP works with SES |
| **Look and feel is functional, not final** | The client's designers are still working on it. All styling is in one CSS file behind variables |
| **Frontend and backend types are written twice** | A shared package or generated client is too much for a PoC. Instead, an end-to-end test pins the product JSON field names so drift fails a test |
| **Health check doesn't report "serving stale data"** | The age of stale data is logged. Changing what "healthy" means needs a monitoring decision |
| **Optional local-file product source not built** | PLAN.md listed it as "only if time allows". The repository contract test already shows how a second source plugs in |

## How the design supports growth

The brief says the **product data source**, the **look and feel** and the **email provider** will all change. Each has one seam.

- **Data source → `ProductRepository`.**
  - The app reads products only through this interface. `FakeStoreRepository` is one implementation, chosen on one line in `products.module.ts`.
  - A Postgres repository means writing one class and changing that line. The search rule is written out in the interface so it can be done in SQL.
  - A shared **contract test** (`backend/test/products/product-repository.contract.ts`) runs the same behaviour checks against every implementation.
- **Email provider → `EmailSender`.** Same pattern, chosen in `enquiries.module.ts`. Config is split into provider-neutral settings (`email`) and SMTP-only settings (`smtp`), so an SES sender doesn't inherit SMTP fields.
- **Look and feel → `styles.css`.** All colours, spacing and type are CSS variables, and components contain no styling decisions. Error, loading and empty states each have one component.
- **"Top rated" rules → `TopRatedPolicy`,** the only code that ranks. Routes and the client never re-implement it.
- **The client talks only to our API.** `frontend/src/api/client.ts` is the only file that makes requests. A new backend data source changes nothing in the client.
- **The boundaries are enforced, not just written down.** ESLint fails the build if code calls `fetch` outside the API client or puts a Fake Store URL in the client. It also fails it if code imports a concrete repository or email sender outside its module, or ranks by rating outside `TopRatedPolicy`. CI runs lint, type check, tests and build on every push.
- **Config, not code, for anything environment-specific.** Every setting is an env var with a working default, documented in `.env.example` and checked at startup.
- **Tests that make change safe.**
  - 102 backend tests: unit, contract, and Supertest end to end, including a run with the real Fake Store repository and only the network faked.
  - 31 frontend tests that drive the real UI, organised by acceptance criterion.
- **Ready for AWS.**
  - Both images are non-root. The backend has a health check.
  - nginx resolves the backend through DNS on each request (cached 10 s), so it survives restarts and IP changes.
  - The backend address comes from `BACKEND_URL`, and email works with SES over SMTP.

## What I'd do next with another day

1. **Never lose a lead.** Save each enquiry to a database first, then email it from a background job with retries.
2. **Postgres product repository.** Use full-text search, and an admin screen (behind login) where the owner picks the featured products.
3. **Protect the enquiry form.** Add rate limiting and a CAPTCHA or honeypot field.
4. **Deploy to AWS.** Run the backend on ECS Fargate, serve the frontend from S3 + CloudFront, send email with SES, and keep secrets in Secrets Manager.
5. **Our own images.** Copy product images to S3/CloudFront, then tighten the CSP to our domain only.
6. **Operations.** A health status that reports stale data, structured logs and metrics, and alerts when Fake Store or email fails.
7. **Stronger CI.** Build the Docker images and run a browser smoke test (Playwright) of the five criteria against them on every PR.
8. **Shared API types.** Generate an OpenAPI spec from the backend and a typed client for the frontend, so the duplicated types go away.
9. **Accessibility and design pass.** Run an audit with the designers once the look and feel is ready.
