# AI usage

How I used AI to plan, build, test and review this, and where it went wrong. The running log I kept during the work is [notes/ai-log.md](notes/ai-log.md). This file summarises it.

## Tools and models

| Tool | Used for |
|---|---|
| **Claude Code** (desktop app), model **Claude Opus 5.5** | Planning review, all code, tests, Docker, CI, docs drafts, running and checking the app |
| Claude Code plugins from the official Anthropic marketplace: `claude-code-setup`, `pr-review-toolkit`, `code-review`, `commit-commands` | `claude-code-setup` recommended automations. `pr-review-toolkit`'s five review agents ran the review pass. `code-review` and `commit-commands` were installed but not needed: there was no PR yet, and commits were made with plain `git` |
| Claude Code's built-in `/security-review` | Security pass over the whole branch |
| Claude Code's built-in browser | Clicking through the running app to check the acceptance criteria and failure cases |

I asked for every plugin's contents (skills, agents, hooks, MCP servers) to be shown before installing. None added hooks or MCP servers.

## Agent instruction files (committed)

- **[CLAUDE.md](CLAUDE.md):** the rules the agent must follow. It covers:
  - the architecture boundaries (repository and email interfaces, one ranking policy, one API client)
  - conventions: strict TypeScript, DTO validation, error format, plain-text email
  - tests: run lint and tests before every commit, never hit the real Fake Store
  - the working agreement: plan first and wait for approval; small commits; log AI mistakes as they happen; never commit the private brief or `.env`
- **[.claude/settings.json](.claude/settings.json):** turns off Claude's co-author line on commits, so commits are under my name only.
- **ESLint configs** (`backend/eslint.config.js`, `frontend/eslint.config.js`): these turn the most important CLAUDE.md rules into build failures. An instruction file can be ignored; a failing lint can't.

## Plan / spec

[PLAN.md](PLAN.md) was written before any code: stack, API, assumptions, folder layout, critical-path tests and build order. My first prompt asked Claude to read it with the brief and list what it disagreed with. **It raised 11 points, and I agreed to all of them before building.** The main ones:
- substring search would make "men" match "women's"
- Docker wasn't installed on this Mac
- Fake Store calls had no timeout
- route-order and URL-encoding gaps
- CI should be in scope
- tests should be named per critical path

The plan was kept up to date as decisions changed, for example the move from Jest to Vitest.

I built in the plan's order and approved each step before it started: repo, backend, frontend, lint and CI, Docker, end-to-end verification, AI review, docs.

## Key prompts and moments

1. **"Show me what each plugin will install (skills, agents, hooks, MCP servers) before installing." … "Summarise your understanding of the task, architecture and build order, and list anything in PLAN.md you disagree with or think is missing. Don't write any app code yet."**
   - Starting with a critique instead of code caught the search bug and the missing Docker before a line was written.
   - It also stopped plugins being installed blind.
2. **The plan was wrong about the test runner, and the AI stopped to ask.**
   - NestJS 12 turned out to ship only as ES modules, and its official starter had moved from Jest to Vitest.
   - Claude found this while scaffolding and asked instead of forcing Jest into an experimental mode. It offered three options with their costs. I chose Nest 12 + Vitest, and CLAUDE.md and PLAN.md were updated.
3. **"Prove it works" became "prove the tests can fail".**
   - After all tests passed first time, Claude broke the code on purpose, for example with substring search, no rating tie-break, or no stale-cache fallback. It checked the matching tests went red.
   - Later, end-to-end verification from a fresh `git clone` went further and stopped services on purpose. That found three infrastructure bugs that every test and manual happy-path check had passed:
     - nginx kept a dead backend IP
     - a 23-second HTML 502
     - a category menu that never recovered
4. **The review pass: six AI reviewers, every finding checked before acting.**
   - It found a real bug in AI-written code that the tests only appeared to cover: `/api/products/0x10` returned product 16. NestJS's global validation converted the id to a number before the custom check ran.
   - It was confirmed with failing tests before fixing. About 20 other findings were fixed and 5 were rejected or deferred, with reasons, in [notes/ai-review.md](notes/ai-review.md).
   - When a reviewer proposed editing CLAUDE.md, the agent held the change for my approval instead of rewriting its own instructions.
5. **Where I overrode the AI.**
   - **Docker:** it installed Colima to avoid needing an admin password and licence acceptance. I preferred Docker Desktop, because that is what most reviewers will have, and had it remove Colima.
   - **Commits:** I asked for commits under my name only. It showed a plan, backed up, rewrote the history without the co-author lines, checked all 22 commits kept the same code, messages and dates, and force-pushed with a pinned lease.

## Where the AI got things wrong, and how it was caught

| What went wrong | How it was caught |
|---|---|
| The plan's substring search would have matched "men" inside "women's" | AI review of the plan, before coding |
| The plan assumed Jest; NestJS 12 needs ESM, where Jest is experimental | The scaffold failed to fit; the AI stopped and asked |
| 3 of the first 21 frontend tests failed: the AI's own test queries also matched the header's category menu | Running the tests; queries scoped to the page content, no app change |
| Tall product images stretched tiles to uneven heights | Clicking through the real app in a browser, which tests can't see |
| `setState` inside effects (extra renders); unhandled promises; a timeout error that dropped its cause | ESLint (type-aware and React hooks rules) after the code was written |
| Its own ESLint config broke parsing of the config files | Running lint |
| Copying `.env.example` would have pointed Docker's email at `localhost` | Thinking through the reviewer's setup while writing the Compose file |
| nginx cached the backend's IP at startup, so a restarted backend got 502 until nginx restarted; a stopped backend took 23 s to give an HTML 502 | Deliberately stopping and recreating containers during verification |
| The category menu disappeared for good if it failed to load once | Same failure testing |
| `/api/products/0x10` returned product 16; `1e1`, `007` and others were also accepted | The AI code-review agent; confirmed with failing tests |
| A misleading test: its name promised a 503, but it checked stale data | Reading the test while adding it; rewritten to test one thing |
| Time estimates for the time log were too long | Checked against the clock and the commit timestamps |

Every change was approved step by step, committed in small commits, and checked by lint, type check and tests before each commit and in CI. Each fix that came from a review or from failure testing has a test.

## Time spent

20–21 Nov 2026 (IST). Phases are taken from [notes/time-log.md](notes/time-log.md) and the commit timestamps. Time spent reading and approving each step is included.

| Phase | Time | What |
|---|---|---|
| Planning and setup | ~1 h 40 m (11:20–13:00) | Read the brief and plan, plugin setup, plan critique (11 changes), repo setup. **Includes ~30–60 m of machine setup:** installing Docker (Colima, then Docker Desktop) |
| Building | ~1 h (13:00–14:00) | Backend, frontend, ESLint rules and CI, Docker. Each step included its own tests and a run against the real Fake Store |
| Testing | ~10 m (14:00–14:10) | End-to-end verification from a fresh clone, with and without Docker, plus failure cases (3 fixes) |
| Reviewing | ~20 m (14:10–14:28) | AI review pass, about 20 fixes with tests, CLAUDE.md edits, commit history clean-up |
| Docs | ~10 m (14:28–14:35) | README, DECISIONS.md, AI_USAGE.md |
| UI polish | ~40 m (20 Nov ~22:25–22:30, 21 Nov ~08:00–08:35) | Sticky header; then a home page banner, category rows, livelier product cards and loading placeholders, with 3 new tests |
| **Total** | **~3 h 55 m** | Over the 2–3 h time-box, mostly because of machine setup, the verification and review passes, and the UI polish |
