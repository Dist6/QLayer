# Global Hotkey Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register `Ctrl+Alt+Space` as a narrow global shortcut that starts the existing Voice Flow workflow.

**Architecture:** Add a small native global hotkey module that registers the shortcut through Tauri's official global shortcut plugin, stores registration status, and emits typed frontend events. React reads status through a narrow client, maps it into the existing Quick Tools model, and starts Voice Flow through the existing hook/service path when the event arrives.

**Tech Stack:** Tauri 2, `tauri-plugin-global-shortcut`, React, TypeScript, Vitest.

---

### Task 1: Frontend Event and Status Mapping

**Files:**

- Create: `src/features/global-hotkeys/globalHotkeyEvents.ts`
- Create: `src/features/global-hotkeys/globalHotkeyEvents.test.ts`
- Modify: `src/features/quick-tools/quickTools.ts`
- Modify: `src/features/quick-tools/quickTools.test.ts`

- [x] Write failing tests for parsing hotkey action/status payloads.
- [x] Run focused tests and confirm they fail before implementation.
- [x] Implement typed event constants, parsers, and Quick Tool status mapping.
- [x] Run focused tests and confirm they pass.

### Task 2: Frontend Client and UI

**Files:**

- Create: `src/features/global-hotkeys/globalHotkeyClient.ts`
- Create: `src/features/global-hotkeys/GlobalHotkeysDetailPanel.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/features/quick-tools/QuickToolsPanel.tsx`
- Modify: `src/features/settings/SettingsPage.tsx`

- [x] Add a narrow client for `get_global_hotkey_status` and typed event listeners.
- [x] Add a compact Global Hotkeys detail view.
- [x] Wire global hotkey events to the existing Voice Flow start function.
- [x] Show registration status in Quick Tools and Settings without adding editing UI.

### Task 3: Native Global Shortcut

**Files:**

- Create: `src-tauri/src/global_hotkeys.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/Cargo.toml`

- [x] Add official Tauri global shortcut plugin dependency.
- [x] Register `Ctrl+Alt+Space` during setup.
- [x] Store and emit status without crashing if registration fails.
- [x] Emit a typed start Voice Flow event when the shortcut is pressed.

### Task 4: Docs and Verification

**Files:**

- Modify: `README.md`
- Modify: `docs/architecture.md`

- [x] Document the global hotkey foundation and remaining planned native work.
- [x] Run format, typecheck, lint, tests, build, and Rust checks.
- [x] Commit with `feat: add global hotkey foundation`.
