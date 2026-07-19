# QoLayer Compact Toolbox UI Implementation Plan

**Goal:** Replace the current dashboard-style UI with the approved compact Tabler-based toolbox, add configurable audio lowering with automatic restoration, and expose only functional app settings.

**Architecture:** Keep React responsible for local settings, navigation, and presentation. Keep Windows audio, window lifecycle, tray, global shortcuts, and autostart behind focused Tauri commands or official plugins. Preserve the current Voice Flow pipeline while changing its release path to restore audio automatically.

**Tech Stack:** Tauri 2, Rust, React 19, strict TypeScript, Vite, Tailwind CSS 4 plus project CSS, Vitest, `@tabler/icons-react`, official Tauri autostart plugin.

---

## Execution constraints

- The worktree already contains uncommitted Voice Flow and focus changes. Do not revert or overwrite them.
- Do not commit until the user has manually validated the current Codex / ChatGPT focus behavior and the redesigned UI. The commit commands below are handoff points, not authorization to commit early.
- Stage exact paths only; never use `git add .` in this dirty worktree.
- Keep all UI copy, code comments, docs, and labels in English.
- Do not implement Chat shortcuts or Saved prompts behavior in this phase.
- Do not add network requests, telemetry, cloud storage, shell execution, credential access, or Codex auth access.

## Task 1: Replace Lucide with Tabler Icons

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify every `.tsx` file currently importing `lucide-react`

**Step 1: Record the current imports**

Run:

```powershell
rg -n "lucide-react" src package.json pnpm-lock.yaml
```

Expected: imports in the current app shell, Voice Flow, quick tools, and related panels.

**Step 2: Change dependencies**

Run:

```powershell
corepack pnpm remove lucide-react
corepack pnpm add @tabler/icons-react
```

**Step 3: Replace imports with verified Tabler exports**

Use outline components from `@tabler/icons-react`. Verify exact export names from the installed package instead of guessing. Standardize UI usage:

```tsx
<IconSettings aria-hidden="true" size={19} stroke={1.7} />
```

Do not mix icon libraries. Keep the custom three-layer QoLayer mark as local markup or SVG.

**Step 4: Verify removal**

Run:

```powershell
rg -n "lucide-react" src package.json pnpm-lock.yaml
```

Expected: no matches.

Run:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

Expected: PASS.

**Commit after manual validation:**

```powershell
git add package.json pnpm-lock.yaml src
git commit -m "refactor: replace Lucide with Tabler icons"
```

## Task 2: Simplify and migrate the settings schema

**Files:**

- Modify: `src/features/settings/settingsTypes.ts`
- Modify: `src/features/settings/defaultSettings.ts`
- Modify: `src/features/settings/settingsValidation.ts`
- Modify: `src/features/settings/settings.test.ts`
- Modify: `src/features/settings/settingsStorage.test.ts`

**Step 1: Write failing settings tests**

Add coverage for:

```ts
expect(defaultSettings.general).toEqual({
  launchAtStartup: false,
  closeToTray: true,
});
expect(defaultSettings.voiceFlow.listeningVolumePercent).toBe(20);
```

Add validation cases proving:

- `listeningVolumePercent` accepts integers from 5 through 50.
- Values outside that range recover to 20.
- `launchAtStartup` and `closeToTray` preserve stored booleans.
- Old stored settings containing `appearance`, `restoreMode`, and `restoreTimeoutSeconds` migrate without crashing.

Run:

```powershell
.\node_modules\.bin\vitest.cmd run src/features/settings/settings.test.ts src/features/settings/settingsStorage.test.ts
```

Expected: FAIL.

**Step 2: Replace the public settings type**

Use this target shape:

