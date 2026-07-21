# Localhost Manager Design

**Status:** Approved

**Goal:** Give developers one compact, local-only view of the development servers currently listening on their Windows machine.

## Product intent

Localhost Manager answers four questions without requiring Task Manager, a terminal, or memorized ports:

1. Which local development servers are running?
2. Which address and port belongs to each server?
3. Which process owns it and how many resources is it using?
4. How can the user open the server quickly?

It is not a generic socket inspector, traffic proxy, process manager, or command runner.

## First-release scope

- Detect TCP listeners bound to `127.0.0.0/8`, `::1`, `0.0.0.0`, or `::`.
- Normalize browser-facing development URLs to `http://localhost:<port>`.
- Deduplicate IPv4/IPv6 rows that represent the same PID and port.
- Separate probable development servers from unknown local listeners.
- Show process name when Windows permits it.
- Keep PID and full executable paths inside Rust.
- Show memory and process uptime when Windows permits it.
- Show CPU only after two clean samples of the same process identity.
- Open only a development server returned by the most recent trusted snapshot.
- Refresh on panel entry, manually, and every 15 seconds while the panel is visible.
- Handle missing, inaccessible, and disappearing processes without failing the entire list.

## Explicit exclusions

- No shell, PowerShell, `netstat`, or arbitrary process execution.
- No stop, restart, kill, or signal operation in this release.
- No HTTP probing, traffic inspection, proxying, or packet capture.
- No browser cookies, credentials, Codex auth, or unrelated file access.
- No arbitrary PID or URL supplied by the frontend.
- No promise that every local listener is HTTP.
- No guessed project directory or frontend/backend label without reliable evidence.

## Discovery architecture

QoLayer will call the native Windows `GetExtendedTcpTable` API twice with `TCP_TABLE_OWNER_PID_LISTENER`: once for IPv4 and once for IPv6. The result supplies local addresses, ports, and owning PIDs without launching a subprocess.

Each unique process is opened with `PROCESS_QUERY_LIMITED_INFORMATION`. QoLayer may then use:

- `QueryFullProcessImageNameW` for the executable image name.
- `GetProcessMemoryInfo` for working-set memory.
- `GetProcessTimes` for creation time and cumulative CPU time.

Every process field is nullable. Access-denied or process-exited errors affect only that listener.

## Classification

The classifier is deterministic and pure so it can be tested with fixtures.

### Development signals

- Listener is loopback or all-interfaces.
- Process is not a protected/system process.
- Executable name is a recognized development runtime such as Node.js, Bun, Deno, Python, .NET, Java, PHP, or Ruby.
- Executable location is a user-space location when safely known.
- A common development port may increase confidence but never establishes development status by itself.

### Unknown signals

- Windows system process or executable under a protected Windows system directory.
- PID cannot be inspected.
- Process name is generic and no stronger development signal exists.
- Listener looks like a database, system service, IPC endpoint, or non-HTTP service.

Unknown listeners appear under a collapsed **Other local listeners** section. The user can inspect them, but they do not receive an **Open** action.

Frontend, backend, and full-stack servers share the same main list. The optional role is shown only when reliable metadata supports it; otherwise the label is **Development server**.

## Data contract

```ts
export type LocalhostServerClassification = "development" | "unknown";
export type DevelopmentServerKind = "frontend" | "backend" | "fullStack" | "unknown";
export type LocalhostBinding = "loopback" | "allInterfaces";

export type LocalhostServer = {
  id: string;
  displayAddress: string;
  url: string | null;
  port: number;
  isRunning: boolean;
  processName: string | null;
  memoryBytes: number | null;
  startedAtMs: number | null;
  uptimeSeconds: number | null;
  cpuPercent: number | null;
  projectName: string | null;
  classification: LocalhostServerClassification;
  kind: DevelopmentServerKind;
  binding: LocalhostBinding;
};
```

`id` is a snapshot-scoped opaque identifier. It must not encode or expose a PID. Rust retains the PID, process creation time, bound address, executable path, and classification evidence in its private snapshot state.

## Safe open action

The frontend calls `open_localhost_server(serverId)`. Rust looks up the opaque ID in its latest snapshot, confirms the entry is classified as development, confirms the listener still exists with the same process identity, reconstructs the allowlisted local HTTP URL, and opens it through the Tauri opener plugin.

The command never accepts an arbitrary URL, host, port, executable, PID, or shell command.

## UI design

Localhost Manager is a compact Quick Tool inside the existing 440-pixel toolbox window.

Header:

- **Localhost Manager**
- Running count, for example **4 running**
- Compact refresh icon button

Content:

- Expanded **Development servers** section
- Collapsed **Other local listeners** section
- Scroll contained inside the panel

Each server uses a compact row rather than a large card:

```text
●  localhost:5173          Vite
   node.exe · Frontend     184 MB · 42m      ↗
```

The minimum text size remains 14px. The row supports loading skeletons, keyboard focus, an accessible full uptime label such as **Running for 2 hours 18 minutes**, and an optional compact kind badge.

States:

- Loading: restrained row skeletons.
- Empty: **No local development servers detected.**
- Partial: show valid rows plus one compact inspection warning.
- Error: concise explanation and **Try again**.
- Disappeared process: remove on the next snapshot without a global error.

## Refresh and resource behavior

- Refresh immediately when the panel mounts.
- Manual **Refresh** is always available.
- Default auto-refresh interval is 15 seconds.
- Auto-refresh runs only while the QoLayer window and Localhost Manager panel are visible.
- Do not overlap discoveries; skip an interval when a previous discovery is still running.
- Update displayed uptime locally once per minute without native discovery.
- Preserve previous rows during background refresh to avoid visual flashing.
- CPU requires two samples with matching PID and creation time; otherwise it remains null.
- Normalize CPU across available logical processors and clamp the result to 0–100%.

Settings provide **Off**, **15s**, **30s**, and **60s** choices.

## Passes

### Pass 1

- Data contracts
- Windows listener and process discovery
- Conservative classification and deduplication
- Manual refresh command/client
- Unit tests

### Pass 2

- Sidebar entry and compact panel
- Loading, empty, partial, and error states
- Safe open action
- UI tests

### Pass 3

- Memory, uptime, and optional CPU deltas
- Visibility-bound restrained auto-refresh
- Conservative process/project/type identification improvements
- Settings validation and tests

### Pass 4 — deferred

- Explicitly confirmed stop/restart
- Pinned servers
- Saved-project associations
- Project grouping and history

Pass 4 requires a separate design and security review before implementation.

## References

- Microsoft `GetExtendedTcpTable`: https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getextendedtcptable
- Microsoft `QueryFullProcessImageNameW`: https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-queryfullprocessimagenamew
- Microsoft `GetProcessMemoryInfo`: https://learn.microsoft.com/en-us/windows/win32/api/psapi/nf-psapi-getprocessmemoryinfo
- Microsoft `GetProcessTimes`: https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes
