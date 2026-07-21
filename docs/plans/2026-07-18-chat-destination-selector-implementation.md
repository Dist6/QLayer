# Chat Destination Selector Implementation Plan

**Goal:** Add a compact numbered chat selector that discovers recent Codex chats, lets users pin up to nine destinations, and routes the existing push-to-talk Voice Flow to a selected chat through official deep links.

**Architecture:** Saved destinations live in validated frontend local storage and are shared by the main and selector webviews. Recent-chat discovery is an optional native adapter around the fixed official `codex app-server` process and returns metadata only. A dedicated hidden Tauri window captures `0–9` selection during the existing global-hotkey hold, while a narrowly allowlisted native command opens and focuses the selected `codex://threads/<thread-id>` link only when ChatGPT/Codex is already running.

**Tech Stack:** Tauri 2, Rust 2021, Windows APIs, React 19, strict TypeScript, Vitest, localStorage, Tabler Icons, Codex App Server JSON-RPC over stdio.

---

## Preconditions and constraints

- Read `AGENTS.md` and `docs/plans/2026-07-18-chat-destination-selector-design.md` before editing.
- Preserve the validated Voice Flow behavior, including focus, maximization, physical Space hold handling, automatic audio restoration, tray behavior, and compact UI.
- Do not read Codex authentication files, tokens, browser cookies, internal databases, or chat transcripts.
- Do not expose arbitrary shell execution, executable paths, command arguments, URLs, or thread-list parameters to the frontend.
- Keep all UI copy, code comments, docs, and labels in English.
- The worktree currently contains validated but uncommitted Voice Flow and UI changes. Do not begin feature commits until that baseline has been reviewed and committed with user approval.

## Task 0: Establish the validated baseline

**Files:**

- Review all current modified and untracked files.
- Do not change product code in this task.

**Step 1: Inspect the working tree**

Run:

```powershell
git -c safe.directory='C:/Projects/QLayer' status --short
git -c safe.directory='C:/Projects/QLayer' diff --stat
```

Confirm that the diff contains the already validated Voice Flow, ChatGPT focus, compact UI, Tabler, tray, autostart, and window-drag work plus planning documents.

**Step 2: Re-run the baseline checks**

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd .
.\node_modules\.bin\vitest.cmd run
.\node_modules\.bin\prettier.cmd --check src package.json src-tauri\tauri.conf.json src-tauri\capabilities
cargo test --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
.\node_modules\.bin\vite.cmd build
```

Expected: all available checks pass. Record that `rustfmt` and `clippy` remain unavailable unless the toolchain components are installed.

**Step 3: Request baseline commit approval**

Do not commit automatically. After user approval:

```powershell
git add package.json pnpm-lock.yaml src src-tauri docs/plans
git commit -m "feat: complete compact Voice Flow toolbox"
```

Expected: the new feature starts from a clean, user-validated baseline.

---

## Task 1: Verify the installed App Server protocol

**Files:**

- Create: `docs/references/codex-app-server-thread-list.md`
- Do not commit generated schemas.

**Step 1: Locate the exact official runtime**

Use the same verified ChatGPT process discovery as `src-tauri/src/window_focus.rs`. Derive the packaged `resources/codex.exe` path from the official ChatGPT executable path. Do not accept user-provided paths and do not search unrelated directories.

**Step 2: Generate version-matched schemas into a temporary directory**

Run the verified executable with fixed arguments:

```powershell
& '<verified-codex-executable>' app-server generate-json-schema --out C:\tmp\qolayer-codex-schema
```

Inspect only the schemas needed for:

- `initialize`
- `initialized`
- `thread/list`
- the thread summary returned by `thread/list`

Do not inspect auth or session files.

**Step 3: Document the narrow contract**

Write `docs/references/codex-app-server-thread-list.md` with:

- Installed Codex version.
- Exact JSON-RPC method name.
- Exact bounded-list parameters and sort field.
- Exact response fields used for `threadId`, title, project/cwd metadata, and update time.
- Which fields QLayer explicitly ignores.
- Timeout and fallback behavior.

**Step 4: Commit the protocol note**

```powershell
git add docs/references/codex-app-server-thread-list.md
git commit -m "docs: record Codex thread discovery contract"
```

---

## Task 2: Add canonical thread-ID and deep-link validation

**Files:**

- Modify: `src/features/codex/deepLinks.ts`
- Modify: `src/features/codex/deepLinks.test.ts`
- Modify: `src-tauri/src/main.rs`
- Create: `src-tauri/src/codex_threads.rs`

**Step 1: Write failing TypeScript tests**

Add cases for:

```ts
expect(parseCodexThreadInput("019f72d8-d02e-75d1-9969-d6c5a647c95e")).toEqual({
  ok: true,
  threadId: "019f72d8-d02e-75d1-9969-d6c5a647c95e",
});
expect(parseCodexThreadInput("codex://threads/019f72d8-d02e-75d1-9969-d6c5a647c95e")).toEqual({
  ok: true,
  threadId: "019f72d8-d02e-75d1-9969-d6c5a647c95e",
});
expect(buildCodexThreadLink("019f72d8-d02e-75d1-9969-d6c5a647c95e")).toBe(
  "codex://threads/019f72d8-d02e-75d1-9969-d6c5a647c95e",
);
```

Reject query strings, fragments, encoded separators, nested schemes, wrong UUID group lengths, non-hex characters, `threads/new`, HTTPS URLs, and extra path components.

**Step 2: Run the focused test and verify failure**

```powershell
.\node_modules\.bin\vitest.cmd run src\features\codex\deepLinks.test.ts
```

Expected: FAIL because the new parser and builder do not exist.

**Step 3: Implement the strict TypeScript parser**

Add:

```ts
export type CodexThreadParseResult =
  | { ok: true; threadId: string }
  | { ok: false; message: string };

