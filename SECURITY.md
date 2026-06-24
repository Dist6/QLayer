# Security

## Supported Versions

QoLayer is pre-1.0 software. Security fixes target the active development branch.

## Reporting a Vulnerability

Use the repository security advisory flow once the public repository is available. Until then, contact the maintainers privately.

## Security Model

QoLayer v0.1 is local-first and conservative:

- No telemetry.
- No remote logging.
- No cloud sync.
- No credential or token access.
- No Codex auth file access.
- No browser cookie access.
- No traffic interception.
- No proxy behavior.
- No arbitrary command execution.

Native capabilities should stay narrow and purpose-specific.
