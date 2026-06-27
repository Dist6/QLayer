# QoLayer Codex Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow best-effort Codex focus step before Voice Flow sends the dictation shortcut.

**Architecture:** Voice Flow remains the orchestration boundary. React calls `startVoiceFlow`, the service calls a parameterless `WindowController.focusCodex()`, and native code exposes only a supported Codex focus command.

**Tech Stack:** Tauri 2, React, TypeScript, Vitest, Rust, Win32 APIs through the `windows` crate.

---

### Task 1: Voice Flow Focus State

**Files:**

- Modify: `src/features/voice-flow/controllers.ts`
- Modify: `src/features/voice-flow/voiceFlowService.ts`
- Test: `src/features/voice-flow/voiceFlowService.test.ts`
- Test: `src/features/voice-flow/voiceFlowStatus.test.ts`

- [x] Write failing tests for focus success before dictation.
- [x] Write failing tests for focus failure continuing to dictation.
- [x] Add focus statuses and `WindowController`.
- [x] Add focus step to the Voice Flow state machine.

### Task 2: Native Focus Adapter

**Files:**

- Modify: `src/features/voice-flow/nativeControllers.ts`
- Test: `src/features/voice-flow/nativeControllers.test.ts`
- Create: `src-tauri/src/window_focus.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/Cargo.toml`

- [x] Write failing tests for native focus payload parsing.
- [x] Add frontend `windowController` adapter with no arbitrary target arguments.
- [x] Add Windows-only native focus command for the supported Codex target.
- [x] Add Rust tests for Codex title matching where practical.

### Task 3: Docs and Verification

**Files:**

- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/privacy.md`

- [x] Document best-effort Codex focus before dictation.
- [x] Document that arbitrary window control is not exposed.
- [x] Run formatter, typecheck, lint, tests, build, and Rust checks.
