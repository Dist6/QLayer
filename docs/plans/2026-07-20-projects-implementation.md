# Projects Implementation Plan

**Goal:** Add a local-first Projects Quick Tool that links folders, Codex chats, preferred ports, verified localhost servers, fixed Codex development actions, and Project-scoped Voice Flow selection.

**Architecture:** Keep Project state in a focused TypeScript feature with defensive versioned local storage. Reuse Localhost Manager's opaque project fingerprint and recent-chat metadata, while native Tauri commands provide folder validation, fixed App Server action delivery, and a write-only clipboard fallback. Extend the existing Voice Flow selector with an additive two-mode payload and state machine so current push-to-talk behavior remains intact.

**Tech Stack:** React 19, strict TypeScript, Vitest, Tauri 2, Rust, Codex App Server stdio JSON-RPC, official Tauri dialog and clipboard-manager plugins, Tabler Icons.

---

## Preflight: protect the existing working tree

The repository currently contains extensive approved but uncommitted work across Voice Flow, Chat Shortcuts, Localhost Manager, UI, icons, and Tauri configuration. Do not stage or revert those changes accidentally.

1. Run `git -c safe.directory="C:/Users/onb80/Documents/QoLayer" status --short`.
2. Run the existing validation suite before beginning.
3. Obtain explicit approval to create a baseline commit for the already validated work, or use path-specific staging and inspect every staged diff.
4. Never use `git add .` in this worktree.

### Task 1: Add the Project domain model and validation

**Files:**

- Create: `src/features/projects/projectTypes.ts`
- Create: `src/features/projects/projectValidation.ts`
- Create: `src/features/projects/projectValidation.test.ts`

**Step 1: Write failing validation tests**

Cover valid Projects, trimmed names, absolute root identity requirements, malformed chat IDs, duplicate chats, invalid roles, duplicate ports, and ports outside `1..65535`.

**Step 2: Run the focused test**

Run: `.\node_modules\.bin\vitest.cmd run src/features/projects/projectValidation.test.ts`

Expected: FAIL because the module does not exist.

**Step 3: Add the exact domain contracts**

```ts
export type ProjectPortRole = "frontend" | "backend" | "fullstack" | "database" | "other";

export type ProjectPort = {
  id: string;
  label: string;
  role: ProjectPortRole;
  port: number;
  strict: boolean;
};

export type ProjectChatLink = {
  threadId: string;
  displayName: string;
  linkedAt: string;
};

export type Project = {
  id: string;
  name: string;
  rootPath: string;
  rootIdentity: string;
  linkedChats: ProjectChatLink[];
  preferredPorts: ProjectPort[];
  lastSelectedChatId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectCandidate = Omit<Project, "id" | "createdAt" | "updatedAt">;
```

Implement record guards and a `parseProject` function that returns `Project | null`. Reuse `parseCodexThreadInput` for canonical thread validation. Do not use `any`.

**Step 4: Run the test and typecheck**

Run:

- `.\node_modules\.bin\vitest.cmd run src/features/projects/projectValidation.test.ts`
- `.\node_modules\.bin\tsc.cmd --noEmit`

Expected: PASS.

**Step 5: Commit only the new domain files**

Run: `git add src/features/projects/projectTypes.ts src/features/projects/projectValidation.ts src/features/projects/projectValidation.test.ts`

Run: `git commit -m "feat: define project data model"`

### Task 2: Add versioned Project storage and state management

**Files:**

- Create: `src/features/projects/projectStorage.ts`
- Create: `src/features/projects/projectStorage.test.ts`
- Create: `src/features/projects/useProjects.ts`
- Create: `src/features/projects/useProjects.test.ts`

**Step 1: Write failing storage tests**

Test empty storage, a valid `qolayer.projects.v0` envelope, malformed sibling removal, duplicate ID removal, save/load round trips, create/update/delete behavior, and preservation of unaffected Projects.

**Step 2: Run the focused tests**

Run: `.\node_modules\.bin\vitest.cmd run src/features/projects/projectStorage.test.ts src/features/projects/useProjects.test.ts`

Expected: FAIL.

**Step 3: Implement the storage interface**

```ts
export type ProjectStorage = {
  load: () => { projects: Project[]; warning?: string };
  save: (projects: readonly Project[]) => void;
};

export function createProjectStorage(storage: Storage): ProjectStorage;
```

