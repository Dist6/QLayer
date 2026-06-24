# Quick Tools Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Quick Tools so top-level entries are user-facing feature modules, with Voice Flow actions moved into a compact detail view.

**Architecture:** Keep the app as a small local view-state machine, not a router. Keep the existing Voice Flow service/controller boundary and add small typed helpers for Quick Tool navigation and Voice Flow display messages.

**Tech Stack:** Tauri 2, React, TypeScript, Vite, Tailwind CSS, Vitest.

---

### Task 1: Quick Tools Model

**Files:**

- Modify: `src/features/quick-tools/quickTools.ts`
- Modify: `src/features/quick-tools/quickTools.test.ts`

- [x] Write failing tests for the top-level modules: Voice Flow, Global Hotkeys, Add-ons.
- [x] Add descriptions and a typed target mapping for opening Voice Flow or planned detail views.
- [x] Verify the focused Quick Tools tests pass.

### Task 2: Voice Flow Detail

**Files:**

- Create: `src/features/voice-flow/VoiceFlowDetailPanel.tsx`
- Create: `src/features/voice-flow/voiceFlowStatus.ts`
- Test: `src/features/voice-flow/voiceFlowStatus.test.ts`

- [x] Write failing tests for human Voice Flow messages.
- [x] Add a compact detail panel with Back, Start Voice Flow, Restore Audio, and short settings/status rows.
- [x] Keep Restore Audio as an explicit unavailable native path.

### Task 3: App View State

**Files:**

- Modify: `src/app/App.tsx`
- Modify: `src/features/quick-tools/QuickToolsPanel.tsx`
- Modify: `src/app/App.css`

- [x] Replace quick tool inline actions with view navigation.
- [x] Add `voiceFlow` and `plannedTool` views.
- [x] Keep tray actions working through the Voice Flow service.

### Task 4: Docs and Verification

**Files:**

- Modify: `README.md`
- Modify: `docs/architecture.md`

- [x] Update docs to say Quick Tools are module entries.
- [x] Run the requested checks, using direct equivalents if pnpm script PATH still fails.
- [x] Commit with `refactor: organize quick tools as feature modules`.
