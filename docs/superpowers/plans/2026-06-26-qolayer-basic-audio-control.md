# Basic Audio Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe Windows global audio duck/mute/restore support to the existing Voice Flow workflow.

**Architecture:** Keep React actions routed through `useVoiceFlow` and `VoiceFlowService`. Convert `AudioController` methods to async so the frontend controller can call narrow Tauri audio commands. Add one isolated Rust module for Windows Core Audio global endpoint volume state, with explicit unavailable/failed results and no shell access.

**Tech Stack:** React, TypeScript, Vitest, Tauri 2, Rust, Windows Core Audio through the `windows` crate.

---

### Task 1: Voice Flow Service Contract

**Files:**

- Modify: `src/features/voice-flow/controllers.ts`
- Modify: `src/features/voice-flow/voiceFlowService.ts`
- Modify: `src/features/voice-flow/voiceFlowService.test.ts`
- Modify: `src/features/voice-flow/voiceFlowStatus.ts`
- Modify: `src/features/voice-flow/voiceFlowStatus.test.ts`

- [x] Write failing tests for disabled, duck, mute, failed prepare, restore success, restore failure, and nothing-to-restore messages.
- [x] Run focused tests and confirm they fail before implementation.
- [x] Make `AudioController` async and update service orchestration/messages.
- [x] Run focused tests and confirm they pass.

### Task 2: Frontend Native Audio Controller

**Files:**

- Modify: `src/features/voice-flow/nativeControllers.ts`
- Modify: `src/features/voice-flow/VoiceFlowDetailPanel.tsx`

- [x] Map narrow Tauri audio command responses into `VoiceFlowStep` results.
- [x] Keep web/non-desktop fallback explicit as `Audio control is not available.`
- [x] Show compact Audio status in Voice Flow detail.

### Task 3: Windows Native Audio Module

**Files:**

- Create: `src-tauri/src/audio.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/Cargo.toml`

- [x] Add direct `windows` crate dependency with the minimal Core Audio/COM features.
- [x] Implement global endpoint state capture, duck to 20%, mute, restore, and nothing-to-restore handling.
- [x] Expose only `prepare_audio` and `restore_audio` commands.
- [x] Run `cargo check --manifest-path src-tauri/Cargo.toml` and fix compile issues.

### Task 4: Docs and Verification

**Files:**

- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/roadmap.md`

- [x] Document global Windows audio control and current limitations.
- [x] Run requested verification commands and direct equivalents where needed.
- [x] Commit with `feat: add basic audio control for voice flow`.