Use a single versioned envelope and immutable updates. `useProjects` must expose `projects`, `warning`, `createProject`, `updateProject`, and `deleteProject`. IDs use `crypto.randomUUID()`; timestamps use ISO strings.

**Step 4: Run tests and typecheck**

Run:

- `.\node_modules\.bin\vitest.cmd run src/features/projects/projectStorage.test.ts src/features/projects/useProjects.test.ts`
- `.\node_modules\.bin\tsc.cmd --noEmit`

Expected: PASS.

**Step 5: Commit**

Stage only the four Project storage/state files and commit `feat: persist projects locally`.

### Task 3: Add native folder selection and root identity

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/src/localhost_manager/project_resolution/fingerprint.rs`
- Modify: `src-tauri/src/localhost_manager/project_resolution/mod.rs`
- Create: `src-tauri/src/project_identity.rs`
- Create: `src/features/projects/projectFolderClient.ts`
- Create: `src/features/projects/projectFolderClient.test.ts`

**Step 1: Write failing Rust tests**

Test that an existing absolute directory returns the same opaque ID as Localhost Manager, relative paths are rejected, missing folders are rejected, and display names are sanitized.

**Step 2: Expose the existing fingerprint narrowly**

Change `project_fingerprint` visibility only as far as needed inside the crate. Add a serializable result:

```rust
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRootIdentity {
    root_path: String,
    root_identity: String,
    display_name: String,
}
```

Add `identify_project_root(path: String)` as a Tauri command. It must canonicalize only the user-selected path, require a directory, and never enumerate its contents.

**Step 3: Add official Tauri dialog support**

Install matching v2 dialog packages. Initialize `tauri_plugin_dialog::init()` and grant only `dialog:allow-open`. Do not add shell permissions.

**Step 4: Add the TypeScript client**

Use `@tauri-apps/plugin-dialog` with `{ directory: true, multiple: false }`, then invoke `identify_project_root`. Parse the response defensively.

**Step 5: Verify**

Run:

- `.\node_modules\.bin\vitest.cmd run src/features/projects/projectFolderClient.test.ts`
- `cargo test --manifest-path src-tauri\Cargo.toml project_identity`
- `cargo check --manifest-path src-tauri\Cargo.toml`
- `.\node_modules\.bin\tsc.cmd --noEmit`

Expected: PASS.

**Step 6: Commit with explicit paths**

Commit `feat: select project folders safely` after reviewing the staged Tauri permission diff.

### Task 4: Add root identity to recent-chat metadata

**Files:**

- Modify: `src-tauri/src/chat_discovery.rs`
- Modify: `src/features/chat-shortcuts/chatDiscoveryClient.ts`
- Modify: `src/features/chat-shortcuts/chatDiscoveryClient.test.ts`
- Create: `src/features/projects/projectChatSuggestions.ts`
- Create: `src/features/projects/projectChatSuggestions.test.ts`

**Step 1: Write failing Rust and TypeScript tests**

Verify that recent threads with a working directory expose `projectId`, do not expose raw cwd or preview content, malformed identities are dropped, and matching suggestions are sorted before unrelated recent chats.

**Step 2: Extend metadata only**

Add `project_id: Option<String>` to Rust `RecentChat` and derive it with the existing opaque fingerprint from the thread `cwd`. Keep `project_name` for display. Do not serialize cwd.

Add `projectId?: string` to the TypeScript `RecentChat` parser.

**Step 3: Implement pure suggestion logic**

`suggestProjectChats(project, savedDestinations, recentChats)` must deduplicate by canonical `threadId`, exclude already linked chats, and rank matching `projectId` first.

**Step 4: Verify and commit**

Run the focused TypeScript tests, `cargo test --manifest-path src-tauri\Cargo.toml chat_discovery`, and typecheck. Commit `feat: suggest chats for project folders` using explicit paths.

### Task 5: Derive Project localhost state

**Files:**

- Create: `src/features/projects/projectLocalhostStatus.ts`
- Create: `src/features/projects/projectLocalhostStatus.test.ts`

**Step 1: Write failing table-driven tests**

Cover `running`, `missing`, `conflict`, and `unverified`; strict alternate ports; non-strict alternate ports; unknown listeners; databases; disappearing processes; and duplicate snapshots.

**Step 2: Implement a pure derivation function**

```ts
export type ProjectPortState =
  | { kind: "checking" }
  | { kind: "running"; server: LocalhostServer }
  | { kind: "missing" }
  | { kind: "conflict"; server: LocalhostServer }
  | { kind: "unverified"; server: LocalhostServer }
  | { kind: "alternate"; server: LocalhostServer };

