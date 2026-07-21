# Chat Destination Selector Design

## Summary

QLayer will let users choose a saved Codex chat at the moment Voice Flow starts. Holding `Ctrl+Alt+Space` opens a compact numbered selector. The user chooses `Current chat` or one of up to nine pinned destinations, QLayer opens the corresponding official `codex://threads/<thread-id>` deep link, focuses ChatGPT, starts dictation, and restores audio when the shortcut is released.

The feature uses a hybrid source model. Codex App Server supplies recent chat metadata when available, while the user explicitly pins the small set of chats that should appear in Voice Flow. Manual entry remains available and saved destinations keep working if App Server discovery is unavailable.

## Product principles

- Preserve the existing push-to-talk gesture.
- Make target selection possible without opening Settings or remembering multiple shortcuts.
- Let the user decide which chats are important; recency only supplies candidates.
- Use official deep links instead of automating the ChatGPT sidebar.
- Keep discovery optional and failure-safe because Codex App Server is experimental.
- Store metadata only and never read credentials, tokens, Codex auth files, internal databases, or chat contents.
- Keep all UI copy in English for v0.1.

## Chat destinations

The `Chat shortcuts` view contains two sections.

### Voice destinations

- Contains zero to nine explicitly pinned chats.
- Each destination has an automatically assigned number from `1` to `9` based on its order.
- The user can rename, reorder, or remove a destination.
- Removing a destination only removes it from QLayer; it never deletes or archives the Codex chat.
- Destinations persist locally and remain usable when recent-chat discovery fails.

### Recent chats

- Loaded only when the user opens `Chat shortcuts` or requests a refresh.
- Shows a bounded list of recent local Codex chats with title, project, and last activity.
- Each result has a `Pin` action.
- Already-pinned threads are visibly identified and cannot be duplicated.
- QLayer does not poll in the background.
- QLayer ignores messages, turns, response content, and other transcript data.

### Manual entry

- `Add manually` accepts a technical thread ID or a canonical `codex://threads/<thread-id>` link.
- QLayer validates the ID and derives the canonical deep link.
- Arbitrary URLs and unsupported `codex://` paths are rejected.

## Voice selector

QLayer creates a dedicated hidden Tauri window for target selection rather than reusing the main configuration window.

- Approximate width: 320 px.
- Frameless, non-resizable, focusable, always on top while visible, and absent from the taskbar.
- Positioned near the cursor when practical, with monitor-bound clamping; centered on the active monitor as a fallback.
- Shows `0 · Current chat` followed by pinned destinations `1–9`.
- Accepts number keys, mouse selection, and `Escape` to cancel.
- Has no search, settings, scrolling history, or unrelated controls.
- Hides immediately after selection, cancellation, or shortcut release.

The selector appears only when at least one destination is pinned. With no pinned destinations, Voice Flow retains its current direct-to-current-chat behavior.

## Voice Flow sequence

1. The user presses and holds `Ctrl+Alt+Space`.
2. If no destination is pinned, QLayer starts the existing current-chat Voice Flow.
3. If destinations exist, QLayer shows the selector and marks a native hold request active.
4. The user presses `0–9` or clicks a row while continuing to hold the shortcut.
5. QLayer atomically accepts the first valid selection and hides the selector.
6. For `Current chat`, QLayer proceeds directly to the existing focus flow.
7. For a pinned destination, QLayer opens its canonical `codex://threads/<thread-id>` deep link.
8. QLayer waits for the verified ChatGPT/Codex window to finish navigation, maximizes it, focuses it, and focuses the composer.
9. QLayer prepares background audio only after a destination has been selected successfully.
10. QLayer maintains the configured Codex dictation shortcut.
11. When the physical `Ctrl+Alt+Space` hold ends, QLayer releases dictation and restores audio.

If the shortcut is released before selection, QLayer cancels without changing audio. A selection arriving after cancellation is ignored.

## Discovery architecture

Recent-chat discovery lives behind a focused adapter so the experimental protocol can change without affecting saved destinations or Voice Flow.

- QLayer launches only the fixed `codex app-server` command with fixed arguments.
- Communication uses local JSON-RPC over `stdio`.
- The client performs the required `initialize` / `initialized` handshake and a bounded thread-list request.
- The response is parsed into a narrow metadata model: thread ID, title, project label or path-derived project name, and update time.
- Unexpected fields are ignored and malformed entries are dropped.
- The child process has a short timeout and is terminated after the request or on cancellation.
- No broad shell command, arbitrary executable path, arbitrary arguments, or reusable app-server transport is exposed to the frontend.
- QLayer does not read Codex authentication files or tokens. Authentication remains internal to the official Codex process.

The implementation must generate or inspect schemas from the installed Codex version before finalizing request and response types. Discovery failure produces a local fallback state rather than blocking the feature.

## Data model and persistence

Saved destinations use a storage key separate from general settings.

```text
ChatDestination
  id
  threadId
  displayName
  projectName
  order
  pinnedAt
```

- `id` is a QLayer-local stable identifier.
- `threadId` is the validated technical Codex thread ID.
- `displayName` is user-editable.
- `projectName` is optional display metadata.
- `order` determines the selector number.
- `pinnedAt` supports deterministic migration and diagnostics.
- The deep link is derived from `threadId` and is never stored as arbitrary input.
- The parser recovers valid destinations independently and discards invalid records.

## Deep-link safety

- TypeScript and Rust apply equivalent thread-ID validation.
- The native opener allowlist is extended only for canonical thread deep links.
- Existing allowed links remain unchanged.
- Query strings, fragments, path traversal, nested schemes, encoded separators, and non-Codex URLs are rejected.
- Opening a saved destination never starts ChatGPT when no verified ChatGPT/Codex process is running; Voice Flow returns a safe waiting state.

## Error handling

- App Server unavailable: `Recent chats unavailable. Add a chat manually.`
- Discovery timeout: same local fallback with a retry action.
- Invalid manual value: inline validation; nothing is saved.
- Deleted, archived, or unavailable destination: `Chat could not be opened.`
- ChatGPT not running: selector closes and the existing waiting state appears; ChatGPT is not launched.
- Shortcut released before selection: silent cancellation.
- Duplicate selection or repeated key events: only the first valid selection is accepted.
- Audio or dictation failure after selection: use the existing safe restoration path.

## Accessibility

- Selector rows expose their number, name, and selection action to assistive technology.
- Keyboard selection does not depend on color.
- Focus is trapped inside the selector only while it is visible.
- `Escape` and shortcut release always cancel.
- The recent list and pinned list use real buttons and accessible reorder controls.
- Visible focus indicators remain consistent with the compact QLayer design system.

## Out of scope

- Reading ChatGPT or Codex internal databases directly.
- Reading credentials, tokens, authentication files, or message contents.
- Deleting, archiving, renaming, or editing chats inside Codex.
- Cloud sync of destinations.
- More than nine numbered Voice Flow destinations.
- A distinct Voice Flow shortcut for every chat.
- Search inside chat transcripts.

## Approved decisions

- Hybrid discovery plus explicit pinning.
- A maximum of nine Voice Flow destinations.
- `0` always targets the currently open chat.
- The selector appears during the existing push-to-talk hold.
- Number-key and mouse selection are both supported.
- Audio preparation begins only after a valid selection.
- Saved destinations remain functional when discovery is unavailable.
