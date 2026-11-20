# AI log

Running log of key prompts and AI mistakes, written as they happen. Source for AI_USAGE.md.
Tool: Claude Code (desktop app), model Claude Opus 5.5.

## 2026-11-20

- **Tooling setup prompt.** Asked Claude to install four plugins from `claude-plugins-official` (claude-code-setup, code-review, pr-review-toolkit, commit-commands), but to show what each installs (skills, agents, hooks, MCP servers) before installing, and not to guess names. It checked each plugin's manifest first: none adds hooks or MCP servers; `/commit-push-pr` pre-allows `git push`.
- **Plan review caught two gaps before any code.**
  - Substring search would make "men" match "women's clothing", which breaks "only see products that have text matching". Changed to word-start matching (PLAN.md assumption 3).
  - Docker was not installed, so `docker compose up`, the reviewer's main run path, could not be tested.
- **Overrode an AI choice.** Claude installed Colima to avoid needing an admin password and licence acceptance. I preferred Docker Desktop (what most reviewers will have), installed it myself and had Claude remove Colima and its Homebrew docker CLI.
- **Recommendations kept as recommendations.** claude-code-setup suggested hooks (block private files, tests before commit, Prettier), a `/verify-acceptance` skill, and no new subagents or MCP servers. None applied yet.
