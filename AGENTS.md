# Agent Instructions

These rules apply to future Codex sessions working on QLayer.

- Keep code modular and simple.
- Do not add dead code.
- Do not leave commented-out code.
- Do not add unused abstractions.
- Do not add telemetry.
- Do not add cloud sync.
- Do not access credentials or tokens.
- Do not read Codex auth files.
- Do not read browser cookies.
- Do not add network requests unless explicitly requested.
- Prefer small files and focused modules.
- Use strict TypeScript.
- Avoid `any`.
- Every feature should live under `src/features/<feature-name>`.
- Shared utilities go under `src/shared`.
- Native/system code goes through Tauri commands or official Tauri plugins.
- Keep Tauri permissions minimal.
- Do not expose broad shell access or arbitrary command execution.
- Every new feature needs basic tests when practical.
- UI, docs, comments, labels, and README content must stay in English for v0.1.
- After changes, run typecheck, lint, tests, formatters, and relevant Rust checks.
