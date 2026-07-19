# Voice Flow Latency Implementation Plan

**Goal:** Make push-to-talk dictation start quickly against an already-running Codex window, fail safely when Codex is unavailable, and preserve the user's original Windows output volume across repeated Voice Flow runs.

**Architecture:** Remove Codex launching from the Voice Flow service and treat confirmed window focus as a prerequisite for keyboard injection. Reuse the existing Tauri main window for recovery feedback, keep native automation narrowly scoped, and make audio-state capture idempotent until restoration.

**Tech Stack:** React 19, strict TypeScript, Vitest, Tauri 2, Rust, Windows APIs.

---

### Task 1: Specify the fast and safe Voice Flow service

**Files:**

- Modify: `src/features/voice-flow/voiceFlowService.test.ts`
- Modify: `src/features/voice-flow/voiceFlowService.ts`
- Modify: `src/features/voice-flow/controllers.ts`

**Steps:**

1. Add failing tests proving that Voice Flow prepares audio, focuses Codex directly, waits only for focus settling, and never calls a Codex opener.
2. Add a failing test proving that unconfirmed focus prevents both tap and hold keyboard injection, restores prepared audio, and asks the window controller to reveal QoLayer.
3. Add a failing hold-race test proving that a shortcut released while the asynchronous Codex key press is completing is immediately released again.
4. Run `node_modules\.bin\vitest.cmd run src/features/voice-flow/voiceFlowService.test.ts` and confirm the new tests fail.
5. Remove `CodexController` and the Codex-open delay from Voice Flow inputs.
6. Add `showQoLayer` to `WindowController`, fail closed on any unconfirmed Codex focus, and use a short 50 ms post-focus settle delay.
7. Re-check `shouldContinue()` after the asynchronous key press and release the Codex shortcut immediately if the user stopped holding.
8. Re-run the focused Vitest file and confirm it passes.

### Task 2: Expose safe recovery window behavior

**Files:**

- Modify: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/features/voice-flow/nativeControllers.ts`
- Modify: `src/features/voice-flow/nativeControllers.test.ts`

**Steps:**

1. Add parsing/controller tests for showing the QoLayer main window.
2. Make the existing tray window-showing function reusable and return a narrow `Result`.
3. Expose a `show_main_window` Tauri command and invoke it through `WindowController.showQoLayer`.
4. Run the focused native-controller tests.

### Task 3: Tighten Codex focus latency and recovery copy

**Files:**

- Modify: `src-tauri/src/window_focus.rs`
- Modify: `src/features/voice-flow/controllers.ts`
- Modify: `src/features/voice-flow/voiceFlowStatus.ts`
- Modify: `src/features/voice-flow/voiceFlowStatus.test.ts`
- Modify: `src/features/voice-flow/useVoiceFlow.ts`

**Steps:**

1. Add tests for the `waitingForCodex` status and recovery message.
2. Reduce the native foreground-to-composer-click settle interval from 150 ms to 75 ms.
3. Add the status `waitingForCodex` with: `Waiting for Codex. Open Codex, then hold Ctrl+Alt+Space again.`
4. Remove the unused Voice Flow Codex controller wiring.
5. Run the focused TypeScript and Rust tests.

### Task 4: Preserve the original audio state

**Files:**

- Modify: `src-tauri/src/audio.rs`

**Steps:**

1. Add a failing Rust unit test showing that a second prepare operation does not overwrite the first saved volume and mute state.
2. Replace unconditional audio-state saving with save-once semantics until `restore_audio` consumes the state.
3. Run `cargo test --manifest-path src-tauri\Cargo.toml audio` and confirm it passes.

### Task 5: Full verification and manual validation

**Steps:**

1. Run `node_modules\.bin\tsc.cmd --noEmit`.
2. Run `node_modules\.bin\eslint.cmd .`.
3. Run `node_modules\.bin\vitest.cmd run`.
4. Run `node_modules\.bin\prettier.cmd --check .` and format only touched files if required.
5. Run `node_modules\.bin\vite.cmd build`.
6. Run `cargo fmt --manifest-path src-tauri\Cargo.toml -- --check`, recording a toolchain-unavailable result if `rustfmt` is not installed.
7. Run `cargo clippy --manifest-path src-tauri\Cargo.toml -- -D warnings`, recording a toolchain-unavailable result if `clippy` is not installed.
8. Run `cargo test --manifest-path src-tauri\Cargo.toml` and `cargo check --manifest-path src-tauri\Cargo.toml`.
9. Ensure no stale QoLayer development process owns port 1420, then launch one `corepack pnpm desktop` instance.
10. Ask the user to validate fast push-to-talk, unavailable-Codex recovery, duck audio, mute audio, and manual restoration.
11. Commit only after successful real-world validation by the user.
