# Development

## Requirements

- Windows 10 or Windows 11 x64
- Node.js 22
- pnpm 10.30.3
- Stable Rust with `rustfmt` and `clippy`
- Tauri 2 Windows prerequisites and Microsoft Edge WebView2 Runtime

Install the Rust quality components once:

```powershell
rustup component add rustfmt clippy
```

## Commands

Install dependencies:

```powershell
pnpm install --frozen-lockfile
```

Run the frontend or desktop development app:

```powershell
pnpm dev
pnpm desktop
```

Run all routine checks:

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

Create the portable Windows release:

```powershell
pnpm desktop:portable
```

The command builds the release executable, creates `release/QLayer-v0.1.0-windows-x64-portable.zip`, and writes `release/SHA256SUMS.txt`. Generated release files are not committed.

## Project rules

- Keep feature code under `src/features/<feature-name>`.
- Keep shared helpers under `src/shared`.
- Keep native and system code under `src-tauri`.
- Keep Tauri commands focused and validated.
- Keep tray actions routed through typed frontend events when they need UI-side workflows.
- Preserve local-only storage and minimum permissions.
- Keep UI and documentation text in English for v0.1.
