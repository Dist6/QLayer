# Architecture

QoLayer is a Tauri 2 desktop app with a React, TypeScript, Vite, and Tailwind frontend.

## Frontend

- `src/app` contains the compact app shell and top-level view composition.
- `src/features/quick-tools` contains the Quick Tools launcher model and UI.
- `src/features/codex` contains Codex deep links used by the integration selector.
- `src/features/voice-flow` contains controller contracts, native controller adapters, and the simple Voice Flow state machine.
- `src/features/settings` contains typed settings, defaults, validation, storage, and the compact Settings view.
- `src/features/about` contains the compact About and privacy summary view.
- `src/shared` contains reused UI primitives and result types only.

## Native

`src-tauri` is intentionally narrow. v0.1 exposes one validated command for opening a small allowlist of Codex deep links and one command for reading system tray status. The Codex command delegates to Tauri's official opener plugin after validation.

The system tray setup lives in `src-tauri/src/tray.rs`. Tray menu actions either show the main QoLayer window, quit the app, or emit a typed frontend event that React handles through the existing Voice Flow service.

Window lifecycle behavior stays native-side: a user close request hides the main window and keeps QoLayer running in the system tray. The app exits only through the tray Quit item.

QoLayer v0.1 does not expose broad shell access, arbitrary command execution, credential reading, token reading, browser cookie access, network interception, or proxy behavior.

## Voice Flow

Voice Flow is a simple state machine, not a workflow engine. It orchestrates:

1. Audio preparation.
2. Codex opening.
3. Optional dictation shortcut trigger.
4. Audio restore.

Audio control, audio restore, and keyboard automation return explicit `NotImplemented` results in v0.1.
