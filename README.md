# Dollhouse — Character-Driven Dating Sim

This project has been rebuilt into a focused dating-sim chat experience.
You manage your roster of girls, chat with them in real time, and rely on
the Girl Manager copilot to craft scenarios, tune stats, and generate new
characters on demand.

## Features

- **Character roster.** Quickly browse your girls, inspect personalities, and jump back into existing chats.
- **Immersive chat stage.** A streamlined conversation panel with session switching, stat callouts, and a modern message composer.
- **Girl Manager Copilot.** Sidebar assistant powered by existing hooks (`useChat`, `useAutoCharacterCreator`, `useQuickActions`) that can:
  - generate new girls
  - recommend scene setups
  - execute house-wide quick actions
  - hold a planning conversation to keep scenarios on track
- **Behavior analysis engine.** Every user message now runs through an AI-driven analysis pipeline that assigns nuanced behavior states, updates character memories, and posts actionable summaries back into the chat.
- **Storage bootstrap.** The app waits for the unified storage layer before rendering so your roster and sessions load cleanly.

## Getting Started

```powershell
npm install
npm run dev
```

Open the local URL that Vite prints (usually <http://localhost:5173>) to explore the new experience.

## Development Notes

- Core UI lives in `src/components/DatingSimShell.tsx`.
- The Girl Manager sidebar logic sits in `src/components/GirlManagerSidebar.tsx`.
- Storage is initialized inside `src/App.tsx` via `initStorage()`.
- Legacy components (HouseView, SceneInterface, etc.) remain in the repo for reference but are no longer rendered.

## Behavior Analysis Overview

- User messages trigger `useChat.sendMessage`, which now calls `analyzeBehavior` to evaluate the latest conversation slice.
- Analysis results apply clamped stat and progression deltas, refresh each character's `behaviorProfile`, and persist relationship memories.
- A rich `[Analysis]` system message is inserted with conversation context, per-character behavior summaries, and suggested follow-up actions for the player.
- When the AI response is unavailable, a heuristic fallback still produces safe, conservative updates so the loop never stalls.

## Next Steps

- Wire in AI providers for richer copilot replies (currently falls back to simple guidance if no provider is configured).
- Expand scenario builder to support multi-character scenes with role/objective drafting.