export function parseCodexThreadInput(value: string): CodexThreadParseResult;
export function buildCodexThreadLink(threadId: string): string;
```

Use one canonical lowercase UUID-shaped identifier and derive the URL. Do not accept arbitrary `codex://` paths.

**Step 4: Write failing Rust tests**

In `src-tauri/src/codex_threads.rs`, test the same accepted and rejected values. Include an exact allowlist test proving that existing home/settings/new-thread links remain supported and arbitrary links remain blocked.

**Step 5: Implement equivalent Rust validation**

Implement focused functions:

```rust
pub fn parse_thread_id(input: &str) -> Result<String, &'static str>;
pub fn build_thread_link(thread_id: &str) -> Result<String, &'static str>;
pub fn is_allowed_codex_url(url: &str) -> bool;
```

Move `is_allowed_codex_url` out of `main.rs` and delegate to this module.

**Step 6: Run focused and full checks**

```powershell
.\node_modules\.bin\vitest.cmd run src\features\codex\deepLinks.test.ts
cargo test --manifest-path src-tauri\Cargo.toml codex_threads
.\node_modules\.bin\tsc.cmd --noEmit
```

Expected: PASS.

**Step 7: Commit**

```powershell
git add src/features/codex src-tauri/src/codex_threads.rs src-tauri/src/main.rs
git commit -m "feat: validate Codex thread deep links"
```

---

## Task 3: Build destination persistence and domain operations

**Files:**

- Create: `src/features/chat-shortcuts/chatDestinationTypes.ts`
- Create: `src/features/chat-shortcuts/chatDestinationValidation.ts`
- Create: `src/features/chat-shortcuts/chatDestinationStorage.ts`
- Create: `src/features/chat-shortcuts/chatDestinations.ts`
- Create: `src/features/chat-shortcuts/chatDestinationStorage.test.ts`
- Create: `src/features/chat-shortcuts/chatDestinations.test.ts`

**Step 1: Write failing validation and storage tests**

Cover:

- Empty storage returns an empty list without recovery.
- Valid destinations round-trip.
- Invalid records are discarded independently.
- Duplicate thread IDs are deduplicated.
- More than nine records are truncated deterministically.
- Order is normalized to `1–9`.
- Names are trimmed, non-empty, and length-bounded.
- Removing and reordering never mutate the original array.
- Pinning an already-pinned thread is idempotent.

Use this domain shape:

```ts
export type ChatDestination = {
  id: string;
  threadId: string;
  displayName: string;
  projectName?: string;
  order: number;
  pinnedAt: string;
};
```

