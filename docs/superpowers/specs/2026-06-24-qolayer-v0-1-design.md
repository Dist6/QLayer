# QoLayer v0.1 Foundation Design

## Goal

QoLayer v0.1 establishes a conservative, open-source-ready desktop foundation for a local-first companion app for coding assistant applications, starting with Codex.

## Product Scope

QoLayer v0.1 includes:

- A Tauri 2 desktop app using React, TypeScript, Vite, Tailwind CSS, and pnpm.
- A clean English-only app shell with Home, Codex, Voice Flow, Settings, Privacy, and About pages.
- A Codex integration foundation based on documented deep links.
- A Voice Flow foundation with explicit controller boundaries and clear unavailable states.
- Strongly typed local settings with validation and safe defaults.
- Local-only project documentation and open-source governance files.

QoLayer v0.1 includes a minimal system tray foundation. It does not include global hotkeys, keyboard automation, audio control, project launchers, prompt templates, usage dashboards, task inboxes, add-on marketplaces, telemetry, cloud sync, proxy behavior, credential reading, token reading, or browser cookie access.

## Architecture

The frontend is organized by feature:

- `src/app` owns the app shell, navigation, and route composition.
- `src/features/codex` owns Codex deep-link construction, Codex actions, and the Codex page.
- `src/features/voice-flow` owns the simple Voice Flow state machine, controller contracts, and Voice Flow page.
- `src/features/settings` owns defaults, validation, storage, and the Settings page.
- `src/features/privacy` and `src/features/about` own their static pages.
- `src/shared` holds only reused UI primitives and result types.

The native side stays narrow:

- `src-tauri` exposes only focused commands needed by v0.1.
- Native commands do not expose broad shell access, arbitrary command execution, credential access, token access, browser cookie access, network interception, or proxy behavior.

## Component Design

The app shell provides a sidebar-style navigation and a main content region. It uses feature pages as leaf components and does not contain business logic.

Shared UI primitives are minimal. Components are promoted to `src/shared/ui` only when reused, such as status chips, page headers, and buttons. Feature-specific layout stays inside the feature.

The UI is dark-only for v0.1, modern, compact, and developer-tool oriented. It avoids fake metrics and fake activity.

## Data Flow

Settings flow:

1. `defaultSettings` provides safe local defaults.
2. `parseStoredSettings` validates unknown stored JSON.
3. Invalid or corrupted values fall back to defaults.
4. `settingsStorage` persists only local preferences.

Codex flow:

1. UI calls feature actions.
2. `deepLinks` builds Codex URLs in one place.
3. A narrow Tauri command opens the URL.
4. Failures return user-friendly errors.

Voice Flow flow:

1. User clicks Start Voice Flow.
2. `VoiceFlowService` evaluates settings.
3. `AudioController` returns `NotImplemented` for duck and mute in v0.1.
4. `CodexController` opens Codex with a deep link.
5. `KeyboardController` returns `NotImplemented` for dictation automation in v0.1.
6. The state machine emits explicit statuses such as Ready, Opening Codex, Audio disabled, Audio ducked, Audio muted, Restored, and Failed.

No step silently no-ops. Planned native behavior is represented with explicit `NotImplemented` results and surfaced in the UI.

## Error Handling

Every controller returns a typed result. UI-facing messages distinguish between:

- Completed behavior.
- Planned but unavailable behavior.
- User-fixable failures.
- Unexpected failures.

The app does not claim a native feature works unless it is implemented and verified.

## Testing

Tests cover practical logic without snapshot noise:

- Codex deep-link builders.
- Settings defaults.
- Settings validation.
- Storage parsing for corrupted or partial data.
- Voice Flow state transitions and `NotImplemented` paths.

## Documentation

The repository includes:

- `README.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `AGENTS.md`
- `docs/architecture.md`
- `docs/privacy.md`
- `docs/roadmap.md`
- `docs/development.md`

Documentation states the project is unofficial and not affiliated with OpenAI, Anthropic, or any other coding assistant provider.

## Security Constraints

QoLayer v0.1:

- Stores no secrets.
- Reads no Codex auth files.
- Reads no browser cookies.
- Adds no telemetry.
- Adds no remote logging.
- Adds no cloud sync.
- Adds no proxy behavior.
- Uses minimal Tauri permissions.
- Keeps native commands focused and validated.

## Implementation Boundary

This design is intentionally conservative. The first native pass adds a minimal system tray. Later passes can add global hotkeys and audio control after the foundation is validated.
