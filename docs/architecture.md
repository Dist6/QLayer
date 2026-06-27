# Architecture

QoLayer is a Tauri 2 desktop app with a React, TypeScript, Vite, and Tailwind frontend.

## Frontend

- `src/app` contains the compact app shell and top-level view composition.
- `src/features/quick-tools` contains the Quick Tools module list and navigation mapping. Top-level Quick Tools are user-facing modules, not internal tray or restore actions.
- `src/features/codex` contains Codex deep links used by the integration selector.
- `src/features/global-hotkeys` contains typed global hotkey events, status parsing, the frontend client, and the compact Global Hotkeys view.
- `src/features/voice-flow` contains controller contracts, native controller adapters, and the simple Voice Flow state machine.
- `src/features/settings` contains typed settings, defaults, validation, storage, and the compact Settings view.
- `src/features/about` contains the compact About and privacy summary view.
- `src/shared` contains reused UI primitives and result types only.

## Native

`src-tauri` is intentionally narrow. v0.1 exposes one validated command for opening a small allowlist of Codex deep links, one command for reading system tray status, one command for reading global hotkey registration status, two commands for global audio prepare/restore, and one command for sending an allowlisted Codex dictation shortcut. The Codex command delegates to Tauri's official opener plugin after validation.

The system tray setup lives in `src-tauri/src/tray.rs`. Tray menu actions either show the main QoLayer window, quit the app, or emit a typed frontend event that React handles through the existing Voice Flow service.

The global hotkey setup lives in `src-tauri/src/global_hotkeys.rs`. It uses Tauri's official global shortcut plugin to register `Ctrl+Alt+Space`, stores a small registration status, and emits a typed frontend event that starts Voice Flow through the existing React service boundary.

The Windows audio setup lives in `src-tauri/src/audio.rs`. It uses Windows Core Audio to store the current global endpoint volume/mute state, lower or mute global system audio for Voice Flow, and restore the saved state on request. Audio control is global in v0.1, not per-app.

The keyboard automation setup lives in `src-tauri/src/keyboard.rs`. It validates the configured dictation shortcut against a small allowlist before using Windows input APIs. QoLayer does not expose arbitrary keyboard input or text typing to the frontend.

Window lifecycle behavior stays native-side: a user close request hides the main window and keeps QoLayer running in the system tray. The app exits only through the tray Quit item.

QoLayer v0.1 does not expose broad shell access, arbitrary command execution, credential reading, token reading, browser cookie access, network interception, or proxy behavior.

## Voice Flow

Voice Flow is a simple state machine, not a workflow engine. It orchestrates:

1. Audio preparation.
2. Codex opening.
3. Optional dictation shortcut trigger.
4. Audio restore.

Voice Flow is the first active Quick Tool module. Global Hotkeys starts Voice Flow with `Ctrl+Alt+Space`. Windows global audio duck, mute, and restore are available through the existing Voice Flow audio controller. The configured Codex dictation shortcut is sent through the existing keyboard controller after Codex opens. Per-app audio control, hotkey editing, arbitrary keyboard input, and reliable Codex window focusing remain planned.