**Step 2: Run and verify failure**

```powershell
.\node_modules\.bin\vitest.cmd run src\features\chat-shortcuts\chatDestinationStorage.test.ts src\features\chat-shortcuts\chatDestinations.test.ts
```

Expected: FAIL.

**Step 3: Implement minimal pure operations**

Use storage key `qolayer.chat-destinations.v0`. Export focused functions:

```ts
pinDestination(current, candidate): ChatDestination[];
removeDestination(current, id): ChatDestination[];
renameDestination(current, id, name): ChatDestination[];
moveDestination(current, id, direction): ChatDestination[];
```

Derive deep links at use time; never store input URLs.

**Step 4: Run tests and checks**

```powershell
.\node_modules\.bin\vitest.cmd run src\features\chat-shortcuts\chatDestinationStorage.test.ts src\features\chat-shortcuts\chatDestinations.test.ts
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd .
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/features/chat-shortcuts
git commit -m "feat: persist Voice Flow chat destinations"
```

---

## Task 4: Implement read-only recent-chat discovery

**Files:**

- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/Cargo.lock`
- Create: `src-tauri/src/codex_runtime.rs`
- Create: `src-tauri/src/chat_discovery.rs`
- Modify: `src-tauri/src/main.rs`
- Create: `src/features/chat-shortcuts/chatDiscoveryClient.ts`
- Create: `src/features/chat-shortcuts/chatDiscoveryClient.test.ts`

**Step 1: Add the direct JSON dependency**

```powershell
cargo add serde_json --manifest-path src-tauri\Cargo.toml
```

Do not add a shell plugin or process-execution frontend permission.

**Step 2: Write Rust parser tests before spawning a process**

Use recorded, minimal fixtures derived from Task 1. Test:

- Valid thread summaries become metadata-only `RecentChat` records.
- Transcript/message fields in fixtures are ignored.
- Malformed entries are dropped without losing valid siblings.
- Results are bounded and sorted by the documented update field.
- A missing executable, timeout, malformed JSON, premature EOF, and non-zero exit become one stable discovery error.

Native output:

```rust
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentChat {
    thread_id: String,
    title: String,
    project_name: Option<String>,
    updated_at: Option<String>,
}
```

**Step 3: Implement verified runtime resolution**

`codex_runtime.rs` must derive the fixed Codex executable from a verified official ChatGPT/Codex process. It must reject missing, non-file, or unexpected paths. No frontend argument selects the executable.

**Step 4: Implement the bounded JSON-RPC client**

`chat_discovery.rs` should:

1. Spawn the verified executable with exactly `app-server`.
2. Pipe stdin/stdout and suppress unrelated window creation on Windows.
3. Send `initialize` with QLayer client metadata.
4. Wait for the matching response.
5. Send `initialized`.
6. Send the exact bounded `thread/list` request recorded in Task 1.
7. Parse only the matching response ID.
8. Kill and wait for the child after success, error, or timeout.

Run blocking process work inside `tauri::async_runtime::spawn_blocking`. Use a short documented timeout and a reader channel rather than an unbounded blocking read.

**Step 5: Expose a zero-argument Tauri command**

```rust
#[tauri::command]
async fn list_recent_codex_chats() -> Result<Vec<chat_discovery::RecentChat>, String>;
```

The frontend cannot supply process arguments, paths, methods, cursors, or limits.

**Step 6: Write TypeScript response-parser tests**

Test strict parsing and the stable unavailable message. Implement `listRecentChats()` around the Tauri command.

**Step 7: Run checks**

```powershell
cargo test --manifest-path src-tauri\Cargo.toml chat_discovery
cargo check --manifest-path src-tauri\Cargo.toml
.\node_modules\.bin\vitest.cmd run src\features\chat-shortcuts\chatDiscoveryClient.test.ts
.\node_modules\.bin\tsc.cmd --noEmit
```

Expected: PASS without reading auth files or chat content.

**Step 8: Commit**

```powershell
git add src-tauri src/features/chat-shortcuts/chatDiscoveryClient.ts src/features/chat-shortcuts/chatDiscoveryClient.test.ts
git commit -m "feat: discover recent Codex chats locally"
```

---

## Task 5: Build the Chat shortcuts management view

**Files:**

- Modify: `src/features/chat-shortcuts/ChatShortcutsPanel.tsx`
- Create: `src/features/chat-shortcuts/useChatDestinations.ts`
- Create: `src/features/chat-shortcuts/chatShortcutViewModel.ts`
- Create: `src/features/chat-shortcuts/chatShortcutViewModel.test.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.css`

**Step 1: Write pure view-model tests**

Cover pinned/recent merging, duplicate detection, automatic number labels, empty states, discovery unavailable state, and the nine-destination limit.

**Step 2: Run and verify failure**

```powershell
.\node_modules\.bin\vitest.cmd run src\features\chat-shortcuts\chatShortcutViewModel.test.ts
```

**Step 3: Implement the hook and panel**

`useChatDestinations` owns storage-backed state and exposes pin, remove, rename, reorder, and refresh operations. The panel contains:

- `Voice destinations` with numbered rows and accessible up/down controls.
- `Recent chats` loaded on first entry and on explicit refresh only.
- `Pin`, `Pinned`, `Rename`, and `Remove` actions.
- A small manual-entry flow that accepts an ID or canonical deep link.
- One inline discovery fallback: `Recent chats unavailable. Add a chat manually.`

Do not add transcript previews, background polling, fake sample chats, or drag-and-drop-only controls.

**Step 4: Wire shared destination state at App level**

Load destination state once in `App.tsx` so Voice Flow and the management view share the same source. Persist every accepted change.

**Step 5: Style within the compact shell**

Use the existing charcoal tokens, Tabler icons, visible focus states, and a bounded internal scroll area. Keep the 410×370 main window unchanged.

**Step 6: Run checks**

```powershell
.\node_modules\.bin\vitest.cmd run src\features\chat-shortcuts
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd .
.\node_modules\.bin\prettier.cmd --check src\features\chat-shortcuts src\app
```

**Step 7: Commit**

```powershell
git add src/features/chat-shortcuts src/app
git commit -m "feat: manage Voice Flow chat destinations"
```

---

## Task 6: Add the dedicated selector window

**Files:**

- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`
- Create: `src-tauri/capabilities/voice-selector.json`
- Create: `src-tauri/src/voice_selector.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/main.tsx`
- Create: `src/features/chat-shortcuts/VoiceDestinationSelectorApp.tsx`
- Create: `src/features/chat-shortcuts/voiceSelectorEvents.ts`
- Create: `src/features/chat-shortcuts/voiceSelectorEvents.test.ts`
- Create: `src/features/chat-shortcuts/voiceSelectorClient.ts`

