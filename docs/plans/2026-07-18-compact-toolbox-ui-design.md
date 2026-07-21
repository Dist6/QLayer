# QoLayer Compact Toolbox UI Design

## Summary

QoLayer is a compact tray toolbox, not a traditional desktop dashboard. Its interface should be small, quiet, and focused on configuration and status while shortcuts perform the actual work.

The redesigned app uses a narrow icon sidebar and a single content surface inspired by the restrained visual language of the Codex and ChatGPT desktop apps. Voice Flow is the first working tool. Chat shortcuts and Saved prompts reserve navigation positions for future releases but do not provide functionality in this phase.

## Product principles

- Keep the window compact and tray-oriented.
- Show only controls that change current behavior.
- Use shortcuts for primary actions; do not add a hold-to-talk button.
- Avoid dashboard cards, decorative gradients, glass effects, and repeated status copy.
- Keep all UI copy in English for v0.1.
- Preserve local-first behavior and do not add network requests, telemetry, credentials access, or cloud storage.
- Do not promise exact chat navigation until a reliable supported mechanism exists for both Codex and ChatGPT.

## Window and shell

- Target width: approximately 420-440 px.
- Let the content determine the compact window height. `Off` and `Mute` should
  collapse the listening-volume row; `Lower` should expand the window only by
  the height needed for that row.
- Frameless, non-resizable compact utility window.
- Hide from the taskbar and return to the tray when closed.
- Open from the tray and retain the existing tray-first lifecycle.
- Use one continuous charcoal surface with approximately 20-22 px outer
  corner radii, a subtle outer border, and a restrained shadow.
- Use a 48 px left navigation rail separated by a low-contrast divider.
- Use the official monochrome QoLayer logo at the top of the rail.

## Navigation

The sidebar contains icon-only navigation with accessible labels and tooltips:

1. Voice Flow — active and functional.
2. Chat shortcuts — visible, selectable, and intentionally empty for a future phase.
3. Saved prompts — visible, selectable, and intentionally empty for a future phase.
4. Settings — anchored to the bottom and functional.

Empty future views should preserve the shell and title but contain no fake controls, sample data, or promised behavior.

## Icon system

- Replace `lucide-react` with `@tabler/icons-react`.
- Remove Lucide imports and dependency entries completely.
- Use Tabler outline icons only.
- Default sidebar icon size: 19 px.
- Default stroke: 1.7.
- Use neutral icon colors; communicate selection with a soft graphite
  background only. Do not add a colored bar, stripe, dot, or line beside the
  active navigation item.
- Do not mix icon libraries.

Initial mapping:

- Voice Flow: `IconWaveSine` or the closest verified Tabler waveform icon.
- Chat shortcuts: `IconMessages`.
- Saved prompts: `IconBookmark`.
- Settings: `IconSettings`.
- Open Codex / ChatGPT: `IconExternalLink`.
- Restore Audio: `IconVolume`.
- Launch at startup: `IconRocket`.
- Close to tray: the closest verified Tabler tray or bottom-bar icon.

Exact export names must be verified against the installed package during implementation.

## Voice Flow view

The Voice Flow view uses a flat settings layout. Labels and controls sit
directly on the main surface and rely on spacing and thin dividers for
structure. Do not wrap settings in cards or outlined containers.

The view contains:

- Header title: `Voice Flow` with the compact state indicator immediately to
  its right on the same baseline. The state must never sit below the title.
- Compact state indicator with one of:
  - `Ready`
  - `Listening`
  - `Needs attention`
- A flat `Voice shortcut` row with the configured shortcut rendered as
  individual keycaps and a compact edit action.
- Section label: `Background audio`.
- Segmented control:
  - `Off`
  - `Lower`
  - `Mute`
- When `Lower` is selected, reveal:
  - Label: `Listening volume`
  - Current percentage value
  - A compact range slider

The background-audio segmented control is the only grouped control in this
view. Its selected capsule should glide between options with a short spring
transition. The control remains fully usable when reduced motion is enabled,
without relying on animation for state communication.

The listening-volume setting controls the target Windows master output volume while Voice Flow is active. The original volume and mute state must be preserved and restored when the global shortcut is released.

## Audio behavior

- `Off`: leave background audio unchanged.
- `Lower`: reduce output to the user-selected target percentage.
- `Mute`: mute output while Voice Flow is active.
- Restore the original audio state automatically when `Ctrl+Alt+Space` is released.
- Keep `Restore Audio` in the tray menu as an emergency recovery action.
- Remove the exposed `Restore mode` and unimplemented `After timeout` setting.
- Remove the manual Restore Audio button from the main panel.

The listening-volume range should be bounded to a useful safe interval and persist locally with the rest of the settings. The exact default and bounds should be fixed in the implementation plan and covered by validation tests.

## Settings view

Settings is a compact view inside the same shell. It should contain only functional options:

- `Launch at startup`
- `Close to tray`
- Global Voice Flow shortcut display or configuration, depending on current native support
- Window behavior that is actually implemented

Remove fixed or redundant fields such as Integration, Theme, and Language until they become configurable.

## Tray menu

Use concise labels:

- `Open Codex / ChatGPT`
- `Restore Audio`
- `About QoLayer`
- `Quit`

Compatibility detection remains automatic. Do not add an application selector for standalone Codex versus the unified ChatGPT app.

## Status and errors

- Do not display success logs or a scrolling message history.
- Show one quiet state label during normal operation.
- Replace supporting copy with one contextual error when attention is required.
- Errors should distinguish detection, focus, dictation, and audio failures without technical noise.
- Do not bring QoLayer to the foreground for ordinary success states.

## Visual system

- Strictly neutral warm-charcoal palette with near-white primary text and gray
  secondary text. Do not use purple or another chromatic accent in normal,
  selected, hover, focus, or healthy states.
- Use tonal contrast, weight, borders, and shape to communicate state.
- Compact system typography based on Segoe UI Variable with careful weight hierarchy.
- Low-contrast 1 px dividers and borders.
- Keep the outer shell generously rounded, but do not place every setting in a
  rounded container. Keycaps, segmented controls, sliders, and icon-button
  hit areas may retain appropriate control-level rounding.
- Do not use visible gradients, glass effects, or decorative glow.
- Provide hover, active, focus-visible, and disabled states.
- Use short, restrained transitions for navigation state, shortcut editing,
  slider feedback, and conditional row disclosure.
- Respect reduced-motion preferences.

## Accessibility

- Every icon-only button needs an accessible name and tooltip.
- Navigation state must be exposed with `aria-current` or equivalent semantics.
- The audio segmented control and slider must be fully keyboard operable.
- Keep visible focus indicators.
- Do not rely on color alone for active or error states.

## Out of scope

- Implementing exact Codex / ChatGPT chat navigation.
- Creating or managing saved prompts.
- Add-ons or a plugin marketplace.
- Light theme and language selection.
- Cloud sync or remote storage.
- Recreating or copying proprietary OpenAI icons or assets.

## Approved reference

The approved visual direction is the revised monochrome mockup with:

- A 48 px icon rail.
- The official QoLayer logo.
- Voice Flow selected.
- Visible Chat shortcuts and Saved prompts buttons.
- Settings anchored at the bottom.
- `Voice Flow` and `Ready` on the same horizontal line.
- No active-item side bar or chromatic accent.
- Flat settings rows without card containers.
- A `Lower` audio state with a visible listening-volume slider.
- No compatibility footer text.
