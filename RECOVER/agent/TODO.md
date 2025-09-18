# Agent TODO — FS-Unify Epic (auto-advance)

**Scope lock:** Governed by `AGENT_CONTRACT.md` and Issue **#FS-001**.  
**Execution mode:** Auto-advance through tasks in order. **Exactly one PR at a time**. Merge when CI is green, then start the next task immediately. If CI is red, fix it. **No scope creep.**
**CI gates:** Quality Gates must pass (tests + no local/sessionStorage).

**Branch name:** `feature/fs-unify-step-XX`  
**PR title:** `feat(step-XX): <short desc> (FS-001)`  
**Allowed work:** Storage + the specific UI items below. Do **not** touch FEED/explore/timeline.

---

## Task 1 — DB bootstrap (SQLite+OPFS)

Goal: Single persistence layer.

- Add `src/lib/db.ts` (open `opfs:/dollhouse/data.db`; `PRAGMA journal_mode=WAL; foreign_keys=ON`; create tables: `settings, api_keys, characters, chats, messages, convo_summaries, assets` + indexes).
- Add `src/lib/query.ts` (React Query client).
- Add `src/lib/uuid.ts`.
- Add `src/repo/characters.ts` with CRUD: `listCharacters, createCharacter, updateCharacter, deleteCharacter`.
- Make tests in `src/__tests__/fs-unify.spec.ts` pass.
  PR: `feat(step-01): sqlite-wasm + OPFS bootstrap + schema (FS-001)`

## Task 2 — Repos for chats/messages/assets/settings/api_keys

Goal: Full repo surface.

- Add `src/repo/{chats,messages,assets,settings,apiKeys}.ts` (CRUD + list by FK).
- Extend tests to assert required fns exist.
  PR: `feat(step-02): repositories for chats/messages/assets/settings/api_keys (FS-001)`

## Task 3 — Purge legacy storage

Goal: One source of truth.

- Remove all `localStorage`/`sessionStorage` and old file-store code; delete obsolete contexts; wire everything to repos.
- CI grep ban must pass.
  PR: `refactor(step-03): remove legacy storage and file-store (FS-001)`

## Task 4 — Wire character UI + instant updates

Goal: No refresh needed.

- Hook character create/edit UI to repos.
- **Invalidate React Query** on every write so new/edited characters render immediately.
  PR: `feat(step-04): character UI wired to repos + react-query invalidation (FS-001)`

## Task 5 — Single “Generate” + Guidance

Goal: One button that uses all character info.

- Replace per-section “regenerate” with **one Generate**.
- Add **Guidance** textarea in create/edit.
- Implement `lib/llm.ts::generateCharacterDraft()` (reads active preset + provider/key from DB), persist deltas, invalidate queries.
  PR: `feat(step-05): single Generate + Guidance; LLM dispatcher surface (FS-001)`

## Task 6 — Dialog scroll + device-frame

Goal: Popups scroll on mobile; keep device look.

- Ensure all `DialogContent` use `max-h-[90vh] overflow-y-auto overscroll-contain`; remove parent overflow traps; keep device-frame styling.
  PR: `feat(step-06): dialog mobile scrolling + device-frame normalization (FS-001)`

## Task 7 — Desktop shell (roster left, copilot right, resizable)

Goal: New main page scaffold.

- Use `react-resizable-panels`.
- Left: vertical profile roster (avatar, name, a few stats).
- Right: Copilot column; persist sizes in `settings`.
  PR: `feat(step-07): desktop shell with resizable roster/copilot (FS-001)`

## Task 8 — Copilot presets

Goal: Switch styles instantly.

- `settings.copilot_presets` (array `{id,name,systemPrompt,params}`) + `settings.current_preset`.
- UI switcher; LLM calls pull active preset automatically.
  PR: `feat(step-08): copilot presets + live switching (FS-001)`

## Task 9 — Chat flow + summarization

Goal: Persist messages + maintain running summary.

- On send: insert user → call model → insert assistant.
- After assistant: summarize (`convo_summaries` upsert) and show as subtitle/snippet.
  PR: `feat(step-09): chat flow + convo summarization (FS-001)`

## Task 10 — Assets (images) pipeline

Goal: Images saved + visible immediately.

- Save images to OPFS `/dollhouse/assets/{yy}/{mm}/{id}.png`.
- Insert `assets` row (`owner_type='character'|'message'`), invalidate related queries.
  PR: `feat(step-10): OPFS assets vault + reactive previews (FS-001)`

---

### Global acceptance (applies across tasks)

- **Zero** `localStorage`/`sessionStorage`.
- Every write invalidates relevant queries (characters/chats/messages/assets/settings).
- Mobile dialogs scroll; desktop shell present; presets switch live.
- API keys (OpenRouter/Venice) saved/used from DB.
- Images and new records appear **immediately** without refresh.