**Step 1: Write selector event/parser tests**

Define narrow payloads:

```ts
type VoiceSelectorOpenPayload = { destinations: ChatDestination[] };
type VoiceSelectorSelection = { kind: "current" } | { kind: "saved"; destinationId: string };
```

Test `Digit0` through `Digit9`, numpad equivalents, `Escape`, invalid payloads, duplicate numbers, and out-of-range keys.

**Step 2: Configure the hidden window**

Add a `voice-selector` window with a dedicated URL marker, approximately 320 px wide, hidden by default, frameless, non-resizable, always on top, focusable, and skipped from the taskbar.

Give it a separate minimal capability containing only the core event/window permissions it actually uses. Do not grant autostart, opener, or broad window-management permissions.

**Step 3: Implement native show/hide positioning**

`voice_selector.rs` exposes fixed commands to:

- Show and focus the existing selector window.
- Position it near the cursor and clamp it to the active monitor work area.
- Hide it.

No command accepts arbitrary window labels, sizes, or URLs.

**Step 4: Render by Tauri window label**

In `src/main.tsx`, render `VoiceDestinationSelectorApp` only for the `voice-selector` label and render the normal `App` otherwise.

**Step 5: Implement selector interaction**

- Reload destinations when the open event arrives.
- Prevent default Space repetition while the selector is focused.
- Accept exactly one number/click selection.
- Emit or invoke one narrow selection action.
- Hide on `Escape`.
- Do not start Voice Flow inside the selector webview itself.

