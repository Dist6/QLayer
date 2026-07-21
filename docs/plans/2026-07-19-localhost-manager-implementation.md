# Localhost Manager Implementation Plan

**Goal:** Build a compact Windows-only Quick Tool that safely discovers, classifies, displays, and opens active local development servers.

**Architecture:** Rust performs listener/process inspection through narrow Win32 APIs and stores private snapshot metadata. React receives sanitized contracts through two Tauri commands: one for discovery and one for opening a previously discovered development server. Pure classification, normalization, formatting, and state transitions are covered with fixture-based tests.

**Tech Stack:** Tauri 2, Rust, `windows` crate 0.61, React 19, strict TypeScript, Vitest, Tabler Icons.

---

## Preflight

Do not begin Pass 1 until the existing Voice Flow and UI work has been validated and committed separately. Preserve the current dirty worktree and do not mix unrelated files into Localhost Manager commits.

Run:

```powershell
git status --short
git diff --check
```

## Pass 1: Native discovery and manual refresh

### Task 1: Add native contracts and classification fixtures

**Files:**

- Create: `src-tauri/src/localhost_manager/mod.rs`
- Create: `src-tauri/src/localhost_manager/models.rs`
- Create: `src-tauri/src/localhost_manager/classification.rs`
- Modify: `src-tauri/src/main.rs`

**Step 1: Write failing Rust tests**

```rust
#[test]
fn normalizes_loopback_and_wildcard_bindings_to_localhost_urls() {}

#[test]
fn deduplicates_ipv4_and_ipv6_rows_for_the_same_process_and_port() {}

#[test]
fn system_processes_are_never_classified_as_development() {}

#[test]
fn common_ports_do_not_establish_development_status_by_themselves() {}

#[test]
fn recognized_user_space_runtimes_are_probable_development_servers() {}
```

The serialized public model must contain only sanitized fields:

```rust
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalhostServer {
    id: String,
    display_address: String,
    url: Option<String>,
    port: u16,
    is_running: bool,
    process_name: Option<String>,
    memory_bytes: Option<u64>,
    started_at_ms: Option<u64>,
    uptime_seconds: Option<u64>,
    cpu_percent: Option<f32>,
    project_name: Option<String>,
    classification: ServerClassification,
    kind: DevelopmentServerKind,
    binding: ListenerBinding,
}
```

**Step 2: Run the tests and verify failure**

```powershell
cargo test --manifest-path src-tauri\Cargo.toml localhost_manager
```

**Step 3: Implement only pure models and classification**

Keep PID, process creation time, executable path, and raw address in a private `DiscoveredListener`. Generate snapshot-scoped IDs later; never encode PID into the public ID.

**Step 4: Verify and commit**

```powershell
cargo test --manifest-path src-tauri\Cargo.toml localhost_manager
git add src-tauri/src/localhost_manager src-tauri/src/main.rs
git commit -m "feat: add localhost discovery contracts"
```

### Task 2: Implement IPv4 and IPv6 listener discovery

**Files:**

- Create: `src-tauri/src/localhost_manager/windows_discovery.rs`
- Modify: `src-tauri/src/localhost_manager/mod.rs`
- Modify: `src-tauri/Cargo.toml`

**Step 1: Add failing adapter tests**

Use fixture rows rather than the live developer machine. Test port byte order, IPv4/IPv6 loopback, wildcard bindings, invalid rows, deduplication, and a process disappearing mid-snapshot.

**Step 2: Enable only required Windows features**

Confirm the installed 0.61 API surface, then add:

```toml
"Win32_NetworkManagement_IpHelper",
"Win32_Networking_WinSock",
"Win32_System_ProcessStatus",
```

Retain the existing `Win32_System_Threading` feature.

**Step 3: Implement discovery**

