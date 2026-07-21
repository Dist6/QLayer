# Manual Chat Disclosure Design

## Goal

Keep the Chat shortcuts screen compact by replacing the permanently visible
manual-entry form with a single `Add manually` button that progressively reveals
the controls only when they are needed.

## Interaction

- The section starts collapsed and shows only an `Add manually` button.
- Activating the button expands an inline form and moves focus to `Name`.
- The form contains `Name`, `Chat ID`, and a textual `Add chat` action.
- The disclosure button exposes its state with `aria-expanded` and references the
  form region with `aria-controls`.
- Collapsing an unfinished form preserves its values.
- A successful add clears the fields, clears any validation message, and
  collapses the form.
- Existing thread parsing, destination limits, and persistence behavior remain
  unchanged.

## Visual Direction

The interaction follows QoLayer's refined monochrome toolbox language. The
disclosure trigger is a compact secondary button rather than a new card. The
form remains flat within the current section, with readable labels and one clear
submit action.

The expansion uses a short grid-row, opacity, and vertical-transform transition
with the existing exponential easing. The chevron rotates to communicate state.
Reduced-motion preferences remove the transition.

## Scope

This change is limited to the manual chat entry experience. It does not change
automatic recent-chat discovery, destination ordering, voice selection, native
focus behavior, or global shortcuts.
