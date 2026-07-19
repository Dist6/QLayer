# Codex App Server thread-list contract

QoLayer uses the official, experimental Codex App Server only as an optional, read-only source of recent chat metadata.

## Verified environment

- ChatGPT package: `OpenAI.Codex_26.715.4045.0_x64__2p2nqsd0c76g0`
- Packaged runtime location: derived from the verified ChatGPT process as `resources/codex.exe`
- Schema generator used for compatibility verification: `codex-cli 0.133.0`
- Protocol transport: newline-delimited JSON-RPC over standard input/output

Windows allows QoLayer to derive the packaged runtime from the verified process, but denied direct developer-shell execution of that file. The generated schema therefore records the compatible local CLI contract. Runtime parsing remains tolerant of additional fields and fails closed if the installed App Server is incompatible.

## Narrow protocol

QoLayer sends:

1. `initialize` with `clientInfo.name`, `clientInfo.title`, and `clientInfo.version`.
2. `initialized` as a notification.
3. `thread/list` with `{ "limit": 20, "sortKey": "updated_at", "sortDirection": "desc", "archived": false, "useStateDbOnly": true }`.

QoLayer consumes only these `thread/list` response fields:

- `data[].id` as the technical thread ID.
- `data[].name` as an optional user-facing title.
- `data[].cwd` to derive an optional project folder name.
- `data[].updatedAt` as a Unix timestamp in seconds.

QoLayer explicitly ignores `preview`, `turns`, `path`, Git information, model/provider information, status, source, cursors, and every other response field. It never requests `thread/read`.

## Failure behavior

Discovery is capped at 20 records and has a four-second deadline. Missing runtimes, incompatible schemas, malformed JSON, premature exit, and timeouts all return the same non-sensitive unavailable message. Pinned destinations and manual entry continue to work without discovery.