export function deriveProjectPortStates(
  project: Project,
  snapshot: LocalhostSnapshot | null,
  checking: boolean,
): ReadonlyMap<string, ProjectPortState>;
```

Port equality alone must never produce `running`.

**Step 3: Verify and commit**

Run the focused test and typecheck. Commit `feat: derive project server status`.

### Task 6: Build the Project list, detail, editor, and deletion UI

**Files:**

- Create: `src/features/projects/ProjectsPanel.tsx`
- Create: `src/features/projects/ProjectListView.tsx`
- Create: `src/features/projects/ProjectDetailView.tsx`
- Create: `src/features/projects/ProjectEditorView.tsx`
- Create: `src/features/projects/ProjectDeleteDialog.tsx`
- Create: `src/features/projects/ProjectsPanel.test.tsx`
- Modify: `src/app/App.css`

**Step 1: Write failing component tests**

Test the empty state, list summaries, opening details, `New Project`, folder selection, validation errors, linked-chat suggestions, port row editing, the three-dot menu, Edit, deletion confirmation, Cancel, confirmed deletion, and the guarantee that deletion calls only the Project state method.

**Step 2: Implement the approved view state**

Use an explicit internal view union:

```ts
type ProjectsViewState =
  | { kind: "list" }
  | { kind: "detail"; projectId: string }
  | { kind: "create" }
  | { kind: "edit"; projectId: string };
