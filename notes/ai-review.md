# AI review pass (build-order step 7)

Run on 2026-11-20 over the whole branch (`git diff main...HEAD`) before opening the PR.
Six reviewers, all read-only, run in parallel:

- the pr-review-toolkit agents: code-reviewer, silent-failure-hunter, pr-test-analyzer, type-design-analyzer, comment-analyzer
- Claude Code's `/security-review`

Every finding was checked against the code before acting. Claims of a bug were confirmed with a failing test first.

## Fixed

| Reviewer | Finding | What was done |
|---|---|---|
| code-reviewer | **Bug:** `/api/products/0x10` returned product 16. `1e1`, `007`, `%205` and `1.0` were also accepted. The global ValidationPipe turned the number-typed `:id` into a number before the custom pipe ran | Confirmed with 5 failing e2e cases. Replaced the pipe with a `ProductIdParams` DTO that validates the text |
| code-reviewer | A bad `FEATURED_PRODUCT_IDS` logged a warning on every home page visit | Warn once per distinct set of missing ids, with a test |
| code-reviewer | Home page said "Our five featured products" although the count is configurable | Copy changed to "Our featured products" |
| silent-failure | Fake Store network errors were logged as just "fetch failed"; the real reason (DNS, refused, TLS) is in `cause` | `describeError` logs the cause chain and error codes; tests for both |
| silent-failure | A 2xx that is not JSON, and unexpected client errors, were shown as a generic message with nothing in the console | Client turns non-JSON success into a friendly `ApiError` and logs it; unexpected errors are logged |
| silent-failure | No error boundary: a render bug would leave a blank page | `ErrorBoundary` around page content (header stays usable), reset on navigation; test |
| silent-failure | SMTP timeouts (3 × 10 s) could outlast nginx's 30 s proxy timeout and lead to duplicate enquiries | 5 s connect, 5 s greeting, 15 s socket |
| silent-failure | Stale-cache warning did not say how old the served data is | The warning now includes the age |
| silent-failure, type-design | Config accepted a zero timeout, out-of-range ports, non-http URLs, malformed addresses, and only one of `SMTP_USER`/`SMTP_PASS` | All of these stop startup with a clear message; tests for each |
| type-design | SMTP fields were mixed into generic email config, so an SES sender would have inherited them | Split into `email` (provider-neutral) and `smtp` |
| type-design | The repository's search rule pointed at an in-memory helper, so a SQL version couldn't follow it | The rule is written out in the interface doc, and `listCategories` is documented as sorted. A shared **ProductRepository contract test** runs against both implementations, ready for a database one |
| type-design | `Product` was mutable while repositories share cached objects | `Product` and `CategoryView` are read-only. `splitCategory` returns `Omit<CategoryView, 'category'>` |
| type-design | Frontend/backend types could drift | e2e pins the product JSON field names; `EnquiryResult` is named; "mirrored by" notes on both sides |
| test-analyzer | No test for recovery after a failed first load (rated 8/10) | Added |
| test-analyzer | `SmtpEmailSender` untested; production repository wiring never built in a test | Payload/auth tests with nodemailer mocked; e2e using the real `FakeStoreRepository` with only the network faked |
| test-analyzer | Double submit, phone/trim, late (stale) answers, empty search page, enquiry while the product source is down, user-facing 400 text: all unasserted | Tests added for each. The stale-answer test was checked by breaking the guard on purpose |
| comment-analyzer | Several docs said "the browser only talks to its own origin", but product images load from Fake Store's host | Reworded in PLAN.md, nginx config, Vite config and the API client |
| comment-analyzer | Smaller doc errors: wrong nginx file name, phone rule, missing `BACKEND_URL` in `.env.example`, healthcheck location, folder list, `.env` lookup path, an eslint exception without a reason | All corrected |
| security-review | No exploitable issues. Header injection via the email field was tested against nodemailer and is neutralised. One hardening note: the Mailpit inbox was published on all interfaces | Mailpit bound to `127.0.0.1` |

Tests: backend 68 → 102, frontend 25 → 31.

## Rejected or deferred (with reasons)

| Reviewer | Suggestion | Decision |
|---|---|---|
| type-design | Frontend email regex is looser than the backend's `IsEmail` | Kept. The backend is the authority and its message is shown. The comment now says the frontend mirrors the main rules only |
| type-design | Give `ApiError` a `kind` instead of `status: 0` for network errors | Rejected: low value for a PoC; the status code is enough to branch on |
| type-design | Add paging/limits to repository queries | Deferred: about 20 products. Listed as a next step for the database repository |
| silent-failure | Health endpoint should report "degraded" when serving stale data | Deferred to "next day". The age is now logged; changing health semantics needs a monitoring decision |
| test-analyzer | Prefer regex matches over exact UI copy in tests | Kept exact copy: the text users see is part of the behaviour |

## Proposed changes to CLAUDE.md (need the owner's approval)

The comment-analyzer also suggested edits to CLAUDE.md. CLAUDE.md is the agent's instruction file, so these were not applied without approval:

1. Line 13: say that API calls go through `/api`, while product images load from the URLs the data source returns.
2. Line 28: say errors are `{ statusCode, message, error }`, with `message` an array for validation errors.
3. Line 36: "The main boundaries above are enforced by ESLint" (not all rules are lintable).
