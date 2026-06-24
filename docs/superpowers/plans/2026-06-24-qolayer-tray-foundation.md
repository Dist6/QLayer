# QoLayer Tray Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small, safe Windows system tray foundation without adding hotkeys, audio control, keyboard automation, or new product workflows.

**Architecture:** Tauri owns tray creation and menu dispatch. The tray module emits typed frontend events for Voice Flow actions, while React keeps using the existing Voice Flow service and controller boundaries.

**Tech Stack:** Tauri 2 tray/menu APIs, React, TypeScript, Vitest, Rust.

**Status:** Implemented in `feat: add safe system tray foundation`.

---

### Task 1: Frontend Tray Event Mapping

**Files:**

- Create: `src/features/tray/trayEvents.ts`
- Create: `src/features/tray/trayEvents.test.ts`

- [x] Add tests for accepted tray actions and invalid payload handling.
- [x] Implement typed event names, action names, and payload parsing.

### Task 2: Native Tray Module

**Files:**

- Create: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/main.rs`

- [x] Add a narrow tray module with Show QoLayer, Start Voice Flow, Restore Audio, and Quit.
- [x] Emit frontend events for Start Voice Flow and Restore Audio.
- [x] Show the main window for Show QoLayer when possible.
- [x] Quit cleanly through the Tauri app handle.
- [x] Store a minimal tray status that can be queried by the frontend.

### Task 3: React Wiring

**Files:**

- Modify: `src/app/App.tsx`
- Modify: `src/features/voice-flow/VoiceFlowPage.tsx`
- Add small feature files under `src/features/tray` if needed.

- [x] Listen for typed tray events in React.
- [x] Route Start Voice Flow and Restore Audio to the existing Voice Flow service.
- [x] Show a clear tray status in the UI.

### Task 4: Verification

- [x] Run formatting.
- [x] Run typecheck.
- [x] Run lint.
- [x] Run tests.
- [x] Run frontend build.
- [x] Run Rust check.
- [x] Commit with `feat: add safe system tray foundation`.
