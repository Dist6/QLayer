# Privacy

QLayer is local-first.

v0.1 does not:

- Collect telemetry.
- Record audio.
- Upload prompts.
- Collect credentials or tokens.
- Read Codex auth files.
- Read browser cookies.
- Proxy traffic.
- Add remote logging.
- Add cloud sync.
- Expose arbitrary keyboard input or text typing.
- Expose arbitrary window control.

v0.1 stores local preferences, saved chat identifiers and labels, Project folder paths, opaque folder identities, and preferred port configuration. This data remains on the device.

Localhost Manager inspects local listeners and sanitized process metadata. Project detection may inspect only bounded, allowlisted local manifest metadata near a reliably identified process path. It does not inspect traffic contents.

The current Projects UI does not expose Start Development or Stop Development. Its internal prototype remains constrained to fixed messages and does not accept arbitrary commands, approve Codex actions automatically, or directly manage development processes. QLayer never reads clipboard contents.

Future capabilities that require extra permissions must be explicit and opt-in.
