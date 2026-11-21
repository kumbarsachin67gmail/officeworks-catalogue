# End-to-end verification (build-order step 6)

Done on 2026-11-20 against the **real Fake Store API**, starting from a fresh
`git clone` of `feature/product-catalogue` (commit `9fe9c18`), the way a reviewer
would. Steps were clicked through in a browser; emails were read in Mailpit.

## Run paths

| Path | Command | Result |
|---|---|---|
| Docker (reviewer path) | `docker compose up --build` | All 3 services healthy. ~3 min on the first run (includes pulling base images); 72 s rebuilding with no build cache |
| Without Docker | `npm ci` in `backend/` and `frontend/`, `mailpit`, `npm run start:dev`, `npm run dev` | Works; `npm ci` took 4 s for both apps; app at http://localhost:5173 |
| Private files | `ls docs` in the fresh clone | No `docs/` folder: the brief and notes are not on GitHub |

## Acceptance criteria (Docker, http://localhost:8080)

| # | Criterion | What was done | Result |
|---|---|---|---|
| 1 | Home: 5 chosen products | Opened `/` | Products 1, 5, 9, 13, 17 shown in that order under "Top rated" |
| 2 | Category: top rated + more | Clicked "women's clothing" in the menu | Top rated: owner pick (3.8) first, then the best rated (4.7, 4.5); "More in this category" lists the rest (2.6–3.6) |
| 3 | Search shows only matches | Typed "men", clicked Search | 4 results, all men's clothing; no women's items ("men" no longer matches "women") |
| 4 | Tile opens details | Clicked the "Mens Cotton Jacket" tile | `/products/3` with title, price (USD 55.99), rating, description |
| 5 | Enquiry: email + "Thank you" | Clicked Enquire; submitted empty (errors shown), then name/email/phone | "Thank you" shown; Mailpit received a plain-text email to `sales@example.com`, reply-to the customer, subject "New enquiry: Mens Cotton Jacket" |

## Failure cases

| Case | How | Before fixes | After fixes |
|---|---|---|---|
| Email server down | Stopped Mailpit, sent an enquiry | Friendly 503 after the 10 s SMTP timeout; form keeps what was typed; cause logged | Same (as designed) |
| Fake Store unreachable on start | `FAKE_STORE_BASE_URL=https://fakestoreapi.invalid` | Friendly 503 + "Try again"; Try again recovers products after Fake Store returns. **But the category menu stayed missing until a full reload** | Menu shows "Categories are unavailable. Retry" and recovers |
| Backend stopped | `docker compose stop backend` | **nginx returned an HTML 502 after 23 s**; the UI showed a generic error | JSON `{statusCode: 503, message}` in ~1 s; UI says "temporarily unavailable" |
| Backend restarted with a new IP | Recreated the backend container with its old IP taken | **nginx kept the old IP: 502 until nginx was restarted** | nginx looks the backend up through DNS on each request (cached 10 s); back in ~2 s |

## Fixes made from this verification

1. nginx resolves the backend at request time (`resolver` from the image's
   local-resolvers entrypoint, works on Docker and AWS), fails fast
   (`proxy_connect_timeout 5s`), and answers unreachable-backend errors in the
   API's JSON format.
2. The client treats 502/504 like 503 ("temporarily unavailable").
3. The category menu offers Retry when it fails to load.

Each fix has a test (frontend: 25 tests) or was re-checked by repeating the
failure case above.
