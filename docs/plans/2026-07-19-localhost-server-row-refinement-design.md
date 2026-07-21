# Localhost Server Row Refinement

**Status:** Approved

## Goal

Make every Localhost Manager row readable inside QoLayer's compact window while identifying the project and server role only when local process evidence is reliable.

## Information hierarchy

Each development server uses three visible lines:

```text
localhost:1420 (QoLayer)
Frontend · node.exe
573 MB · 0.3% CPU · Up 3h 45m
```

- Line 1: normalized localhost address and optional project name.
- Line 2: concise role (`Frontend`, `Backend`, `Full-stack`, or `Dev server`) and optional process name.
- Line 3: available memory, CPU, and uptime values.
- Missing values are omitted rather than replaced with noisy placeholders.
- If no reliable project name exists, show only the localhost address.

## Local identification

- Read process command-line metadata locally through a narrow Windows process API.
- Never return or display the full command line or executable path.
- Derive a project name only from a trustworthy absolute path owned by the launched development command, such as the directory immediately before `node_modules`.
- Infer a server role only from recognized framework/runtime signatures.
- Use `Dev server` when development classification is known but the role is not.
- Do not infer a project or role from the port alone.

## Visual treatment

- Keep the existing dark, compact QoLayer shell and sidebar.
- Use typography and spacing instead of cards or large badges.
- Increase row height only enough for three 14px text lines.
- Keep status and open icons optically aligned with the row.
- Avoid ellipses for server metadata; only an exceptionally long project name may truncate, with its full value available as a tooltip.
- Keep unknown listeners collapsed and use the same readable row structure when expanded.

## Safety

- Inspection remains local and read-only.
- No shell, PowerShell, WMI command execution, arbitrary process access, or network probing.
- Command-line data is used only inside Rust to derive sanitized labels and is never exposed directly.
