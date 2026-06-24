# QoLayer v0.1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the conservative v0.1 foundation for QoLayer as a local-first desktop companion app for Codex.

**Architecture:** Create a Tauri 2 + React + TypeScript + Vite app with feature-local modules, narrow native commands, strongly typed settings, and a simple Voice Flow state machine. Keep unavailable native behavior explicit through typed `NotImplemented` results.

**Tech Stack:** Tauri 2, React, TypeScript, Vite, Tailwind CSS, Rust, pnpm, Vitest, ESLint, Prettier.

---

### Task 1: Project Scaffold

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`

- [ ] Create a Tauri 2 React/Vite/TypeScript scaffold.
- [ ] Add Tailwind, ESLint, Prettier, Vitest, and strict TypeScript configuration.
- [ ] Keep Tauri permissions narrow and expose only the commands required by v0.1.

### Task 2: Typed Settings

**Files:**

- Create: `src/features/settings/settingsTypes.ts`
- Create: `src/features/settings/defaultSettings.ts`
- Create: `src/features/settings/settingsValidation.ts`
- Create: `src/features/settings/settingsStorage.ts`
- Test: `src/features/settings/settings.test.ts`

- [ ] Write failing tests for defaults, validation, corrupted JSON parsing, and partial stored settings.
- [ ] Implement strict settings types, safe defaults, validation, and local storage parsing.
- [ ] Verify tests pass.

### Task 3: Codex Deep Links

**Files:**

- Create: `src/features/codex/deepLinks.ts`
- Create: `src/features/codex/codexController.ts`
- Test: `src/features/codex/deepLinks.test.ts`

- [ ] Write failing tests for `codex://`, `codex://settings`, and `codex://threads/new`.
- [ ] Implement deep-link builders in one module.
- [ ] Implement a controller that delegates opening to the narrow native command.
- [ ] Verify tests pass.

### Task 4: Voice Flow State Machine

**Files:**

- Create: `src/shared/result.ts`
- Create: `src/features/voice-flow/controllers.ts`
- Create: `src/features/voice-flow/voiceFlowService.ts`
- Test: `src/features/voice-flow/voiceFlowService.test.ts`

- [ ] Write failing tests for disabled audio, NotImplemented audio, Codex open failure, and restore behavior.
- [ ] Implement controller interfaces and a simple service/state-machine function.
- [ ] Verify tests pass.

### Task 5: App Shell and Pages

**Files:**

- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/navigation.ts`
- Create: `src/app/App.css`
- Create: `src/shared/ui/PageHeader.tsx`
- Create: `src/shared/ui/StatusChip.tsx`
- Create: feature page components for Home, Codex, Voice Flow, Settings, Privacy, and About.

- [ ] Implement the dark, English-only developer-tool UI.
- [ ] Wire settings state and Voice Flow actions into the UI.
- [ ] Ensure unavailable native behavior is visible and understandable.

### Task 6: Documentation

**Files:**

- Create: `README.md`
- Create: `LICENSE`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `AGENTS.md`
- Create: `docs/architecture.md`
- Create: `docs/privacy.md`
- Create: `docs/roadmap.md`
- Create: `docs/development.md`

- [ ] Document scope, privacy model, limitations, development workflow, security constraints, and roadmap.
- [ ] Include the unofficial project disclaimer.
- [ ] Keep docs aligned with the actual implemented v0.1 behavior.

### Task 7: Verification

- [ ] Run formatting.
- [ ] Run TypeScript typecheck.
- [ ] Run lint.
- [ ] Run tests.
- [ ] Run Rust checks where practical.
- [ ] Fix any issues found by checks.