**Step 6: Run checks**

```powershell
.\node_modules\.bin\vitest.cmd run src\features\chat-shortcuts\voiceSelectorEvents.test.ts
.\node_modules\.bin\tsc.cmd --noEmit
cargo test --manifest-path src-tauri\Cargo.toml voice_selector
cargo check --manifest-path src-tauri\Cargo.toml
```

**Step 7: Commit**

```powershell
git add src-tauri src/main.tsx src/features/chat-shortcuts
git commit -m "feat: add Voice Flow destination selector"
```

---

## Task 7: Add targeted thread opening without process launch

**Files:**

- Modify: `src-tauri/src/window_focus.rs`
- Modify: `src-tauri/src/codex_threads.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/features/voice-flow/controllers.ts`
- Modify: `src/features/voice-flow/nativeControllers.ts`
- Modify: `src/features/voice-flow/nativeControllers.test.ts`

**Step 1: Write Rust behavior tests around policies**

Extract pure policy decisions and test:

- Current-chat focus can use direct activation.
- Targeted-chat focus must dispatch the canonical deep link after verifying a supported window exists.
- Missing supported process returns `waitingForCodex` without invoking the opener.
- Invalid thread IDs never invoke the opener.
- Target activation preserves maximization and uses the existing composer focus point.

Use injected closures for process detection and opener dispatch; do not launch ChatGPT in unit tests.

**Step 2: Implement a targeted native command**

```rust
#[tauri::command]
fn focus_codex_thread(
    app: tauri::AppHandle,
    thread_id: String,
) -> Result<window_focus::WindowFocusStep, String>;
```

The command must:

1. Validate `thread_id`.
2. Confirm a verified Codex/ChatGPT top-level window already exists.
3. Build the canonical deep link internally.
4. Dispatch it through the official opener.
5. Wait for navigation/activation with a bounded deadline.
6. Maximize, focus, and focus the composer.

It must not open the process when no verified window exists.

**Step 3: Extend the frontend WindowController**

Add `focusCodexThread(threadId)` with strict native response parsing. Add tests for focused, waiting, malformed, and failed responses.

**Step 4: Run checks**

```powershell
cargo test --manifest-path src-tauri\Cargo.toml window_focus
cargo test --manifest-path src-tauri\Cargo.toml codex_threads
.\node_modules\.bin\vitest.cmd run src\features\voice-flow\nativeControllers.test.ts
.\node_modules\.bin\tsc.cmd --noEmit
```

**Step 5: Commit**

```powershell
git add src-tauri/src src/features/voice-flow
git commit -m "feat: focus a selected Codex chat"
```

---

## Task 8: Integrate selector state with push-to-talk Voice Flow

**Files:**

- Create: `src/features/voice-flow/voiceDestinationFlow.ts`
- Create: `src/features/voice-flow/voiceDestinationFlow.test.ts`
- Modify: `src/features/voice-flow/voiceFlowService.ts`
- Modify: `src/features/voice-flow/voiceFlowService.test.ts`
- Modify: `src/features/voice-flow/useVoiceFlow.ts`
- Modify: `src/app/App.tsx`

**Step 1: Write state-machine tests first**

Cover these transitions:

```text
idle -> selecting -> starting -> listening -> idle
idle -> selecting -> cancelled -> idle
selecting + release -> cancelled
selecting + first selection -> starting
selecting + duplicate selection -> ignored
starting + release -> release after press completes
listening + release -> dictation released and audio restored
```

Also test:

- No pinned destinations bypasses the selector and uses current chat.
- `0` uses current-chat focus.
- `1–9` resolves by current normalized order.
- Deleted destination IDs are rejected.
- Audio is untouched while the selector is pending.
- Target-open/focus failure never presses dictation and restores any prepared audio.

**Step 2: Run and verify failure**

```powershell
.\node_modules\.bin\vitest.cmd run src\features\voice-flow\voiceDestinationFlow.test.ts
```

**Step 3: Implement orchestration as a pure service plus hook adapter**

Keep global-hotkey event parsing unchanged. On press:

- If zero destinations: call current `startHold()`.
- Otherwise set the physical hold request, show the selector, and do not touch audio.