```ts
export type AudioMode = "disabled" | "duck" | "mute";
export type CodexDictationShortcut = "Ctrl+Shift+D";

export type AppSettings = {
  general: {
    launchAtStartup: boolean;
    closeToTray: boolean;
  };
  codex: {
    enabled: boolean;
    dictationShortcut: CodexDictationShortcut;
  };
  voiceFlow: {
    hotkey: string;
    audioMode: AudioMode;
    listeningVolumePercent: number;
  };
};
```

Remove `Theme`, `AppLanguage`, `RestoreMode`, the `appearance` object, `restoreMode`, and `restoreTimeoutSeconds`.

**Step 3: Implement bounded validation**

Add constants and a reader:

```ts
export const MIN_LISTENING_VOLUME_PERCENT = 5;
export const MAX_LISTENING_VOLUME_PERCENT = 50;

function readListeningVolume(value: unknown, fallback: number): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_LISTENING_VOLUME_PERCENT &&
    value <= MAX_LISTENING_VOLUME_PERCENT
    ? value
    : fallback;
}
```

Ignore obsolete stored keys while merging known values into the new schema.

**Step 4: Run focused tests**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run src/features/settings/settings.test.ts src/features/settings/settingsStorage.test.ts
```

Expected: PASS.

**Commit after manual validation:**

```powershell
git add src/features/settings/settingsTypes.ts src/features/settings/defaultSettings.ts src/features/settings/settingsValidation.ts src/features/settings/settings.test.ts src/features/settings/settingsStorage.test.ts
git commit -m "refactor: simplify QoLayer settings"
```

## Task 3: Make the Windows lower-volume target configurable

**Files:**

- Modify: `src-tauri/src/audio.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/features/voice-flow/controllers.ts`
- Modify: `src/features/voice-flow/nativeControllers.ts`
- Modify: `src/features/voice-flow/nativeControllers.test.ts`
- Modify: Voice Flow service tests and mocks that implement `AudioController`

**Step 1: Write failing Rust tests**

Extract a pure conversion helper and test it:

```rust
#[test]
fn converts_supported_listening_percentages_to_scalar_volume() {
    assert_eq!(listening_volume_scalar(5), Ok(0.05));
    assert_eq!(listening_volume_scalar(20), Ok(0.2));
    assert_eq!(listening_volume_scalar(50), Ok(0.5));
}

#[test]
fn rejects_unsafe_listening_percentages() {
    assert!(listening_volume_scalar(4).is_err());
    assert!(listening_volume_scalar(51).is_err());
}
```

Run:

```powershell
cargo test --manifest-path src-tauri\Cargo.toml audio
```

Expected: FAIL.

**Step 2: Accept the target percentage in the command**

Change the focused API to:

```rust
pub fn prepare_audio(
    app: tauri::AppHandle,
    mode: String,
    listening_volume_percent: u8,
) -> Result<AudioStep, String>
```

For `duck`, calculate the target scalar and apply:

```rust
let temporary_volume = current.volume.min(target_volume);
```

Keep `mute` and `disabled` behavior unchanged. Preserve the first original audio state until restoration.

**Step 3: Pass the setting through TypeScript**

Update the controller contract:

```ts
prepareAudio: (mode: AudioMode, listeningVolumePercent: number) =>
  Promise<AppResult<VoiceFlowStep>>;
