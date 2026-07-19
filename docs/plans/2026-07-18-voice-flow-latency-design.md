# Voice Flow Latency Design

## Goal

Make the existing push-to-talk Voice Flow feel immediate while preserving its validated behavior: prepare background audio, focus the already-running Codex desktop app, focus the composer, hold Codex dictation, and release dictation when the QoLayer shortcut is released.

## Agreed behavior

- QoLayer must never launch Codex as part of Voice Flow.
- Codex is expected to already be running.
- When Codex is available, QoLayer should focus it without the current fixed open delay.
- When Codex is unavailable, QoLayer must fail closed and never send the dictation shortcut to another application.
- The QoLayer main window should appear with a small status message:
  - `Waiting for Codex`
  - `Open Codex, then hold Ctrl+Alt+Space again.`
- Voice Flow must continue to apply the configured background-audio mode before dictation:
  - leave audio unchanged,
  - lower background audio, or
  - mute background audio.
- Releasing the QoLayer shortcut during preparation must not leave the Codex dictation shortcut held.
- Exact chat navigation is out of scope.

## Interaction sequence

1. The user presses and holds `Ctrl+Alt+Space`.
2. QoLayer prepares background audio using the current Voice Flow setting.
3. QoLayer searches for an existing Codex window and focuses its composer.
4. After a short settle interval, QoLayer holds `Ctrl+Shift+D` while the user continues holding the QoLayer shortcut.
5. Releasing `Ctrl+Alt+Space` releases `Ctrl+Shift+D`.
6. If Codex cannot be focused, QoLayer stops before keyboard injection and shows the recovery message in its main window.

## Performance approach

Remove the unconditional Codex open action and its 600 ms delay. Keep only the shortest focus/composer settle interval that remains reliable. Avoid polling and cached native handles because Codex is expected to be running and those approaches add complexity without improving the normal path.

## Safety

- Do not send dictation keys unless Codex focus is confirmed.
- Re-check whether the hold is still requested after the asynchronous key press and release immediately if the user already stopped holding.
- Keep all native automation narrowly scoped to the recognized Codex window and the documented dictation shortcut.
- Do not add shell access, telemetry, credential access, network requests, or automatic Codex startup.

## Verification

- Unit-test the fast path, unavailable-Codex path, and release race.
- Run TypeScript typecheck, ESLint, Vitest, Vite build, Rust tests, Rust check, and available Rust formatting/lint checks.
- Launch one QoLayer development instance and validate push-to-talk manually with the user.
