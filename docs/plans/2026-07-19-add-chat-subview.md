# Add Chat Subview Implementation Plan

**Goal:** Replace the cramped manual-entry disclosure with the approved full
content `Add chat` subview inside the existing QoLayer window.

**Architecture:** `ChatShortcutsPanel` owns a two-state local view model:
`list` and `add`. The list view keeps destination management and recent-chat
discovery unchanged. The add view reuses the existing parser and pin operation,
but mounts a dedicated semantic form and removes the list from the DOM until the
user returns.

**Tech Stack:** React 19, strict TypeScript, CSS, Tabler Icons, Vitest.

---

## Approved Design Contract

- The Chat shortcuts header stays on one line and uses an icon-only `+` action.
- Activating `+` replaces the list with an internal `Add chat` subview; it does
  not open a modal, popup, popover, overlay, or second window.
- The subview header contains a back button and the exact title `Add chat`.
- The form uses comfortable stacked `Name` and `Chat ID` fields.
- A readable helper says `Paste the thread ID from Codex or ChatGPT.`
- `Cancel`, the back button, and a successful add return to the list.
- Cancel preserves no draft; a successful add keeps the existing validation and
  local pin behavior.
- Visible text remains at least 14 px and the form requires no internal scroll.

## Task 1: Update the presentation test

**Files:**

- Modify: `src/features/chat-shortcuts/ChatShortcutsPanel.test.tsx`

1. Assert that the initial list view exposes an accessible `Add chat` action.
2. Assert that manual form fields are not mounted in the initial list view.
3. Run the focused test and confirm it fails against the disclosure UI.

## Task 2: Implement the internal subview

**Files:**

- Modify: `src/features/chat-shortcuts/ChatShortcutsPanel.tsx`

1. Replace `manualOpen` with a typed local `list | add` view state.
2. Render the list header and lists only in `list`.
3. Render the dedicated header and form only in `add`.
4. Focus `Name` when entering the add view.
5. Add shared cancel behavior that clears the draft and validation message.
6. Return to the list after a successful pin.

## Task 3: Apply the approved visual treatment

**Files:**

- Modify: `src/app/App.css`

1. Remove obsolete disclosure and chevron styles.
2. Keep the list header on one line with compact square add and refresh actions.
3. Style the dedicated form as a flat internal page with 42–44 px fields,
   14–15 px labels, concise helper copy, and right-aligned actions.
4. Add one short opacity/translate view transition that respects the existing
   reduced-motion rule.

## Task 4: Validate

Run the focused test, TypeScript, ESLint, all Vitest tests, targeted Prettier,
Vite build, Cargo tests, Cargo check, and `git diff --check`. Do not commit until
the user validates the running UI.