```

Invoke Tauri with:

```ts
invokeAudioCommand("prepare_audio", {
  mode,
  listeningVolumePercent,
});
```

Update all tests and mocks without using `any`.

**Step 4: Verify both layers**

Run:

```powershell
cargo test --manifest-path src-tauri\Cargo.toml audio
.\node_modules\.bin\vitest.cmd run src/features/voice-flow/nativeControllers.test.ts src/features/voice-flow/voiceFlowService.test.ts
```

Expected: PASS.

**Commit after manual validation:**

```powershell
git add src-tauri/src/audio.rs src-tauri/src/main.rs src/features/voice-flow
git commit -m "feat: configure Voice Flow listening volume"
```

## Task 4: Restore audio automatically on shortcut release

**Files:**

- Modify: `src/features/voice-flow/voiceFlowService.ts`
- Modify: `src/features/voice-flow/useVoiceFlow.ts`
- Modify: `src/features/voice-flow/voiceFlowService.test.ts`
- Modify: `src/features/voice-flow/voiceFlowLatency.test.ts`
- Modify: `src/features/voice-flow/voiceFlowStatus.ts`
- Modify: `src/features/voice-flow/voiceFlowStatus.test.ts`

**Step 1: Write failing release-order tests**

Prove the stop sequence is:

```ts
expect(events).toEqual(["release-dictation", "restore-audio"]);
```

Also prove:

- Audio restoration is attempted even if keyboard release fails.
- A late async start restores audio if the physical hold already ended.
- `nothingToRestore` does not become a noisy success log.
- The final visible state becomes `Ready` when release and restore succeed.

Run:

```powershell
.\node_modules\.bin\vitest.cmd run src/features/voice-flow/voiceFlowService.test.ts src/features/voice-flow/voiceFlowLatency.test.ts
```

Expected: FAIL.

**Step 2: Return all stop steps**

Use a result that cannot lose either operation:

```ts
export async function stopVoiceFlowHold(
  keyboard: KeyboardController,
  audio: AudioController,
  shortcut: string,
): Promise<VoiceFlowStep[]> {
  const steps: VoiceFlowStep[] = [];
  const released = await keyboard.releaseDictationShortcut(shortcut);
  steps.push(released.ok ? released.value : { status: "failed", message: released.message });

  const restored = await audio.restoreAudio();
  if (restored.ok && restored.value.status !== "nothingToRestore") {
    steps.push(restored.value);
  } else if (!restored.ok) {
    steps.push({ status: "failed", message: restored.message });
  }

  return steps;
}
```

Update `useVoiceFlow.stopHold()` to append the returned steps and derive one quiet final status.

**Step 3: Pass the configured percentage at preparation**

Use:

```ts
await input.audio.prepareAudio(
  input.settings.voiceFlow.audioMode,
  input.settings.voiceFlow.listeningVolumePercent,
);
```

**Step 4: Run focused tests**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run src/features/voice-flow
```

Expected: PASS.

**Commit after manual validation:**

```powershell
git add src/features/voice-flow
git commit -m "fix: restore audio when Voice Flow ends"
```

## Task 5: Add official autostart and configurable close-to-tray behavior

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/Cargo.lock`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src-tauri/src/main.rs`
- Create: `src/features/settings/autostartClient.ts`
- Create: `src/features/settings/autostartClient.test.ts`
- Create: `src/features/settings/windowBehaviorClient.ts`
- Create: `src-tauri/src/window_behavior.rs`

**Step 1: Add only the official Tauri plugin**

Run:

```powershell
corepack pnpm add @tauri-apps/plugin-autostart
cargo add tauri-plugin-autostart --manifest-path src-tauri\Cargo.toml
```

Register `tauri_plugin_autostart::init(...)` in the builder. Add only:

```json
"autostart:allow-enable",
"autostart:allow-disable",
"autostart:allow-is-enabled"
```

to `src-tauri/capabilities/default.json`.

**Step 2: Write a testable frontend adapter**

Use dependency injection around the official API:

```ts
export type AutostartApi = {
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  isEnabled: () => Promise<boolean>;
};

export async function setAutostart(api: AutostartApi, enabled: boolean): Promise<void> {
  await (enabled ? api.enable() : api.disable());
}
```

Tests must cover enable, disable, current-state read, and propagated errors.

**Step 3: Add native close behavior state**

Create a focused managed state backed by `AtomicBool`, defaulting to true:

```rust
pub struct WindowBehaviorState {
    close_to_tray: AtomicBool,
}
```

Expose one narrow command:

```rust
#[tauri::command]
fn set_close_to_tray(
    state: tauri::State<'_, WindowBehaviorState>,
    enabled: bool,
) {
    state.set_close_to_tray(enabled);
}
```