Call `GetExtendedTcpTable` with `TCP_TABLE_OWNER_PID_LISTENER` for `AF_INET` and `AF_INET6`. Allocate the buffer using the size returned with `ERROR_INSUFFICIENT_BUFFER`. Discard non-local/non-wildcard addresses immediately.

Do not call `Command`, `netstat`, PowerShell, WMI, or an HTTP endpoint.

**Step 4: Verify and commit**

```powershell
cargo test --manifest-path src-tauri\Cargo.toml localhost_manager
cargo check --manifest-path src-tauri\Cargo.toml
git add src-tauri/Cargo.toml src-tauri/src/localhost_manager
git commit -m "feat: discover local Windows listeners"
```

### Task 3: Add limited process inspection

**Files:**

- Create: `src-tauri/src/localhost_manager/process_info.rs`
- Modify: `src-tauri/src/localhost_manager/windows_discovery.rs`
- Modify: `src-tauri/src/localhost_manager/classification.rs`

**Step 1: Write failing tests**

Test executable basename sanitization, protected-system path recognition, null metadata on access denial, and one process lookup reused for multiple ports.

**Step 2: Implement**

Open each unique PID with `PROCESS_QUERY_LIMITED_INFORMATION`. Use `QueryFullProcessImageNameW`, expose only the basename, and drop the full path before serialization.

Do not retrieve command lines or working directories in Pass 1.

**Step 3: Verify and commit**

```powershell
cargo test --manifest-path src-tauri\Cargo.toml localhost_manager
cargo check --manifest-path src-tauri\Cargo.toml
git add src-tauri/src/localhost_manager
git commit -m "feat: identify localhost listener processes"
```

### Task 4: Expose manual discovery through Tauri

**Files:**

- Modify: `src-tauri/src/localhost_manager/mod.rs`
- Modify: `src-tauri/src/main.rs`
- Create: `src/features/localhost-manager/localhostManagerTypes.ts`
- Create: `src/features/localhost-manager/localhostManagerClient.ts`
- Create: `src/features/localhost-manager/localhostManagerClient.test.ts`

**Step 1: Write failing parser tests**

Reject malformed ports, remote URLs, invalid classifications, negative resource values, and unexpected arrays. Accept nullable process/resource fields.

**Step 2: Add private snapshot state**

```rust
pub struct LocalhostManagerState {
    snapshot: Mutex<TrustedSnapshot>,
}
```

Expose one argument-free discovery command:

```rust
#[tauri::command]
async fn list_localhost_servers(
    state: tauri::State<'_, localhost_manager::LocalhostManagerState>,
) -> Result<Vec<localhost_manager::LocalhostServer>, String>;
```

Run Win32 inspection through `tauri::async_runtime::spawn_blocking`.

**Step 3: Implement the strict frontend client**

```ts
export async function listLocalhostServers(): Promise<LocalhostServer[]> {
  return parseLocalhostServers(await invoke("list_localhost_servers"));
}
```

**Step 4: Verify Pass 1 and commit**

```powershell
.\node_modules\.bin\vitest.cmd run src/features/localhost-manager/localhostManagerClient.test.ts
.\node_modules\.bin\tsc.cmd --noEmit
cargo test --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
git add src-tauri/src/main.rs src-tauri/src/localhost_manager src/features/localhost-manager
git commit -m "feat: expose localhost server discovery"
```

## Pass 2: Compact Quick Tool UI and safe open

### Task 5: Add Localhost Manager navigation

**Files:**

- Modify: `src/features/toolbox/toolboxViews.ts`
- Modify: `src/features/toolbox/ToolboxSidebar.tsx`
- Modify: `src/features/toolbox/windowSizing.ts`
- Modify: `src/features/toolbox/windowSizing.test.ts`
- Modify: `src/app/App.tsx`

**Step 1: Write failing view/size tests**

Add `localhostManager` to `ToolboxView`, use a Tabler server icon, and assign a 450px tool height with internal scrolling.

**Step 2: Implement navigation and verify**

