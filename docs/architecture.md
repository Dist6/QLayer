# Architecture

QoLayer is a Tauri 2 desktop app with a React, TypeScript, Vite, and Tailwind frontend.

## Frontend

- `src/app` contains the app shell, navigation, and page composition.
- `src/features/codex` contains Codex deep links and Codex UI.
- `src/features/voice-flow` contains controller contracts, native controller adapters, and the simple Voice Flow state machine.
- `src/features/settings` contains typed settings, defaults, validation, storage, and Settings UI.
- `src/features/privacy` and `src/features/about` contain static product pages.
- `src/shared` contains reused UI primitives and result types only.

## Native

`src-tauri` is intentionally narrow. v0.1 exposes one validated command for opening a small allowlist of Codex deep links. The command delegates to Tauri's official opener plugin after validation.

QoLayer v0.1 does not expose broad shell access, arbitrary command execution, credential reading, token reading, browser cookie access, network interception, or proxy behavior.

## Voice Flow

Voice Flow is a simple state machine, not a workflow engine. It orchestrates:

1. Audio preparation.
2. Codex opening.
3. Optional dictation shortcut trigger.
4. Audio restore.

Audio control and keyboard automation return explicit `NotImplemented` results in v0.1.
