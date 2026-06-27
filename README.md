# QoLayer

Quality-of-life tools for coding assistant apps.

QoLayer is an unofficial, local-first desktop app that adds focused quality-of-life tools around coding assistant applications, starting with Codex.

QoLayer is not affiliated with, endorsed by, or sponsored by OpenAI, Anthropic, or any other coding assistant provider.

## Current v0.1 Scope

- Tauri 2 desktop foundation with React, TypeScript, Vite, and Tailwind CSS.
- Compact Quick Tools launcher with feature modules, plus secondary Settings and About views.
- Voice Flow and Global Hotkeys are active foundation modules; Add-ons are planned.
- Global Hotkeys registers `Ctrl+Alt+Space` to start the existing Voice Flow workflow.
- The Voice Flow button and `Ctrl+Alt+Space` run the same workflow.
- Voice Flow can globally lower, mute, and restore Windows system audio.
- Voice Flow makes a best-effort attempt to focus Codex before dictation.
- Voice Flow can send the configured Codex dictation command, such as `Ctrl+M`, after Codex opens.
- Codex deep-link actions for opening Codex, Codex settings, and a new Codex thread.
- Minimal system tray menu for showing QoLayer, starting Voice Flow, restoring audio, and quitting.
- Compact tray utility window: closing the window hides it, while Quit from the tray exits the app.
- Strongly typed local settings with validation and safe defaults.
- Voice Flow keeps explicit unavailable states when native actions cannot run safely.

## What QoLayer Is Not

QoLayer v0.1 is not an AI model client, prompt launcher, project launcher, usage dashboard, task inbox, add-on marketplace, telemetry tool, analytics tool, cloud sync client, or proxy.

## Privacy Model

QoLayer is local-first. v0.1 does not collect telemetry, upload prompts, record audio, collect credentials or tokens, read Codex auth files, read browser cookies, proxy traffic, or add remote logging. It stores only local preferences.

## Current Limitations

The following are intentionally not implemented in v0.1:

- Custom hotkey editing.
- Arbitrary keyboard input or text typing.
- Dictation shortcuts outside the small allowlist.
- Arbitrary window control.
- Per-app audio control.
- Advanced or guaranteed Codex window focusing.
- Auto-update.
- Code signing.
- Installers.
- macOS support.

Unavailable native features return explicit `NotImplemented` results instead of silently no-oping.

## Development Setup

Requirements:

- Node.js
- pnpm
- Rust
- Tauri platform prerequisites for Windows

Install dependencies:

```sh
pnpm install
```

Run the web frontend:

```sh
pnpm dev
```

Run the desktop app:

```sh
pnpm desktop
```

Run tests:

```sh
pnpm test
```

Run checks:

```sh
pnpm typecheck
pnpm lint
pnpm rust:check
```

Build:

```sh
pnpm build
pnpm desktop:build
```

Early builds are unsigned.

## License

QoLayer is licensed under AGPL-3.0-only.
