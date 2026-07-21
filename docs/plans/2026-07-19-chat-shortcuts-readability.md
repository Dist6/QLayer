# Chat Shortcuts Readability

## Goal

Make Chat shortcuts readable and efficient inside QoLayer's compact desktop
window while improving the native tray interaction and icon legibility.

## Design

- Visible Chat shortcuts text uses a 14 px minimum; section headings use 15 px.
- `Add manually` lives beside refresh in the page header as a compact action.
- Its inline form reveals below the header, aligns right, and is capped at 300 px
  instead of stretching across the content surface.
- Saved and recent chats remain flat rows. Scroll is reserved for lists that
  genuinely exceed the available height.
- The voice selector uses inset choices and the same 14 px minimum.
- A left-button double click on the Windows tray icon restores and focuses the
  existing QoLayer window. The context menu remains available separately.
- Native icons use a tighter optical crop of the official logo without changing
  its geometry or colors.
- Reduced-motion preferences continue to disable disclosure motion.

## Implementation

1. Recompose `ChatShortcutsPanel` so header actions own manual entry.
2. Preserve the existing focus, validation, persistence, and successful-collapse
   behavior.
3. Update the Chat shortcuts and voice-selector type scale, spacing, row widths,
   and hit areas in `App.css`.
4. Handle `TrayIconEvent::DoubleClick` in `tray.rs` by calling the existing
   `show_main_window` function.
5. Regenerate the standard Tauri icon set from an optically cropped official
   logo source.
6. Validate TypeScript, ESLint, Vitest, Vite, Cargo tests, Cargo check, formatting,
   and whitespace. Do not commit until the user validates the running UI.

## Out of Scope

Saved-destination data, recent-chat discovery, thread navigation, Voice Flow,
and the nine-destination limit remain unchanged.