On selection:

- Atomically consume the pending selector state.
- Hide the selector.
- Resolve current or saved target.
- Focus the correct target.
- Prepare audio after target focus succeeds.
- Press dictation only while the physical hold remains requested.

On release:

- Cancel a pending selector or stop an active hold.
- Always hide the selector.
- Preserve the existing guaranteed dictation release and audio restoration.

**Step 4: Keep error status concise**

Map failures to the existing `Needs attention` surface without a scrolling log. Distinguish unavailable discovery from target-open, focus, dictation, and audio failures.

**Step 5: Run focused and full frontend checks**

```powershell
.\node_modules\.bin\vitest.cmd run src\features\voice-flow
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd .
```

**Step 6: Commit**

```powershell
git add src/features/voice-flow src/app/App.tsx
git commit -m "feat: route Voice Flow through chat selection"
```

---

## Task 9: Polish accessibility and compact visual behavior

**Files:**

- Modify: `src/app/App.css`
- Modify: `src/features/chat-shortcuts/ChatShortcutsPanel.tsx`
- Modify: `src/features/chat-shortcuts/VoiceDestinationSelectorApp.tsx`

**Step 1: Verify interaction contracts manually in dev mode**

- Selector displays `0` plus normalized `1–9` rows.
- Number and numpad keys work.
- Mouse click works while the hold remains active.
- `Escape` and shortcut release cancel.
- Focus indicators are visible.
- Long names truncate without moving number badges.
- The selector remains on the active monitor and never renders off-screen.
- Reduced-motion preference disables nonessential motion.

**Step 2: Apply minimal styling**

Match the approved compact toolbox: neutral charcoal surface, Tabler outline icons, low-contrast dividers, no gradients, no glass, no fake metadata, and no oversized cards.

**Step 3: Run format and static checks**

```powershell
.\node_modules\.bin\prettier.cmd --write src\app\App.css src\features\chat-shortcuts
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd .
```

**Step 4: Commit**

```powershell
git add src/app/App.css src/features/chat-shortcuts
git commit -m "style: polish chat destination selector"
```

---

## Task 10: End-to-end validation and handoff

**Files:**

- Modify only files required by defects found during validation.
- Update: `docs/plans/2026-07-18-chat-destination-selector-implementation.md` only if the verified protocol materially differs from the plan.

**Step 1: Run the complete automated suite**

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd .
.\node_modules\.bin\vitest.cmd run
.\node_modules\.bin\prettier.cmd --check src package.json src-tauri\tauri.conf.json src-tauri\capabilities docs\plans
cargo test --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
.\node_modules\.bin\vite.cmd build
```

If available:

```powershell
cargo fmt --manifest-path src-tauri\Cargo.toml -- --check
cargo clippy --manifest-path src-tauri\Cargo.toml -- -D warnings
```

Expected: all installed checks pass.

**Step 2: Run the manual matrix against the real ChatGPT/Codex app**

1. No pinned destinations: existing Voice Flow remains unchanged.
2. One pinned destination: selector shows `0` and `1`.
3. Multiple destinations: keys match visual order.
4. Current chat: dictation starts without navigation.
5. Saved chat: official deep link opens the exact chat, maximized, then dictation starts.
6. Release before selection: no audio change and no dictation.
7. Release during navigation: no stuck keys and audio restored.
8. ChatGPT closed: it is not launched; QLayer shows the waiting state.
9. Discovery unavailable: pinned/manual destinations continue working.
10. Invalid/deleted destination: safe error, no arbitrary URL opened.
11. Close/reopen QLayer: pinned order persists.
12. Selector works on each monitor and remains movable only through intended behavior.

Do not claim completion until the user confirms exact-chat navigation and dictation in the real app.

**Step 3: Commit validation fixes**

```powershell
git add <only-files-changed-by-validation>
git commit -m "fix: harden Voice Flow chat selection"
```

**Step 4: Final handoff**

Report:

- Automated check totals.
- Manual scenarios confirmed by the user.
- Any unavailable Rust components.
- That App Server discovery is optional and experimental.
- That no auth files, tokens, chat content, internal databases, telemetry, or cloud sync were added.