```powershell
.\node_modules\.bin\vitest.cmd run src/features/toolbox/windowSizing.test.ts
.\node_modules\.bin\tsc.cmd --noEmit
git add src/features/toolbox src/app/App.tsx
git commit -m "feat: add Localhost Manager navigation"
```

### Task 6: Build the refresh state and compact panel

**Files:**

- Create: `src/features/localhost-manager/useLocalhostServers.ts`
- Create: `src/features/localhost-manager/LocalhostManagerPanel.tsx`
- Create: `src/features/localhost-manager/LocalhostManagerPanel.test.tsx`
- Create: `src/features/localhost-manager/localhostManagerFormatters.ts`
- Create: `src/features/localhost-manager/localhostManagerFormatters.test.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.css`

**Step 1: Write failing state/rendering tests**

Cover first-load loading, retained rows during refresh, empty state, development rows, collapsed unknown rows, partial metadata, retryable error, disabled refresh during discovery, and cancelled results after unmount.

Formatter boundaries:

```ts
formatMemory(184_000_000) === "184 MB";
formatUptime(42 * 60) === "42m";
formatUptime(2 * 3600 + 18 * 60) === "2h 18m";
formatUptime(3 * 86400 + 4 * 3600) === "3d 4h";
```

**Step 2: Implement the approved UI**

Use semantic buttons, 14px minimum text, visible keyboard focus, `aria-expanded` for unknown listeners, and `aria-live="polite"` for refresh outcomes. Use rows, not large cards.

**Step 3: Verify and commit**

```powershell
.\node_modules\.bin\vitest.cmd run src/features/localhost-manager
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd .
git add src/features/localhost-manager src/app/App.tsx src/app/App.css
git commit -m "feat: add compact Localhost Manager panel"
```

### Task 7: Add the allowlisted open action

**Files:**

- Modify: `src-tauri/src/localhost_manager/mod.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/features/localhost-manager/localhostManagerClient.ts`
- Modify: `src/features/localhost-manager/LocalhostManagerPanel.tsx`
- Modify: corresponding Rust and TypeScript tests

**Step 1: Write failing security tests**

Reject unknown IDs, stale snapshots, unknown classifications, disappeared PIDs, changed process creation times, non-local hosts, invalid ports, and non-HTTP schemes.

**Step 2: Implement the narrow command**

```rust
#[tauri::command]
fn open_localhost_server(
    app: tauri::AppHandle,
    state: tauri::State<localhost_manager::LocalhostManagerState>,
    server_id: String,
) -> Result<(), String>;
```

Revalidate the trusted listener identity before calling `app.opener().open_url(...)`. Never accept a URL from React.

**Step 3: Verify and commit**

```powershell
cargo test --manifest-path src-tauri\Cargo.toml localhost_manager
.\node_modules\.bin\vitest.cmd run src/features/localhost-manager
git add src-tauri/src src/features/localhost-manager
git commit -m "feat: open trusted localhost servers"
```

## Pass 3: Resources, uptime, CPU, and restrained refresh

### Task 8: Add memory and process uptime

**Files:**

- Modify: `src-tauri/src/localhost_manager/process_info.rs`
- Modify: `src-tauri/src/localhost_manager/models.rs`
- Modify: `src/features/localhost-manager/localhostManagerTypes.ts`
- Modify: `src/features/localhost-manager/LocalhostManagerPanel.tsx`
- Modify: corresponding tests

**Step 1: Write failing conversion tests**

Test `FILETIME` conversion, future/invalid creation times, access-denied nulls, and uptime using an injected clock.

**Step 2: Implement**

Use `GetProcessMemoryInfo` and `GetProcessTimes`. Keep failures local to each field. Update displayed uptime once per minute in React without rediscovery.

**Step 3: Verify and commit**

