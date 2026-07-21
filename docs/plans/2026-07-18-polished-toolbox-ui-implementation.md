# QLayer Polished Toolbox UI Implementation Plan

**Goal:** Apply the approved monochrome, flat QLayer interface and make the
Voice Flow global shortcut safely configurable without regressing the working
Codex / ChatGPT dictation flow.

**Architecture:** React owns presentation, shortcut capture, local persistence,
and content-driven window sizing. A narrow Tauri command validates and swaps the
registered global shortcut atomically; the native layer remains the source of
truth for the active shortcut. Existing Voice Flow focus, dictation, audio, chat
selection, tray, and autostart behavior remain unchanged.

**Tech Stack:** React 19, strict TypeScript, CSS, Tabler Icons, Tauri 2, Rust,
Vitest, Cargo tests.

---

## Task 1: Add a tested shortcut model and native registration swap

**Files:**

- Create: `src/features/global-hotkeys/globalHotkeyShortcut.ts`
- Create: `src/features/global-hotkeys/globalHotkeyShortcut.test.ts`
- Modify: `src/features/global-hotkeys/globalHotkeyClient.ts`
- Modify: `src-tauri/src/global_hotkeys.rs`
- Modify: `src-tauri/src/main.rs`

**Steps:**

1. Write TypeScript tests for converting keyboard events into canonical strings,
   keycap labels, modifier-only input, Escape cancellation, reserved numeric main
   keys, and the `Ctrl+Shift+D` conflict.
2. Implement the minimal pure shortcut helpers without DOM or `any`.
3. Write Rust tests for parsing supported shortcuts and rejecting shortcuts with
   no modifier, numeric main keys, the Windows key, or `Ctrl+Shift+D`.
4. Replace the fixed shortcut stored in `GlobalHotkeyState` with an owned label
   and native `Shortcut`.
5. Add `set_global_hotkey(shortcut)` which validates the candidate, unregisters
   the old shortcut, registers the candidate, and re-registers the old shortcut
   if the candidate is unavailable. Emit status only after the final native state
   is known.
6. Update action dispatch to compare events with the currently stored shortcut.
7. Add a typed frontend client for the command.
8. Run:

   ```powershell
   .\node_modules\.bin\vitest.cmd run src/features/global-hotkeys
   cargo test --manifest-path src-tauri\Cargo.toml global_hotkeys
   ```

## Task 2: Build the approved Voice Flow presentation

**Files:**

- Modify: `src/features/voice-flow/VoiceFlowDetailPanel.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.css`
- Add project asset: `src/assets/qolayer-logo.png`

**Steps:**

1. Put `Voice Flow` and its quiet state on one baseline and remove the eyebrow,
   permanent instructions, redundant restore copy, and card-like wrappers.
2. Add the flat `Voice shortcut` row, canonical keycaps, and edit action.
3. Render the audio control with a single sliding selection capsule positioned by
   mode. Keep buttons semantic and keyboard operable.
4. Render `Listening volume` as one flat aligned row only for `Lower`.
5. Replace the generated CSS logo with the supplied official QLayer logo.
6. Remove the sidebar selection stripe; selection uses neutral tonal contrast.
7. Increase body and supporting typography to readable sizes and enforce the
   approved monochrome palette, outer rounding, spacing, hover/focus states,
   short transitions, and reduced-motion behavior.
8. Run TypeScript, lint, and focused tests.

## Task 3: Capture, persist, and restore a custom shortcut

**Files:**

- Create: `src/features/global-hotkeys/GlobalHotkeyRecorder.tsx`
- Modify: `src/features/voice-flow/VoiceFlowDetailPanel.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/features/settings/settingsValidation.ts`
- Modify: `src/features/settings/settings.test.ts`
- Modify: `src/app/App.css`

**Steps:**

1. Add a recorder opened by the shortcut edit button. Capture the next complete
   modifier-plus-main-key chord; Escape cancels.
2. Disable save for unsupported or reserved chords and show one concise inline
   English error.
3. Invoke the native swap before persistence. Save settings only after success;
   on failure retain the old shortcut and native registration.
4. On app initialization, request registration of the persisted shortcut. If it
   cannot be registered, keep the native default and repair local settings to the
   returned active shortcut.
5. Validate stored hotkeys with the same supported grammar so corrupted settings
   recover safely.
6. Update the Voice Flow keycaps immediately after a successful change.
7. Run settings and global-hotkey tests.

## Task 4: Add content-driven window height

**Files:**

- Create: `src/features/toolbox/windowSizing.ts`
- Create: `src/features/toolbox/windowSizing.test.ts`
- Modify: `src/app/App.tsx`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src/app/App.css`

**Steps:**

1. Test the intended height for Voice Flow `Off` / `Mute`, Voice Flow `Lower`,
   Settings, empty tools, About, and Chat shortcuts.
2. Use `LogicalSize` and the current Tauri window only in the desktop runtime;
   browser/test contexts fail silently without affecting the UI.
3. Keep width fixed at the approved compact width and animate internal content
   disclosure. Do not fake OS window interpolation when Tauri cannot guarantee it.
4. Update main-window constraints to permit the approved heights while keeping it
   non-resizable.

## Task 5: Validate the complete change

Run each command separately:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd .
.\node_modules\.bin\vitest.cmd run
.\node_modules\.bin\prettier.cmd --check .
.\node_modules\.bin\vite.cmd build
cargo test --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
cargo fmt --manifest-path src-tauri\Cargo.toml -- --check
cargo clippy --manifest-path src-tauri\Cargo.toml --all-targets -- -D warnings
git diff --check
```

If `rustfmt` or `clippy` is unavailable in the active toolchain, report that exact
limitation. After automated checks pass, launch one desktop development instance
for user validation. Do not commit until the user validates the UI and working
Voice Flow shortcut.
