# Agent Contract — Dollhouse (Epic: FS-Unify + UI)

## Allowed scope (MUST DO FIRST)

1. Replace ALL persistence with SQLite (WASM) + OPFS.
2. Delete legacy storage (localStorage + old file store). No migrations.
3. Wire React Query so writes invalidate and UI updates instantly.
4. UI changes explicitly listed in ISSUE #FS-001 (Generate+Guidance, dialog scroll, layout, presets).
5. Chats summarize after assistant replies; saved API keys used.

## Forbidden (PR will be auto-failed)

- Any work on FEED/Instagram UI, timelines, or “explore” tabs.
- New features not mentioned in #FS-001.
- Touching non-storage/non-UI files outside the allowed dirs.

## Allowed dirs for this epic

- src/lib/\*
- src/repo/\*
- src/hooks/\*
- src/components/(Character*, Dialog*, Layout*, Copilot*)
- src/pages/(index|characters|chat)\*

All other paths: **blocked**.
