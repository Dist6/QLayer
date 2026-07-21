# Manual Chat Disclosure Implementation Plan

**Goal:** Replace the permanently visible manual chat form with an accessible,
animated inline disclosure.

**Architecture:** `ChatShortcutsPanel` keeps the disclosure state locally because
it is transient presentation state. Existing parsing and destination state remain
the source of truth for validation and persistence. CSS provides the expansion
and reduced-motion behavior without adding an animation dependency.

**Tech Stack:** React 19, strict TypeScript, CSS, Tabler Icons, Vitest.

---

### Task 1: Add the disclosure interaction

**Files:**

- Modify: `src/features/chat-shortcuts/ChatShortcutsPanel.tsx`

**Steps:**

1. Add local open state and a ref for the name field.
2. Focus the name field after the disclosure opens.
3. Replace the static section heading with a semantic button using
   `aria-expanded` and `aria-controls`.
4. Keep the form mounted inside a disclosure wrapper so it can animate in both
   directions; remove hidden controls from keyboard navigation.
5. Present visible `Name` and `Chat ID` labels and a textual `Add chat` button.
6. Preserve unfinished values when manually collapsed.
7. Clear and collapse the form after a successful add.

### Task 2: Style and animate the disclosure

**Files:**

- Modify: `src/app/App.css`

**Steps:**

1. Add a compact neutral disclosure button consistent with existing controls.
2. Rotate its chevron as the form opens.
3. Use a grid-row reveal plus opacity and translate transitions for the form.
4. Keep the form flat and avoid adding a card or decorative container.
5. Style readable field labels and the `Add chat` action.
6. Ensure the existing reduced-motion media query disables the new motion.

### Task 3: Validate the complete change

Run:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd .
.\node_modules\.bin\vitest.cmd run
.\node_modules\.bin\prettier.cmd --check .
.\node_modules\.bin\vite.cmd build
cargo test --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
git diff --check
```

Do not commit until the user validates the UI in the running desktop app.
