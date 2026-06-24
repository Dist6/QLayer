# Development

## Commands

Install dependencies:

```sh
pnpm install
```

Run frontend development server:

```sh
pnpm dev
```

Run desktop development app:

```sh
pnpm desktop
```

Run tests:

```sh
pnpm test
```

Run TypeScript checks:

```sh
pnpm typecheck
```

Run lint:

```sh
pnpm lint
```

Run Rust checks:

```sh
pnpm rust:check
```

## Project Rules

- Keep feature code under `src/features/<feature-name>`.
- Keep shared helpers under `src/shared`.
- Keep native and system code under `src-tauri`.
- Keep Tauri commands focused and validated.
- Keep tray actions routed through typed frontend events when they need UI-side workflows.
- Do not add telemetry, cloud sync, credential access, token access, browser cookie access, or proxy behavior.
- Keep UI text English-only for v0.1.