In `CloseRequested`, prevent and hide only when enabled. Otherwise allow the normal close path. Do not add shell access.

**Step 4: Verify**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run src/features/settings/autostartClient.test.ts
cargo test --manifest-path src-tauri\Cargo.toml window_behavior
cargo check --manifest-path src-tauri\Cargo.toml
```

Expected: PASS.

**Commit after manual validation:**

```powershell
git add package.json pnpm-lock.yaml src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/capabilities/default.json src-tauri/src/main.rs src-tauri/src/window_behavior.rs src/features/settings/autostartClient.ts src/features/settings/autostartClient.test.ts src/features/settings/windowBehaviorClient.ts
git commit -m "feat: add startup and tray window settings"
```

## Task 6: Simplify the tray menu and events

**Files:**

- Modify: `src-tauri/src/tray.rs`
- Modify: `src/features/tray/trayEvents.ts`
- Modify: `src/features/tray/trayEvents.test.ts`
- Modify: `src/features/tray/trayClient.ts`
- Modify: `src/app/App.tsx`

**Step 1: Write failing tray-event tests**

Target actions:

```ts
export type TrayAction = "openCodex" | "restoreAudio" | "showAbout";
```

Reject unknown or obsolete `startVoiceFlow` payloads.

**Step 2: Replace tray items**

Build this menu:

```text
Show QoLayer
Open Codex / ChatGPT
Restore Audio
About QoLayer
────────────
Quit
```

Remove `Start Voice Flow`. Keep Voice Flow shortcut-driven.

`Open Codex / ChatGPT` should reuse the existing allowlisted `codex://` opener. `About QoLayer` should show the window and select the About view.

**Step 3: Run focused tests and Rust checks**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run src/features/tray/trayEvents.test.ts
cargo test --manifest-path src-tauri\Cargo.toml tray
cargo check --manifest-path src-tauri\Cargo.toml
```

Expected: PASS.

**Commit after manual validation:**

```powershell
git add src-tauri/src/tray.rs src/features/tray src/app/App.tsx
git commit -m "refactor: simplify the QoLayer tray menu"
```

## Task 7: Build the compact toolbox shell and sidebar

**Files:**

- Create: `src/features/toolbox/toolboxViews.ts`
- Create: `src/features/toolbox/ToolboxSidebar.tsx`
- Create: `src/features/toolbox/ToolboxSidebar.test.tsx`
- Create: `src/features/chat-shortcuts/ChatShortcutsPanel.tsx`
- Create: `src/features/saved-prompts/SavedPromptsPanel.tsx`
- Modify: `src/app/App.tsx`
- Delete after references are removed: `src/features/quick-tools/QuickToolsPanel.tsx`
- Delete after references are removed: `src/features/quick-tools/quickTools.ts`
- Delete after references are removed: `src/features/quick-tools/quickTools.test.ts`
- Delete after references are removed: `src/features/global-hotkeys/GlobalHotkeysDetailPanel.tsx`

**Step 1: Define the minimal navigation model**

```ts
export type ToolboxView = "voiceFlow" | "chatShortcuts" | "savedPrompts" | "settings" | "about";
```

Sidebar items must include accessible labels and verified Tabler components. Keep `settings` anchored at the bottom.

**Step 2: Write failing sidebar tests**

Test that:

- Voice Flow is active by default.
- Chat shortcuts and Saved prompts are selectable.
- Settings is present.
- Active navigation exposes `aria-current="page"`.
- Every icon button has an accessible name.

Run:

```powershell
.\node_modules\.bin\vitest.cmd run src/features/toolbox/ToolboxSidebar.test.tsx
```

Expected: FAIL.

If the current Vitest setup lacks a DOM environment, test the navigation model as a pure function instead of adding a large testing dependency solely for one component.

**Step 3: Implement the shell**

Use semantic structure:

```tsx
<div className="toolbox-shell">
  <ToolboxSidebar activeView={activeView} onSelect={setActiveView} />
  <main className="toolbox-content">{renderView(activeView)}</main>
