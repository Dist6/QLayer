# Changelog

All notable changes to QLayer are documented in this file.

## [0.1.0] - 2026-07-21

First public Windows release.

### Added

- Shortcut-driven push-to-talk Voice Flow for Codex and ChatGPT.
- Background audio Off, Lower, Mute, and exact restore behavior.
- Configurable global Voice Flow shortcut.
- Saved and recently discovered Chat Shortcuts.
- Voice destination selection by individual chat or Project.
- Localhost Manager with safe development-server classification, project identification, memory use, and uptime.
- Projects with local folders, linked chats, preferred ports, and predefined development actions.
- Windows tray behavior, optional launch at startup, and local-first settings.
- Portable Windows x64 release packaging with a SHA-256 checksum.

### Security

- Narrow Tauri commands with no arbitrary shell or process-control interface.
- Fail-closed window focus and keyboard automation.
- No telemetry, cloud sync, credential access, traffic interception, or proxy behavior.
