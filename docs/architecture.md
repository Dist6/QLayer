# Architecture

QLayer is a Tauri 2 desktop app with a React, TypeScript, Vite, and Tailwind frontend.

## Frontend

- `src/app` contains the compact app shell and top-level view composition.
- `src/features/toolbox` contains the compact Quick Tools navigation, window sizing, and startup presentation.
- `src/features/codex` contains Codex deep links used by the integration selector.
- `src/features/global-hotkeys` contains typed global hotkey events, status parsing, the frontend client, and the compact Global Hotkeys view.
- `src/features/voice-flow` contains controller contracts, native controller adapters, and the simple Voice Flow state machine.
- `src/features/chat-shortcuts` contains saved Codex destinations, recent-chat discovery adapters, and the compact Voice Flow destination selector.
- `src/features/localhost-manager` contains sanitized localhost server contracts, classification, and presentation.
- `src/features/projects` contains validated local Project storage, folder/chat/port associations, detected-port selection, and the Projects views.
- `src/features/settings` contains typed settings, defaults, validation, storage, and the compact Settings view.
- `src/features/about` contains the compact About and privacy summary view.
- `src/shared` contains reused UI primitives and result types only.

## Native

`src-tauri` is intentionally narrow. Native capabilities are exposed as focused, typed commands for Codex deep links, tray state, global hotkeys, Windows audio, Codex focus, the allowlisted dictation shortcut, localhost inspection, and Project folder identification. QLayer never exposes a general shell or arbitrary process API.

The system tray setup lives in `src-tauri/src/tray.rs`. Tray menu actions either show the main QLayer window, quit the app, or emit a typed frontend event that React handles through the existing Voice Flow service.

The global hotkey setup lives in `src-tauri/src/global_hotkeys.rs`. The modifier-only `Ctrl+Win` default uses a narrowly scoped Windows hook, while configured shortcuts with a main key use Tauri's official global shortcut plugin. Both paths store a small registration status and emit typed press and release events that drive the Voice Flow lifecycle through the existing React service boundary.

The Windows audio setup lives in `src-tauri/src/audio.rs`. It uses Windows Core Audio to store the current global endpoint volume/mute state, lower or mute global system audio for Voice Flow, and restore the saved state on request. Audio control is global in v0.1, not per-app.

The keyboard automation setup lives in `src-tauri/src/keyboard.rs`. It validates the configured dictation shortcut against a small allowlist before using Windows input APIs. QLayer does not expose arbitrary keyboard input or text typing to the frontend.

The Codex focus setup lives in `src-tauri/src/window_focus.rs`. It exposes no arbitrary window target, title, process, or selector. The native side performs a best-effort Windows focus attempt for the supported Codex target only and reports when focus cannot be confirmed.

Window lifecycle behavior stays native-side: a user close request hides the main window and keeps QLayer running in the system tray. The app exits only through the tray Quit item.

Localhost inspection returns sanitized listener and resource metadata. Project identity uses an opaque fingerprint shared with Localhost Manager; a port match by itself never proves ownership.

A safety-bounded Project action prototype remains isolated in `src-tauri/src/project_actions.rs`, but the current Projects UI does not expose Start Development or Stop Development. The boundary accepts only fixed messages from validated Project metadata; it never accepts an arbitrary prompt or command, approves Codex operations automatically, or manages development processes directly.

QLayer v0.1 does not expose broad shell access, arbitrary command execution, arbitrary window control, credential reading, token reading, browser cookie access, network interception, or proxy behavior.

## Voice Flow

Voice Flow is a simple state machine, not a workflow engine. It orchestrates:

1. Audio preparation.
2. Optional chat or Project-chat selection.
3. Best-effort Codex or ChatGPT focus.
4. Dictation shortcut hold.
5. Dictation release and audio restore.

Voice Flow remains shortcut-driven and preserves its push-to-talk lifecycle. The destination selector offers `Chats | Projects`; Projects mode navigates from a Project to one of its linked chats, then reuses the existing targeted Voice Flow path. Only the last selector mode is remembered. No chat is treated as authoritative or selected permanently.

## Projects

A Project groups one user-selected local folder, linked Codex chats, structured preferred ports, and verified localhost state. Project data uses defensive versioned local storage. Deleting a Project removes only its QLayer configuration.

The current Projects UI focuses on folder context, linked chats, detected development servers, and preferred-port status. Start Development and Stop Development are not exposed. Actual server state always comes from Localhost Manager.
