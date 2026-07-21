# Ctrl + Win Push-to-Talk Implementation Plan

**Goal:** Replace the `Ctrl+Alt+Space` default with a comfortable `Ctrl+Win` hold gesture that cannot type characters into Codex or ChatGPT.

**Architecture:** Keep the existing Tauri global-shortcut plugin for user-defined shortcuts that include a main key. Add a Windows-only, narrowly scoped low-level keyboard hook for the modifier-only `Ctrl+Win` default; it forwards every unrelated event immediately, suppresses only the active chord, and emits the existing start/stop Voice Flow actions. Migrate only the legacy default while preserving custom shortcuts.

**Tech Stack:** Rust, Windows `WH_KEYBOARD_LL`, Tauri 2 events, React, TypeScript, Vitest, Cargo tests.

---

### Task 1: Define and validate the modifier-only shortcut

**Files:**

- Modify: `src/features/global-hotkeys/globalHotkeyShortcut.test.ts`
- Modify: `src/features/global-hotkeys/globalHotkeyShortcut.ts`
- Modify: `src/features/global-hotkeys/globalHotkeyEvents.ts`

1. Add failing tests for canonical `Ctrl+Win`, its keycap labels, and rejection of other Windows-key combinations.
2. Run the focused Vitest file and verify failure.
3. Add the minimal special-case parser and capture behavior for `Ctrl+Win`.
4. Run the focused test and verify it passes.

### Task 2: Migrate the old default without overwriting customization

**Files:**

- Modify: `src/features/settings/defaultSettings.ts`
- Modify: `src/features/settings/settingsValidation.ts`
- Modify: `src/features/settings/settings.test.ts`

1. Add failing tests showing that new installs use `Ctrl+Win`, stored `Ctrl+Alt+Space` migrates, and custom shortcuts remain unchanged.
2. Run the focused settings tests and verify failure.
3. Add a narrow legacy-default migration in settings validation.
4. Run the focused tests and verify they pass.

### Task 3: Add the native Windows hold detector

**Files:**

- Create: `src-tauri/src/modifier_hotkey.rs`
- Modify: `src-tauri/src/global_hotkeys.rs`
- Modify: `src-tauri/src/main.rs`

1. Add unit tests for the pure Ctrl/Win chord state machine: Ctrl then Win starts once, repeated keydown is ignored, either release stops once, unrelated keys pass through, and injected events are ignored.
2. Run Cargo tests and verify the new expectations fail before implementation.
3. Implement a Windows-only `WH_KEYBOARD_LL` hook that stores no keystrokes, immediately forwards unrelated events, and suppresses only the active Ctrl/Win gesture.
4. Represent the active shortcut as either the native `Ctrl+Win` chord or an existing plugin shortcut, including safe transitions when the user customizes it.
5. Run Cargo tests and verify they pass.

### Task 4: Keep Codex dictation isolated from the physical Windows key

**Files:**

- Modify: `src-tauri/src/keyboard.rs`

1. Extend the input-plan test to require releasing the Windows modifier before `Ctrl+Shift+D` is pressed.
2. Add scan-code metadata for the extended Windows key.
3. Run the keyboard tests and then all Cargo tests.

### Task 5: Remove shortcut-specific copy and verify the product

**Files:**

- Modify: `src/features/voice-flow/voiceFlowService.ts`
- Modify: `src/features/voice-flow/voiceFlowLatency.test.ts`
- Modify: `src/features/voice-flow/voiceFlowStatus.ts`
- Modify: `src/features/voice-flow/voiceFlowStatus.test.ts`
- Modify: `src/features/chat-shortcuts/VoiceDestinationSelectorApp.tsx`

1. Replace hard-coded `Ctrl+Alt+Space` instructions with copy derived from the configured shortcut or neutral “Voice Flow shortcut” language.
2. Run frontend typecheck, lint, tests, and build.
3. Run Rust tests and `cargo check`.
4. Launch QLayer only with user approval, then validate press, focus, dictation hold, release, audio restore, and absence of Start-menu or typed-character leakage.
