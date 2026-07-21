# Testing

## Automated checks

Run from the repository root on Windows:

```powershell
pnpm install --frozen-lockfile
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

Build the exact portable artifact with:

```powershell
pnpm desktop:portable
```

## Release smoke test

Test the executable extracted from the generated ZIP, not the development build.

- QLayer launches without administrator access.
- The correct window and tray icons appear.
- Double-clicking the tray icon opens QLayer.
- Dismissing the window keeps QLayer in the tray when configured.
- Optional launch at startup works from a stable executable location.
- Voice Flow Off leaves background audio unchanged.
- Voice Flow Lower restores the exact prior volume.
- Voice Flow Mute restores the exact prior mute and volume state.
- Releasing the shortcut always releases Codex dictation.
- Codex closed, minimized, and ChatGPT-hosted Codex states fail or focus safely.
- Chat Shortcuts open only validated Codex destinations.
- Localhost Manager handles zero, one, and multiple listeners.
- A listener disappearing during refresh is removed gracefully.
- Only classified development servers expose the open action.
- Projects link chats and compare preferred ports without directly controlling processes.
- Settings survive a restart and remain local.

Record any limitation discovered during this test in the README and release notes before publishing.
