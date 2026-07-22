# Security

## Supported versions

Security fixes target the current `0.1.x` release and the active `main` branch.

## Reporting a vulnerability

Use the repository's private GitHub security advisory flow. Do not publish credentials, private paths, chat identifiers, exploit details, or other sensitive information in a public issue.

Include the affected version, impact, reproduction steps, and any safe supporting material. Maintainers will acknowledge the report and coordinate remediation and disclosure when appropriate.

## Security boundaries

QLayer is local-first and intentionally must not:

- Collect telemetry or analytics.
- Add remote logging or cloud sync.
- Access credentials, tokens, or Codex authentication files.
- Read browser cookies or clipboard contents.
- Record audio or inspect chat transcripts.
- Intercept, proxy, or inspect network traffic contents.
- Expose arbitrary shell commands or direct process management.
- Expose general keyboard injection or arbitrary window control.

Native capabilities must remain narrow, validated, and covered by the minimum practical Tauri permissions. Localhost inspection is limited to listener and sanitized process metadata. The non-user-facing Project action prototype accepts only fixed messages and never approves or executes development commands directly.