```

Keep each component focused. Use Tabler icons. Do not create a generic form framework or new design system.

**Step 3: Implement the three-dot menu and confirmation**

The detail header uses `IconDots`. The menu contains exactly `Edit Project` and `Delete Project`. The confirmation copy must state that files, chats, and running servers are not deleted. The destructive button label is `Delete Project`.

**Step 4: Match the approved visual direction**

Use the current neutral tokens, 14 px minimum text, dividers instead of cards, existing focus rings, a compact 440 px layout, and reduced-motion support. Avoid glow, purple, and oversized controls.

**Step 5: Verify and commit**

Run the Project component tests, typecheck, and lint. Commit `feat: add projects interface` with explicit paths.

### Task 7: Register Projects in the toolbox shell

**Files:**

- Modify: `src/features/toolbox/toolboxViews.ts`
- Modify: `src/features/toolbox/ToolboxSidebar.tsx`
- Modify: `src/features/toolbox/windowSizing.ts`
- Modify: `src/features/toolbox/windowSizing.test.ts`
- Modify: `src/app/App.tsx`

**Step 1: Extend the failing window-size test**

Expect `projects` to use the existing 450 px compact height.

**Step 2: Add the navigation entry**

Add `projects` to `ToolboxView`, use a Tabler folder icon, and place it after Localhost Manager. Instantiate `useProjects` once in `App` and pass existing chats, recent-chat discovery, Localhost refresh settings, and Project state to `ProjectsPanel`.

**Step 3: Regression test and commit**

Run `windowSizing.test.ts`, all Project tests, typecheck, and lint. Commit `feat: register projects quick tool` with explicit paths.

### Task 8: Build fixed development-action messages natively

**Files:**

- Create: `src-tauri/src/project_actions/mod.rs`
- Create: `src-tauri/src/project_actions/message.rs`
- Modify: `src-tauri/src/main.rs`

**Step 1: Write failing Rust tests**

Use snapshot-like exact string assertions for Start and Stop messages. Test every port role, strict/non-strict wording, stable ordering, invalid ports, duplicate ports, malformed thread IDs, relative/missing folders, control characters, and oversized labels.

**Step 2: Add typed native request contracts**

```rust
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectActionRequest {
    action: ProjectAction,
    project_name: String,
    root_path: String,
    thread_id: String,
    ports: Vec<ProjectActionPort>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProjectAction {
    StartDevelopment,
    StopDevelopment,
}
```

The native command must never accept prompt text or a command line. Build messages only from validated structured fields.

**Step 3: Verify and commit**

Run the focused Rust tests and `cargo check`. Commit `feat: define safe project development actions`.

### Task 9: Add the narrow Codex App Server action client

**Files:**

- Create: `src-tauri/src/codex_app_server/mod.rs`
- Create: `src-tauri/src/codex_app_server/transport.rs`
- Create: `src-tauri/src/codex_app_server/action_session.rs`
- Modify: `src-tauri/src/chat_discovery.rs`
- Modify: `src-tauri/src/main.rs`

**Step 1: Extract and test transport framing**

Move the existing newline-delimited JSON request/response framing into a focused internal transport used by discovery and actions. Preserve the verified `thread/list` behavior exactly. Add fake-reader/writer tests for ignored notifications, matching response IDs, protocol errors, EOF, and timeouts.

**Step 2: Implement the action handshake**

Use the verified desktop runtime from `codex_runtime`. Send only:

1. `initialize`
2. `initialized`
3. `thread/resume` with the validated thread ID
4. `turn/start` with the resumed thread ID, fixed text input, and validated Project cwd

Do not override sandbox or approval policy. Do not answer approval requests.

**Step 3: Own and clean up the child process**

Use a guard that calls `kill` and `wait` on completion, error, cancellation, or timeout. Allow only one Project action session at a time. Keep draining protocol output until `turn/completed` or the bounded action timeout. Distinguish failure before turn acceptance from failure after acceptance so fallback never duplicates an accepted request.

**Step 4: Return a structured result**

```rust
#[derive(serde::Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum ProjectActionDispatch {
    Completed,
    AcceptedButFailed { message: String },
    FallbackRequired { message: String },
}
```

`FallbackRequired.message` is the fixed message produced by native code.

**Step 5: Verify and commit**

Run all Rust tests and `cargo check`. Re-run recent-chat discovery tests to prove the extraction did not regress them. Commit `feat: deliver project actions to codex`.

### Task 10: Add action chat selection, fallback, and restrained verification

**Files:**

- Create: `src/features/projects/projectActionClient.ts`
- Create: `src/features/projects/projectActionClient.test.ts`
- Create: `src/features/projects/ProjectActionDialog.tsx`
- Create: `src/features/projects/ProjectActionDialog.test.tsx`
- Create: `src/features/projects/useProjectAction.ts`
- Create: `src/features/projects/useProjectAction.test.ts`
- Modify: `src/features/projects/ProjectDetailView.tsx`
- Modify: `src/features/projects/useProjects.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src-tauri/src/main.rs`

**Step 1: Write failing action-flow tests**

Test Start and Stop opening the chat chooser, selecting a different chat each time, highlighting but not forcing the last chat, updating `lastSelectedChatId`, successful App Server delivery, pre-acceptance fallback, post-acceptance failure without duplicate copy, clipboard failure, and repeated clicks while busy.

**Step 2: Add write-only clipboard support**

Install the official Tauri clipboard-manager v2 plugin. Initialize it and grant only `clipboard-manager:allow-write-text`. Do not grant clipboard read permission.

**Step 3: Implement the client and hook**

The client sends typed structured Project data to `dispatch_project_action`. For `fallbackRequired`, write the returned fixed message, open the canonical selected thread, and report `Message copied. Paste it in Codex to continue.` If clipboard writing fails, expose the fixed text in a selectable read-only fallback field.

**Step 4: Add restrained port verification**

After an accepted action, refresh Localhost Manager immediately and then every 5 seconds for at most 60 seconds while the Projects view is visible. Stop early when every strict port reaches its expected terminal state. Reuse the existing in-flight guard and never add global aggressive polling.

**Step 5: Verify and commit**

Run focused tests, typecheck, lint, all Rust tests, and `cargo check`. Review the capability file to confirm only write-text permission was added. Commit `feat: run project actions through codex`.

### Task 11: Extend Voice Flow with `Chats | Projects`

**Files:**

- Modify: `src/features/chat-shortcuts/voiceSelectorEvents.ts`
- Modify: `src/features/chat-shortcuts/voiceSelectorEvents.test.ts`
- Modify: `src/features/chat-shortcuts/voiceSelectorClient.ts`
- Modify: `src/features/chat-shortcuts/VoiceDestinationSelectorApp.tsx`
- Create: `src/features/chat-shortcuts/voiceSelectorNavigation.ts`
- Create: `src/features/chat-shortcuts/voiceSelectorNavigation.test.ts`
- Modify: `src/features/voice-flow/voiceDestinationFlow.ts`
- Modify: `src/features/voice-flow/voiceDestinationFlow.test.ts`
- Modify: `src/features/voice-flow/useVoiceFlow.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.css`

**Step 1: Preserve current Chats-mode tests**

Copy no behavior into a new system. Extend existing tests so the original payload, `Current chat`, saved destinations, numeric keys, Escape, shortcut release, targeted focus, dictation hold, and audio restoration remain green.

**Step 2: Add the typed selector payload**

```ts
export type VoiceSelectorProject = {
  id: string;
  name: string;
  chats: ProjectChatLink[];
};