</div>
```

Future panels should render only their heading in the established content shell. Do not add sample chats, prompts, disabled forms, or fake Coming Soon cards.

**Step 4: Remove obsolete navigation**

Remove Quick Tools, planned Add-ons, the header Codex dropdown, and footer navigation from `App.tsx`. Preserve global hotkey and tray listeners.

**Step 5: Verify**

Run:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\vitest.cmd run
```

Expected: PASS.

**Commit after manual validation:**

```powershell
git add src/app/App.tsx src/features/toolbox src/features/chat-shortcuts src/features/saved-prompts
git add -u src/features/quick-tools src/features/global-hotkeys/GlobalHotkeysDetailPanel.tsx
git commit -m "feat: add compact toolbox navigation"
```

## Task 8: Replace the Voice Flow detail page with the approved compact panel

**Files:**

- Replace or rename: `src/features/voice-flow/VoiceFlowDetailPanel.tsx`
- Create: `src/features/voice-flow/BackgroundAudioControl.tsx`
- Create: `src/features/voice-flow/backgroundAudioControl.test.ts`
- Modify: `src/features/voice-flow/voiceFlowStatus.ts`
- Modify: `src/app/App.css`

**Step 1: Write pure control-state tests**

Extract a helper:

```ts
export function shouldShowListeningVolume(mode: AudioMode): boolean {
  return mode === "duck";
}
```

Test that only Lower reveals the slider and that displayed labels map as:

```ts
const audioModeLabels: Record<AudioMode, string> = {
  disabled: "Off",
  duck: "Lower",
  mute: "Mute",
};
```

**Step 2: Implement the approved content**

The Voice Flow view must contain only:

- `Voice Flow`
- quiet state indicator
- `Hold Ctrl Alt Space to talk`
- Ctrl, Alt, and Space keycaps
- `Background audio`
- Off / Lower / Mute segmented control
- `Listening volume` slider and percentage only when Lower is selected

Use a controlled range input:

```tsx
<input
  aria-label="Listening volume"
  max={MAX_LISTENING_VOLUME_PERCENT}
  min={MIN_LISTENING_VOLUME_PERCENT}
  onChange={(event) => onVolumeChange(Number(event.target.value))}
  type="range"
  value={listeningVolumePercent}
/>
```

Do not render the old Hold Voice Flow button, Restore Audio button, status cards, diagnostic list, integration label, restore mode, or compatibility footer.

**Step 3: Reduce status presentation**

Map internal statuses to exactly three visible states:

```ts
export type VoiceFlowDisplayState = "Ready" | "Listening" | "Needs attention";
```

Show one contextual error line only when needed.

**Step 4: Run focused tests**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run src/features/voice-flow
.\node_modules\.bin\tsc.cmd --noEmit
```

Expected: PASS.

**Commit after manual validation:**

```powershell
git add src/features/voice-flow src/app/App.css
git commit -m "feat: redesign the Voice Flow control panel"
```

## Task 9: Redesign Settings and About without dead options

**Files:**

- Modify: `src/features/settings/SettingsPage.tsx`
- Create: `src/features/settings/SettingsPage.test.ts` if pure state helpers are extracted
- Modify: `src/features/about/AboutPanel.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.css`

**Step 1: Remove nonfunctional settings**

Delete UI fields for:

- Integration enabled/disabled
- Fixed dictation command
- Theme
- Language
- Restore mode
- Timeout
- Registration status as a disabled input

**Step 2: Add only functional settings**

Render compact switch rows for:

- `Launch at startup`
- `Close to tray`

Display the global shortcut as read-only keycaps unless shortcut reassignment is implemented in the same phase. Do not present a disabled text input as configuration.

When changing autostart:

1. Call the official plugin adapter.
2. Persist the setting only after success.
3. Restore the previous visual state and show one inline error on failure.

When changing close-to-tray:

1. Invoke `set_close_to_tray`.
2. Persist only after success.

**Step 3: Keep About compact**

Show project name, version, license, repository, and concise local-first privacy facts without status pills or multiple cards.

**Step 4: Verify**

Run:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\vitest.cmd run src/features/settings
.\node_modules\.bin\eslint.cmd .
```

