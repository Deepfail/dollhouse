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

## Next Steps

- Wire in AI providers for richer copilot replies (currently falls back to simple guidance if no provider is configured).
- Expand scenario builder to support multi-character scenes with role/objective drafting.
