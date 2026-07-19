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

- Target size: approximately 410 x 370 px.
- Frameless, non-resizable compact utility window.
- Hide from the taskbar and return to the tray when closed.
- Open from the tray and retain the existing tray-first lifecycle.
- Use one continuous charcoal surface with a subtle outer border and restrained shadow.
- Use a 48 px left navigation rail separated by a low-contrast divider.
- Place a custom monochrome QoLayer three-layer mark at the top of the rail.

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
- Use neutral icon colors; communicate selection with a soft graphite background.
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

The Voice Flow view contains:

- Header title: `Voice Flow`.
- Compact state indicator with one of:
  - `Ready`
  - `Listening`
  - `Needs attention`
- Instruction: `Hold Ctrl Alt Space to talk`.
- Three keycaps: `Ctrl`, `Alt`, and `Space`.
- Section label: `Background audio`.
- Segmented control:
  - `Off`
  - `Lower`
  - `Mute`
- When `Lower` is selected, reveal:
  - Label: `Listening volume`
  - Current percentage value
  - A compact range slider

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

- Neutral charcoal palette similar in restraint to Codex and ChatGPT.
- Near-white primary text and cool-gray secondary text.
- Muted green only for a healthy status dot.
- Compact system typography based on Segoe UI Variable with careful weight hierarchy.
- Low-contrast 1 px dividers and borders.
- Rounded corners should be consistent but not pill-shaped everywhere.
- Use subtle tonal variation or micro-texture rather than visible gradients.
- Provide hover, active, focus-visible, and disabled states.
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

The approved visual direction is the generated mockup with:

- A 48 px icon rail.
- Voice Flow selected.
- Visible Chat shortcuts and Saved prompts buttons.
- Settings anchored at the bottom.
- A `Lower` audio state with a visible listening-volume slider.
- No compatibility footer text.

