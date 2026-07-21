# Localhost Server Row Refinement Implementation Plan

**Goal:** Show readable three-line server rows with safe project and frontend/backend identification.

**Architecture:** Extend the private Rust process metadata with a locally read command line, sanitize it into an optional project label and role, and expose only those derived values. Update the React row to use separate semantic lines instead of one truncating metadata string.

**Tech Stack:** Rust, Windows API, Tauri 2, React, TypeScript, CSS, Vitest

---

### Task 1: Safe process metadata

**Files:**

- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/localhost_manager/process_info.rs`
- Modify: `src-tauri/src/localhost_manager/models.rs`

1. Add the narrow Windows WDK threading feature.
2. Read the command line using `NtQueryInformationProcess` with the existing limited process handle.
3. Keep command-line data private and nullable.
4. Add focused conversion tests.

### Task 2: Project and role inference

**Files:**

- Modify: `src-tauri/src/localhost_manager/classification.rs`
- Modify: `src-tauri/src/localhost_manager/mod.rs`

1. Add failing tests for Vite/frontend, Next/full-stack, backend signatures, and unknown fallbacks.
2. Derive a project name only from trustworthy absolute command paths.
3. Infer the role from recognized command signatures without using the port.
4. Populate the existing `projectName` and `kind` contract fields.

### Task 3: Three-line server rows

**Files:**

- Modify: `src/features/localhost-manager/localhostManagerFormatters.ts`
- Modify: `src/features/localhost-manager/LocalhostManagerPanel.tsx`
- Modify: `src/features/localhost-manager/LocalhostManagerPanel.test.tsx`
- Modify: `src/app/App.css`

1. Update expectations for `Dev server` and structured resource text.
2. Render address plus optional project name, role/process, and resources/uptime as separate lines.
3. Adjust spacing and alignment so metadata remains visible at the compact window width.
4. Keep full project names available through a tooltip.

### Task 4: Verification

1. Run focused Vitest and Rust tests.
2. Run TypeScript, ESLint, Prettier, full Vitest, Cargo tests/check, Vite build, and `git diff --check`.
3. Restart QLayer and inspect the real Localhost Manager panel.

No intermediate commit will be created because the existing working tree contains previously approved uncommitted work.
