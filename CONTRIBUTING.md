# Contributing

QLayer is early-stage open-source software. Keep changes focused, explicit, and aligned with its local-first privacy model.

## Development principles

- Keep code modular and simple.
- Put feature code under `src/features/<feature-name>`.
- Put shared helpers under `src/shared`.
- Route native capabilities through focused Tauri commands or official plugins.
- Use strict TypeScript and avoid `any`.
- Do not add dead code, commented-out code, or unused abstractions.
- Keep UI, documentation, comments, and labels in English for v0.1.
- Add meaningful tests when practical.
- Keep permissions minimal.

Do not add telemetry, cloud sync, credential or token access, Codex authentication access, browser cookie access, traffic interception, proxy behavior, arbitrary shell execution, or broad process control.

## Before submitting changes

Run:

```powershell
pnpm format
pnpm typecheck
pnpm lint
pnpm test
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

For release-related changes, also build and smoke-test the exact portable archive:

```powershell
pnpm desktop:portable
```

Never include private logs, machine-specific paths, credentials, tokens, chat content, or generated build directories in a contribution.