Expected: PASS.

**Commit after manual validation:**

```powershell
git add src/features/settings src/features/about src/app/App.tsx src/app/App.css
git commit -m "feat: simplify QoLayer settings"
```

## Task 10: Apply the approved window and visual system

**Files:**

- Modify: `src-tauri/tauri.conf.json`
- Modify: `src/app/App.css`
- Modify: `src/main.tsx` only if root behavior requires it
- Modify: `src/shared/ui/Button.tsx` or delete if unused
- Modify: `src/shared/ui/StatusChip.tsx` or delete if unused

**Step 1: Update the Tauri window**

Set the main window close to the approved compact size:

```json
{
  "width": 410,
  "height": 370,
  "minWidth": 390,
  "minHeight": 350,
  "resizable": false,
  "decorations": false,
  "skipTaskbar": true
}
```

Add a narrow custom drag region and an accessible close control that follows `Close to tray`. Do not make the window always-on-top unless the user explicitly approves that behavior.

**Step 2: Replace the CSS visual system**

Use:

- One neutral charcoal surface.
- 48 px sidebar.
- Near-white text and cool-gray secondary text.
- Muted green only for Ready.
- `Segoe UI Variable`, falling back to Segoe UI and system sans.
- Low-contrast borders.
- No gradients, glass effects, beige accent, large shadows, or dashboard cards.
- `:focus-visible`, hover, active, disabled, and reduced-motion states.

Keep CSS selectors focused on the new shell and remove obsolete `.tool-card`, `.app-footer`, `.integration-menu`, and old card-grid rules after their markup is gone.

**Step 3: Delete dead shared components**

Run:

```powershell
rg -n "Button|StatusChip" src
```

Delete shared components only when no real caller remains. Do not leave unused abstractions.

**Step 4: Run the complete automated suite**

Run each command separately:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd .
.\node_modules\.bin\vitest.cmd run
.\node_modules\.bin\prettier.cmd --check .
.\node_modules\.bin\vite.cmd build
cargo test --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
cargo fmt --manifest-path src-tauri\Cargo.toml -- --check
cargo clippy --manifest-path src-tauri\Cargo.toml --all-targets -- -D warnings
git diff --check
```

Expected: all available checks pass. If `rustfmt` or `clippy` is still not installed, report that exact toolchain limitation; do not claim those checks passed.

**Step 5: Manual desktop verification**

Launch exactly one elevated development instance only after tests pass:

```powershell
corepack pnpm desktop
```

Verify:

1. Window opens at the compact size and sidebar navigation works.
2. Chat shortcuts and Saved prompts open intentionally empty views.
3. Settings is anchored at the bottom.
4. Off, Lower, and Mute persist after restart.
5. Lower reveals the slider and Windows audio reaches the selected target.
6. Original audio restores when `Ctrl+Alt+Space` is released.
7. Restore Audio in the tray still recovers audio.
8. Launch at startup matches the Windows registration state.
9. Close to tray hides the window when enabled and exits normally when disabled.
10. Open Codex / ChatGPT focuses either supported application without launching it when no verified window is running.
11. Keyboard focus rings, tooltips, and reduced motion behave correctly.

**Step 6: Commit only after user validation**

Stage exact remaining paths and inspect the staged diff before committing:

```powershell
git diff --cached --check
git diff --cached
git commit -m "feat: redesign QoLayer as a compact toolbox"
```

Do not include unrelated pre-existing changes accidentally.
