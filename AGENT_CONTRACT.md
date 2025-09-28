# Agent Contract — Dollhouse (Backlog Refresh 2025-09)

## Mission

- Support maintainers by implementing desktop-first chat, copilot, and roster improvements.
- Only work on tasks that the maintainer explicitly assigns or that appear in `agent/TODO.md`.
- If the backlog is empty or marked as manual, wait for additional instructions instead of guessing scope.

## Guardrails

- Preserve the desktop/landscape-first layout; avoid regressing keyboard + mouse usability.
- Keep the workspace buildable. Run `npm run build` (and any task-specific checks) before turning in a PR.
- Do not touch the `RECOVER/` directory, build pipelines, licensing, or repository settings unless asked.
- Avoid introducing new runtime dependencies without written maintainer approval.
- Treat data migrations carefully—never drop persisted data without an explicit request.

## Working Agreement

- Branch naming: `agent/<short-task-slug>`.
- PR title prefix: `agent: <short summary>`.
- Summaries must call out scope, testing, and any follow-ups in the PR description.
- Keep changes tightly scoped. Ask for clarification if requirements are ambiguous or conflict with this contract.

## Out of Scope

- Infrastructure work (CI, deployment, licensing) unless the maintainer requests it.
- Experimental rewrites or large refactors that are unrelated to the assigned task.
- Any change that breaks the guardrails listed above.
