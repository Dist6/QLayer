# QLayer

A compact, local-first Windows companion for Codex and ChatGPT.

QLayer brings voice dictation, chat navigation, local development server visibility, and project context into a small tray utility designed for shortcut-first workflows.

QLayer is unofficial and is not affiliated with, endorsed by, or sponsored by OpenAI.

## Features

### Voice Flow

- Hold a configurable global shortcut to focus Codex or ChatGPT and use push-to-talk dictation.
- Choose the current chat, a saved chat, or a chat linked to a Project.
- Keep background audio unchanged, lower it to a chosen level, or mute it while speaking.
- Restore the previous Windows audio state when the shortcut is released.
- Fail safely when Codex or ChatGPT is not running.

### Chat Shortcuts

- Save Codex chats locally and open them through validated Codex deep links.
- Discover recent chats through the local Codex App Server integration when available.
- Remove a saved shortcut without modifying or deleting the Codex chat.

### Localhost Manager

- Detect local development servers and distinguish them from unknown local listeners.
- Show URL, port, server role, process, project identity, memory use, and uptime when safely available.
- Open only listeners classified as development servers in the default browser.
- Refresh manually or at a restrained interval that pauses while the tool is not visible.
- Never intercept traffic or terminate processes.

### Projects

- Group one local folder with linked Codex chats and preferred development ports.
- Compare preferred ports against servers detected by Localhost Manager.
- Send predefined Start Development or Stop Development messages to a chat selected for that action.
- Copy the fixed message to the clipboard when direct delivery is unavailable.
- Never run arbitrary commands or manage development processes directly.

### Windows utility

- Live in the Windows system tray and reopen with a double-click.
- Optionally start with Windows and remain available after the window is dismissed.
- Store preferences locally with no account or API key.

## Download

Download `QLayer-v0.1.0-windows-x64-portable.zip` from the GitHub Release for v0.1.0.

QLayer v0.1.0 is portable: extract the ZIP to a stable folder and run `QLayer.exe`. No installer or administrator access is required.

## Requirements

- Windows 10 or Windows 11
- x64 processor
- Microsoft Edge WebView2 Runtime
- Codex or ChatGPT for Windows for Voice Flow and chat actions

## Quick test

### Voice Flow

1. Open Codex or ChatGPT for Windows.
2. Optionally play audio in another application.
3. Hold the configured QLayer shortcut. The default is `Ctrl+Win`.
4. Select a destination if the chat selector appears.
5. Speak, then release the shortcut.
6. Confirm that dictation stops and the previous background audio state is restored.

### Localhost Manager

1. Start a local frontend or backend development server.
2. Open Localhost Manager in QLayer.
3. Refresh the list.
4. Confirm the detected port and any safely available process, project, memory, and uptime details.
5. Open a listener classified as a development server.

### Projects

1. Create a Project and select its local folder.
2. Link one or more saved or recently discovered chats.
3. Add the ports used by the project.
4. Select Start Development or Stop Development and choose a linked chat.
5. Confirm the actual server state through Localhost Manager.

## Privacy and safety

QLayer is local-first. It has no telemetry, advertising, cloud sync, remote logging, or analytics. It does not record audio, read prompts or chat transcripts, access credentials or tokens, read Codex authentication files, read browser cookies, intercept traffic, or proxy requests.

Localhost Manager inspects local listener and process metadata only. QLayer exposes no arbitrary shell, keyboard automation, process termination, or general window-control interface.

See [Privacy](docs/privacy.md), [Security](SECURITY.md), and [Architecture](docs/architecture.md).

## Supported platform

QLayer v0.1.0 supports Windows 10/11 x64. macOS and Linux are not currently supported.

## Known limitations

- The portable executable is unsigned, so Windows SmartScreen may show a warning.
- Moving `QLayer.exe` after enabling launch at startup can invalidate the saved startup path.
- Recent-chat discovery and direct Project action delivery depend on compatible local Codex integration behavior.
- Codex and ChatGPT are third-party applications whose UI and deep-link behavior may change.
- QLayer does not start, stop, restart, suspend, or terminate development server processes.
- Automatic updates are not included.

## Built with

- Tauri 2 and Rust
- React and TypeScript
- Vite and Tailwind CSS
- Native Windows APIs exposed through narrow Tauri commands
- Tabler Icons

## How Codex and GPT-5.6 were used

QLayer was developed collaboratively with Codex using GPT-5.6 for architecture, implementation, native Windows debugging, testing, UI refinement, privacy review, performance optimization, and release preparation. Product and safety decisions remained human-directed, including the shortcut-first interaction model, fail-closed automation, local-only data boundaries, and the decision not to expose direct process control.

See [OpenAI Build Week Development](docs/build_week.md) for the boundary between prior work and work completed during the event.

## Development

Install the prerequisites for Tauri development on Windows, then run:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

Run the desktop app:

```powershell
pnpm desktop
```

Build the portable release archive:

```powershell
pnpm desktop:portable
```

The generated ZIP and checksum are written to `release/` and are intentionally excluded from Git history.

See [Development](docs/development.md), [Testing](docs/testing.md), and [Contributing](CONTRIBUTING.md).

## License

QLayer is licensed under the GNU Affero General Public License v3.0 only (`AGPL-3.0-only`). See [LICENSE](LICENSE).