```powershell
cargo test --manifest-path src-tauri\Cargo.toml localhost_manager
.\node_modules\.bin\vitest.cmd run src/features/localhost-manager
git add src-tauri/src/localhost_manager src/features/localhost-manager
git commit -m "feat: show localhost resources and uptime"
```

### Task 9: Add optional CPU deltas

**Files:**

- Modify: `src-tauri/src/localhost_manager/process_info.rs`
- Modify: `src-tauri/src/localhost_manager/mod.rs`
- Modify: corresponding tests

**Step 1: Write failing sampling tests**

Require matching PID and creation time, a positive wall-time delta, and two valid cumulative CPU samples. Normalize by `std::thread::available_parallelism()`, clamp to 0–100, and return null for the first sample.

**Step 2: Implement without another polling loop**

CPU is derived only when discovery already runs.

**Step 3: Verify and commit**

```powershell
cargo test --manifest-path src-tauri\Cargo.toml localhost_manager
git add src-tauri/src/localhost_manager
git commit -m "feat: calculate lightweight localhost CPU usage"
```

### Task 10: Add visibility-bound auto-refresh settings

**Files:**

- Modify: `src/features/settings/settingsTypes.ts`
- Modify: `src/features/settings/defaultSettings.ts`
- Modify: `src/features/settings/settingsValidation.ts`
- Modify: `src/features/settings/settings.test.ts`
- Modify: `src/features/settings/SettingsPage.tsx`
- Modify: `src/features/localhost-manager/useLocalhostServers.ts`
- Modify: corresponding tests

**Step 1: Write failing tests**

```ts
localhostManager: {
  autoRefreshSeconds: 15 as 15 | 30 | 60 | null,
}
```

Test default 15 seconds, accepted values, invalid recovery, interval cleanup, no overlap, hidden-window skipping, and visibility restart.

**Step 2: Implement**

Render `Off`, `15s`, `30s`, and `60s`. Keep the interval only while the panel is mounted and skip rather than queue if discovery is active.

**Step 3: Verify and commit**

```powershell
.\node_modules\.bin\vitest.cmd run src/features/settings src/features/localhost-manager
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd .
git add src/features/settings src/features/localhost-manager
git commit -m "feat: add restrained localhost auto refresh"
```

### Task 11: Improve identification only with reliable evidence

**Files:**

- Modify: `src-tauri/src/localhost_manager/classification.rs`
- Modify: `src-tauri/src/localhost_manager/process_info.rs`
- Modify: corresponding tests

**Step 1: Add positive and false-positive fixtures**

No frontend/backend/full-stack or project label may be added without both fixture types.

**Step 2: Add only evidence-backed signals**

Do not scan arbitrary directories or expose command lines. Leave `kind` and `projectName` unknown/null when evidence is insufficient.

**Step 3: Verify and commit**

```powershell
cargo test --manifest-path src-tauri\Cargo.toml localhost_manager
git add src-tauri/src/localhost_manager
git commit -m "feat: refine localhost server identification"
```

## Final verification for Passes 1–3

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd .
.\node_modules\.bin\vitest.cmd run
.\node_modules\.bin\vite.cmd build
cargo test --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
cargo fmt --manifest-path src-tauri\Cargo.toml -- --check
cargo clippy --manifest-path src-tauri\Cargo.toml -- -D warnings
git diff --check
```

If `rustfmt` or `clippy` is unavailable, report that explicitly.

Perform a real Windows validation with user approval:

1. Start one frontend server and one backend server.
2. Confirm both appear without PID or full paths.
3. Confirm an unrelated service appears only under collapsed unknown listeners.
4. Open a development server and verify only the trusted local URL is sent to the browser.
5. Stop a test server externally and confirm it disappears on refresh.
6. Confirm memory, uptime, and second-sample CPU degrade gracefully when access is denied.
7. Hide QLayer to tray and verify automatic discovery stops.

Do not implement Pass 4 in this plan. Stop/restart, pins, history, and grouping require a separate approved design and security review.