export type VoiceSelectorOpenPayload = {
  mode: "chats" | "projects";
  destinations: ChatDestination[];
  projects: VoiceSelectorProject[];
};
```

Reject malformed nested entries and duplicate thread IDs. Keep selection results based on canonical thread ID rather than Project authority.

**Step 3: Add a pure navigation state machine**

States are `chats`, `projects`, and `projectChats(projectId)`. Changing the segmented mode resets nested navigation. Back from Project chats returns to Projects. Releasing the global hold while any selector state is active cancels and restores audio.

**Step 4: Implement the approved selector UI**

Add a compact animated `Chats | Projects` segmented control. Projects mode first lists Projects, then linked chats with a back button. Numeric keys apply to the visible list; mouse selection remains available. Show `No linked chats` when appropriate. Persist only the last mode locally.

**Step 5: Resolve selection through the existing Voice Flow service**

Return a canonical `threadId` from Project-chat selection and call the existing `startTargetedVoiceFlowHold`. Do not alter native focus, dictation, audio, or global-hotkey implementations.

**Step 6: Verify and commit**

Run all selector and Voice Flow tests, typecheck, lint, and Rust tests. Commit `feat: select voice chats by project`.

### Task 12: Full regression, formatting, and manual verification

**Files:**

- Modify only files required by formatter output after inspecting the diff.
- Update: `docs/architecture.md` and `docs/privacy.md` with the approved local-only behavior and narrow permissions.

**Step 1: Run the complete automated suite**

Run:

- `.\node_modules\.bin\tsc.cmd --noEmit`
- `.\node_modules\.bin\eslint.cmd .`
- `.\node_modules\.bin\vitest.cmd run`
- `.\node_modules\.bin\vite.cmd build`
- `cargo test --manifest-path src-tauri\Cargo.toml`
- `cargo check --manifest-path src-tauri\Cargo.toml`
- `cargo fmt --manifest-path src-tauri\Cargo.toml -- --check` when rustfmt is installed
- `cargo clippy --manifest-path src-tauri\Cargo.toml -- -D warnings` when clippy is installed

Expected: all available checks pass. If rustfmt or clippy is unavailable, record that exact limitation rather than reporting success.

**Step 2: Manually verify without changing external state unexpectedly**

After obtaining approval to launch the desktop GUI:

1. Create a Project with a real folder.
2. Link saved and suggested chats.
3. Configure strict frontend and backend ports plus a non-strict database/other port.
4. Confirm list and detail summaries.
5. Confirm Localhost states for running, missing, conflict, and unverified cases.
6. Confirm the three-dot Edit/Delete menu and deletion cancellation.
7. Confirm deletion removes only QLayer configuration.
8. Run Start Development through a selected chat and observe App Server delivery.
9. Simulate unavailable delivery and confirm copy/open fallback.
10. Confirm Stop Development uses another selectable chat.
11. Confirm Voice Flow Chats mode is unchanged.
12. Confirm Projects mode navigates Project to chat and preserves push-to-talk audio restoration.
13. Confirm tray, window sizing, close-to-tray, and global shortcut behavior remain intact.

**Step 3: Update documentation and create the final scoped commit**

Stage only the Projects implementation, intentional integration edits, and documentation. Inspect `git diff --cached` before committing. Commit `feat: add projects quick tool` only after real validation and user approval.
