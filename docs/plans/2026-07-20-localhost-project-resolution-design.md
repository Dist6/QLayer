# Robust Localhost Project Resolution

**Status:** Approved

## Goal

Improve Localhost Manager so it can reliably identify more native Windows development projects, frameworks, server roles, and related ports without broad filesystem access, shell commands, network probing, or exposure of sensitive process metadata.

## Current limitation

The current resolver identifies a project only when the listener process command line contains an absolute `node_modules` path. This works for QLayer's Vite process but misses relative entry points, parent package-manager processes, compiled applications, and non-Node ecosystems.

Listener discovery, process ownership, memory, CPU, uptime, safe URL opening, and unknown-listener isolation remain sound and should not be replaced.

## Resolution pipeline

For every listener, Rust builds evidence in a bounded sequence:

1. Inspect the exact process that owns the port.
2. Walk at most four parent processes using native Windows process snapshots.
3. Extract absolute path candidates from executable paths and process command lines.
4. Normalize and deduplicate candidates without returning them to the frontend.
5. Walk at most five ancestors from each candidate, stopping at user-profile, drive, or repository boundaries.
6. Check only explicitly allowlisted project manifests in those directories.
7. Derive a sanitized project identity, framework, and server role.
8. Fall back to a locally saved manual alias when automatic evidence is insufficient.
9. Return no project name when neither automatic nor confirmed manual evidence exists.

The resolver never scans directories recursively.

## Allowed manifests

Only these files may be inspected:

- `package.json`
- `pyproject.toml`
- `Cargo.toml`
- `go.mod`
- One directly discovered `.csproj` file in a candidate directory

Each file has a 256 KB size limit. Parsing reads only identity and dependency-key metadata needed for classification:

- Package/project/module name
- Declared dependency names
- Framework package names
- Assembly name or root namespace when present

Script bodies, environment files, lockfiles, source files, credentials, tokens, and arbitrary configuration files are excluded.

## Project identity precedence

```text
Confirmed manual alias
  -> manifest project name
  -> reliable candidate folder name
  -> no name
```

The displayed name is sanitized, length-limited, and never replaced with `Unknown`, `Unnamed`, or another placeholder.

Manual aliases are stored locally. They are keyed by an opaque fingerprint derived from the normalized project root when available. Raw project paths remain private to Rust and are not exposed through Tauri commands or frontend storage.

## Framework and role inference

Role inference combines command signatures and manifest dependency keys. A port alone never establishes a role.

- **Frontend:** Vite, React Scripts, Angular CLI, Astro, webpack dev server, and equivalent explicit frontend tooling.
- **Backend:** FastAPI/Uvicorn, Django, Flask, NestJS, ASP.NET, Spring Boot, Laravel, Rails, Axum, Actix, and equivalent explicit backend tooling.
- **Full-stack:** Next.js, Nuxt, Remix, SvelteKit, and frameworks with explicit full-stack evidence.
- **Dev server:** The process is confidently a development runtime but its role is not reliable.

The classifier records internal evidence and confidence. Only high-confidence automatic labels are displayed. Confirmed aliases do not change the server role.

## Process-family correlation

Native Windows process snapshots provide parent PIDs without launching commands. A maximum depth of four avoids broad process crawling.

The listener process and its bounded parent chain may contribute evidence, but the port remains owned by the original process. Parent metadata is used only to locate a project launcher or manifest.

Raw command lines are ephemeral: they are never logged, persisted, serialized, or returned to React.

## Grouping related ports

Servers sharing the same resolved project fingerprint may be presented as one project group with multiple endpoints. Grouping requires strong project-root or process-family evidence; matching process names or nearby ports is insufficient.

The first release of grouping keeps every endpoint independently actionable and does not guess which port is primary. Auxiliary ports remain visible under the project rather than being silently discarded.

## Manual alias UX

Rows without a project name expose a small **Name project** action through progressive disclosure. Named rows expose **Rename** and **Remove name** actions.

The form requests only a display name. It never asks the user for a PID, command, executable, or filesystem path.

Alias changes affect presentation only. They cannot change classification, opening policy, process ownership, or trusted URLs.

## Refresh and caching

- Project evidence is recomputed when process identity changes.
- Manifest results are cached by private normalized path plus modification time.
- The cache is bounded and cleared when entries are no longer referenced.
- Automatic refresh reuses cached evidence and does not repeatedly reread unchanged manifests.
- Disappearing parents or manifests degrade to remaining evidence without failing the full snapshot.

## Safety boundaries

- No shell, PowerShell, WMI command execution, arbitrary commands, or broad process control.
- No recursive filesystem scan.
- No `.env`, credentials, tokens, browser data, Codex auth, source files, or network traffic.
- No HTTP requests, TCP probes, proxying, or packet inspection.
- No frontend-provided PID, URL, path, or command.
- No automatic stop or restart.
- Docker, WSL, IDE port forwarding, and container-to-host proxy resolution are deferred because they require separate integrations and permissions.

## Expected limits

Some listeners cannot be mapped automatically:

- Compiled binaries with no recoverable project metadata
- Docker or WSL proxy processes
- IDE and remote-development port forwarders
- Services launched without a useful path or parent process

Manual aliases are the deliberate fallback for these cases. The product should prefer a blank name over an incorrect one.

## Implementation passes

### Pass 1: Evidence engine

- Parent-process discovery
- Absolute path candidate extraction
- Bounded project-root resolution
- Pure tests with fixtures

### Pass 2: Manifest resolvers

- Allowlisted parsers and size limits
- Framework/dependency evidence
- Cache and failure isolation
- Ecosystem fixture tests

### Pass 3: Aliases and UI

- Opaque project fingerprints
- Local alias storage through narrow Tauri commands
- Name, rename, and remove-name interactions
- Updated server rows and states

### Pass 4: Project grouping

- Strong-evidence endpoint grouping
- Compact grouped UI
- Independent safe-open actions per endpoint

Docker, WSL, stop/restart, and history remain separate future designs.
