# Compact Tray Utility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make QLayer behave like a compact tray-based utility instead of a large dashboard.

**Architecture:** Keep native window lifecycle and tray behavior in `src-tauri`, expose only typed tray status/action events to React, and keep Voice Flow behavior inside its service/controller boundary. Compact the existing UI shell without adding product surfaces.

**Tech Stack:** Tauri 2, React, TypeScript, Vite, Tailwind CSS, Vitest.

---

### Task 1: Tray and Window Lifecycle

**Files:**

- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/src/tray.rs`
- Modify: `src-tauri/tauri.conf.json`

- [x] Add close-to-tray behavior with Tauri's close-request event.
- [x] Keep Quit as the only full application exit path.
- [x] Restore and focus the main QLayer window from the tray.
- [x] Keep tray initialization failure non-fatal.

### Task 2: Typed Tray Status Events

**Files:**

- Modify: `src/features/tray/trayEvents.ts`
- Modify: `src/features/tray/trayClient.ts`
- Modify: `src/features/tray/trayEvents.test.ts`

- [x] Add a typed tray status event name.
- [x] Parse status payloads defensively.
- [x] Listen for native status updates in React.

### Task 3: Compact Utility UI

**Files:**

- Modify: `src/app/App.tsx`
- Modify: `src/app/App.css`
- Modify: feature page copy only where needed.

- [x] Replace wide sidebar layout with compact top navigation.
- [x] Set the Tauri default window near 420 by 600.
- [x] Keep all app views English-only and present.

### Task 4: Voice Flow Messaging

**Files:**

- Modify: `src/features/voice-flow/voiceFlowService.ts`
- Modify: `src/features/voice-flow/nativeControllers.ts`
- Modify: `src/features/voice-flow/voiceFlowService.test.ts`

- [x] State that Codex opened.
- [x] State that audio control is planned.
- [x] State that dictation automation is planned.
- [x] Keep restore audio as explicit `NotImplemented`.

### Task 5: Verification

- [x] Run requested `pnpm` scripts.
- [x] Use direct equivalents if script PATH cannot resolve local tools.
- [x] Run `cargo check --manifest-path src-tauri/Cargo.toml`.
- [x] Commit with `fix: make QLayer a compact tray utility`.
