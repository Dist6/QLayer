# Contributing

QoLayer is early-stage open-source software. Keep changes small, explicit, and aligned with the local-first privacy model.

## Development Principles

- Keep code modular and simple.
- Prefer focused files over large mixed-responsibility files.
- Do not add dead code.
- Do not leave commented-out old code.
- Do not add unused abstractions.
- Keep UI text in English for v0.1.
- Use strict TypeScript.
- Avoid `any`.
- Add meaningful tests when practical.

## Before Submitting Changes

Run:

```sh
pnpm format
pnpm typecheck
pnpm lint
pnpm test
pnpm rust:check
```

Do not add telemetry, cloud sync, credential access, token access, browser cookie access, proxy behavior, or broad native command execution.
