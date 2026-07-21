# Privacy

QoLayer is local-first.

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

Predefined Project actions are sent only to the Codex chat selected by the user through the local Codex integration. QLayer does not accept arbitrary commands, does not approve Codex actions automatically, and does not directly manage development processes. When delivery is unavailable, QLayer can write the fixed action message to the clipboard; it never reads clipboard contents.

Future capabilities that require extra permissions must be explicit and opt-in.
