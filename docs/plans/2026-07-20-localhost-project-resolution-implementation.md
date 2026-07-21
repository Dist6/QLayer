# Robust Localhost Project Resolution Implementation Plan

**Goal:** Resolve project names and server roles for substantially more native Windows development servers while preserving Localhost Manager's local-only safety model.

**Architecture:** Add a private evidence pipeline under `src-tauri/src/localhost_manager/project_resolution/`. It correlates a listener with a bounded parent-process chain, extracts trusted absolute path candidates, inspects only allowlisted nearby manifests, caches sanitized results, and applies local manual aliases through narrow Tauri commands. React receives only project labels, roles, opaque identifiers, and grouped endpoints.

**Tech Stack:** Rust, Windows ToolHelp API, Tauri 2, React, strict TypeScript, Vitest

---

## Pass 1: Evidence engine

### Task 1: Parent-process snapshot

**Files:**

- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/localhost_manager/project_resolution/mod.rs`
- Create: `src-tauri/src/localhost_manager/project_resolution/process_tree.rs`
- Modify: `src-tauri/src/localhost_manager/mod.rs`

**Steps:**

1. Add fixture tests for a listener process with zero, one, four, and cyclic parent relationships.
2. Run `cargo test --manifest-path src-tauri/Cargo.toml project_resolution::process_tree` and confirm failure.
3. Enable only `Win32_System_Diagnostics_ToolHelp` in the existing `windows` dependency.
4. Implement one `CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS)` pass and collect PID-to-parent-PID metadata.
5. Implement a pure bounded-chain resolver with maximum depth four, cycle detection, and missing-process tolerance.
6. Run the focused Rust tests and `cargo check --manifest-path src-tauri/Cargo.toml`.

**Planned commit:** `feat(localhost): add bounded process ancestry discovery`

### Task 2: Absolute path candidates

**Files:**

- Create: `src-tauri/src/localhost_manager/project_resolution/path_candidates.rs`
- Modify: `src-tauri/src/localhost_manager/process_info.rs`
- Modify: `src-tauri/src/localhost_manager/models.rs`

**Steps:**

1. Add table-driven tests for quoted Windows paths, forward slashes, relative entry points, `node_modules`, Python entry scripts, `.dll` entry points, and malformed input.
2. Confirm the focused tests fail.
3. Implement a pure Windows command-line tokenizer sufficient for quoted and escaped arguments without executing anything.
4. Accept only absolute, normalized paths from executable and command-line metadata.
5. Convert file candidates to their containing directories and deduplicate case-insensitively.
6. Keep raw commands and paths private and ephemeral.
7. Run focused tests and Rust checks.

**Planned commit:** `feat(localhost): derive bounded project path evidence`

### Task 3: Project-root candidates

**Files:**

- Create: `src-tauri/src/localhost_manager/project_resolution/project_roots.rs`
- Modify: `src-tauri/src/localhost_manager/project_resolution/mod.rs`

**Steps:**

1. Add tests for ancestor limits, drive-root stopping, user-profile boundaries, nested `node_modules`, and duplicate candidates.
2. Implement a maximum five-ancestor walk for each absolute candidate.
3. Never enumerate children or recurse directories.
4. Rank exact entry-point directories before ancestors and parent-process candidates after listener-process candidates.
5. Return private ranked roots with evidence source and confidence.
6. Run focused Rust tests.

**Planned commit:** `feat(localhost): rank project root candidates`

## Pass 2: Manifest resolution and classification

### Task 4: Bounded manifest reader

**Files:**

- Create: `src-tauri/src/localhost_manager/project_resolution/manifest_reader.rs`
- Create: `src-tauri/src/localhost_manager/project_resolution/fixtures/package.json`
- Create: `src-tauri/src/localhost_manager/project_resolution/fixtures/pyproject.toml`
- Create: `src-tauri/src/localhost_manager/project_resolution/fixtures/Cargo.toml`
- Create: `src-tauri/src/localhost_manager/project_resolution/fixtures/go.mod`
- Create: `src-tauri/src/localhost_manager/project_resolution/fixtures/Sample.csproj`

**Steps:**

1. Add tests for supported manifests, missing names, malformed content, files over 256 KB, and unsupported filenames.
2. Implement direct-file checks only; never scan recursively.
3. Parse `package.json` with existing `serde_json` and retain only name plus dependency keys.
4. Parse the minimal allowlisted name/dependency fields from TOML, Go module, and `.csproj` text without retaining full file content.
5. Reject oversized and non-UTF-8 files without affecting other listeners.
6. Run focused Rust tests.

**Planned commit:** `feat(localhost): resolve allowlisted project manifests`

### Task 5: Evidence-based framework classifier

**Files:**

- Modify: `src-tauri/src/localhost_manager/classification.rs`
- Create: `src-tauri/src/localhost_manager/project_resolution/resolver.rs`
- Modify: `src-tauri/src/localhost_manager/mod.rs`

**Steps:**

1. Add fixtures for Vite, Next.js, Nuxt, Django, FastAPI, Flask, NestJS, ASP.NET, Spring Boot, Laravel, Rails, Axum, Actix, and an ambiguous runtime.
2. Confirm expected project names and roles fail before implementation.
3. Combine command signatures and manifest dependency keys into internal evidence.
4. Display only high-confidence automatic roles; preserve `Dev server` for ambiguity.
5. Apply identity precedence: manifest name, reliable folder, then no name.
6. Remove the current `node_modules`-only name resolver.
7. Run focused and complete Rust tests.

**Planned commit:** `feat(localhost): classify projects from process and manifest evidence`

### Task 6: Bounded evidence cache

**Files:**

- Create: `src-tauri/src/localhost_manager/project_resolution/cache.rs`
- Modify: `src-tauri/src/localhost_manager/mod.rs`

**Steps:**

1. Add tests for cache hit, manifest modification, process identity change, eviction, and missing files.
2. Cache sanitized resolution by private path fingerprint and modification time.
3. Cap cache entries and discard entries no longer referenced by current snapshots.
4. Ensure refresh never overlaps existing discovery behavior.
5. Run Rust tests and check.

**Planned commit:** `perf(localhost): cache sanitized project evidence`

## Pass 3: Manual aliases

### Task 7: Opaque project identities and alias storage

**Files:**

- Create: `src-tauri/src/localhost_manager/project_resolution/fingerprint.rs`
- Create: `src-tauri/src/localhost_manager/project_resolution/alias_store.rs`
- Modify: `src-tauri/src/localhost_manager/models.rs`
- Modify: `src-tauri/src/localhost_manager/mod.rs`
- Modify: `src-tauri/src/main.rs`

**Steps:**

1. Add tests for stable opaque fingerprints, alias validation, corrupted storage recovery, and path non-disclosure.
2. Generate a deterministic opaque fingerprint from normalized private root evidence.
3. Persist only fingerprint-to-display-name mappings under QoLayer's local app-data directory.
4. Add narrow commands to set and remove an alias by trusted server ID; never accept a path or PID.
5. Validate alias length, whitespace, and control characters.
6. Add `projectId` and alias-state fields to the serialized server contract without exposing raw evidence.
7. Run Rust tests and checks.

**Planned commit:** `feat(localhost): add safe local project aliases`

### Task 8: Alias frontend flow

**Files:**

- Modify: `src/features/localhost-manager/localhostManagerTypes.ts`
- Modify: `src/features/localhost-manager/localhostManagerTypes.test.ts`
- Modify: `src/features/localhost-manager/localhostManagerClient.ts`
- Modify: `src/features/localhost-manager/useLocalhostServers.ts`
- Modify: `src/features/localhost-manager/LocalhostManagerPanel.tsx`
- Modify: `src/features/localhost-manager/LocalhostManagerPanel.test.tsx`
- Modify: `src/app/App.css`

**Steps:**

1. Add parser and component tests for unnamed, automatically named, aliased, rename, remove-name, validation-error, and disappeared-process states.
2. Add strict clients for set/remove alias commands.
3. Add a compact overflow action to each row using progressive disclosure.
4. Show **Name project** only when no name exists; show **Rename** and **Remove name** for manually aliased projects.
5. Request only a display name and keep the three-line row readable.
6. Refresh the trusted snapshot after an alias change.
7. Run focused TypeScript, ESLint, and Vitest checks.

**Planned commit:** `feat(localhost): add project naming controls`

## Pass 4: Strong-evidence grouping

### Task 9: Group contracts and UI

**Files:**

- Create: `src/features/localhost-manager/localhostManagerGrouping.ts`
- Create: `src/features/localhost-manager/localhostManagerGrouping.test.ts`
- Modify: `src/features/localhost-manager/LocalhostManagerPanel.tsx`
- Modify: `src/features/localhost-manager/LocalhostManagerPanel.test.tsx`
- Modify: `src/app/App.css`

**Steps:**

1. Add tests proving that only matching project fingerprints group; matching runtimes or adjacent ports do not.
2. Group resolved endpoints beneath one compact project heading.
3. Keep every endpoint and safe-open action independently visible.
4. Keep unnamed and unknown listeners ungrouped.
5. Add accessible labels for project and endpoint counts.
6. Run focused frontend tests.

**Planned commit:** `feat(localhost): group endpoints by resolved project`

## Final verification

1. Run `./node_modules/.bin/tsc.cmd --noEmit`.
2. Run `./node_modules/.bin/eslint.cmd .`.
3. Run `./node_modules/.bin/vitest.cmd run`.
4. Run `./node_modules/.bin/prettier.cmd --check .` after formatting only touched files.
5. Run `cargo test --manifest-path src-tauri/Cargo.toml`.
6. Run `cargo check --manifest-path src-tauri/Cargo.toml`.
7. Run `./node_modules/.bin/vite.cmd build`.
8. Run `git diff --check`.
9. Restart QoLayer and verify native Node, Python/.NET when available, multiple endpoints, alias persistence, and unknown-listener isolation.
10. Do not commit existing unrelated working-tree changes. Create the planned commits only with explicit user authorization and precise staging.
