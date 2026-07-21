# QLayer Codex Dictation Shortcut Plan

## Goal

Add a narrow keyboard automation path that sends the configured Codex dictation shortcut after Voice Flow opens Codex.

## Constraints

- Only allow supported dictation shortcuts.
- Do not expose arbitrary keyboard input or text typing.
- Keep Voice Flow as the orchestration boundary.
- Keep native code isolated under `src-tauri`.
- Do not add Codex window focusing, per-app audio, dashboards, launchers, or marketplace features.

## Steps

- [x] Update Voice Flow tests for dictation success, failure, and unavailable behavior.
- [x] Add a small native keyboard module with shortcut validation and Windows key sending.
- [x] Wire the frontend keyboard controller to the native command.
- [x] Update Voice Flow status copy and compact UI status handling.
- [x] Update README and architecture docs.
- [x] Run verification checks.
